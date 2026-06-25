import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import Groq from 'groq-sdk';

export const dynamic = 'force-dynamic';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const getSystemPrompt = (voiceTone: string, dialect: string): string => {
  const toneInstructions: Record<string, string> = {
    formal: 'تحدث بلغة رسمية مهنية، استخدم مصطلحات دقيقة.',
    friendly: ' ، تعامل مع المستخدم كأنك مستشاره الشخصي وقدم له نصيحة صادقة.',
    challenging:' ، إدفّع المستخدم للتحدث براحته المطلقة.',
    inspirational: 'استخدم أمثلة ومواقف تحفز المستخدم.',
  };

  const dialectInstructions: Record<string, string> = {
    fusha: 'استخدم اللغة العربية وتجنب الأخطاء الإملائية ',
    gulf: 'استخدم اللهجة الخليجية العامية.',
    egyptian: 'استخدم اللهجة المصرية العامية.',
    levantine: 'استخدم اللهجة الشامية العامية.',
  };
  return `أنت "مستشار شخصي لبناء العلامة الشخصية" — خبير بخبرة 15 عاماً في التسويق المهني على LinkedIn.

${toneInstructions[voiceTone] || toneInstructions.formal}
${dialectInstructions[dialect] || dialectInstructions.fusha}

قواعدك الذهبية:
1. لا تقدم كلاماً عشوائياً فوراً، اسأل أولاً، تفقد السياق، ناقش مع المستخدم.
2. تحدث كمستشار حقيقي: اسأل أسئلة متابعة، ابدِ إعجابك، شارك رأيك.
3. في كل مرة تقدم فيها اقتراحاً، علّم المستخدم: "لماذا هذه الطريقة؟" و"كيف تبني مصداقيتك؟"
4. استخدم المصطلحات الإنجليزية فقط عند الضرورة.

مهمتك: مساعدة المستخدم كمستشاره الشخصي على تحويل أفكاره الخام إلى محتوى مهني ذا تأثير على لينكد.`;
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { chatId, content } = body;

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'محتوى الرسالة مطلوب' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const user = { id: '4a97bf17-7513-4377-b6b5-90f72cc43120', email: 'test@test.com' };

    const { data: userData } = await supabase
      .from('users')
      .select('voice_tone, dialect')
      .eq('id', user.id)
      .single();

    const voiceTone = userData?.voice_tone || 'formal';
    const dialect = userData?.dialect || 'fusha';

    let currentChatId = chatId;

    if (!currentChatId) {
      const { data: newChat, error: chatError } = await supabase
        .from('chats')
        .insert({ user_id: user.id, status: 'active' })
        .select('id')
        .single();

      if (chatError) {
        return NextResponse.json(
          { error: 'فشل إنشاء المحادثة' },
          { status: 500 }
        );
      }

      currentChatId = newChat.id;
    }

    const { data: historyMessages } = await supabase
      .from('messages')
      .select('role, content, content_type')
      .eq('chat_id', currentChatId)
      .order('sequence_number', { ascending: true })
      .limit(50);

    const messagesForLLM: Groq.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: getSystemPrompt(voiceTone, dialect) },
    ];

    if (historyMessages && historyMessages.length > 0) {
      historyMessages.forEach((msg) => {
        messagesForLLM.push({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        });
      });
    }

    messagesForLLM.push({ role: 'user', content });

    const { error: saveUserError } = await supabase
      .from('messages')
      .insert({
        chat_id: currentChatId,
        role: 'user',
        content: content,
        content_type: 'text',
        sequence_number: (historyMessages?.length || 0) + 1,
      });

    if (saveUserError) {
      console.error('Error saving user message:', saveUserError);
    }

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: messagesForLLM,
      temperature: 0.2,
      max_tokens: 400,
    });

    const aiResponse = completion.choices[0]?.message?.content || '';

    let contentType = 'text';
    let generatedPost = null;

    if (
      aiResponse.includes('مسوَدّة') ||
      aiResponse.includes('---') ||
      aiResponse.includes('#')
    ) {
      contentType = 'post_draft';
      generatedPost = { raw: aiResponse, extracted_at: new Date().toISOString() };
    } else if (aiResponse.includes('نصيحة') || aiResponse.includes('💡')) {
      contentType = 'tips';
    }

    const { data: aiMessage, error: saveAIError } = await supabase
      .from('messages')
      .insert({
        chat_id: currentChatId,
        role: 'assistant',
        content: aiResponse,
        content_type: contentType,
        generated_post: generatedPost,
        sequence_number: (historyMessages?.length || 0) + 2,
      })
      .select()
      .single();

    if (saveAIError) {
      console.error('Error saving AI message:', saveAIError);
    }

    await supabase
      .from('chats')
      .update({
        last_message_at: new Date().toISOString(),
        message_count: (historyMessages?.length || 0) + 2,
      })
      .eq('id', currentChatId);

    return NextResponse.json({
      success: true,
      chatId: currentChatId,
      message: {
        id: aiMessage?.id,
        role: 'assistant',
        content: aiResponse,
        contentType,
        createdAt: aiMessage?.created_at,
      },
    });

  } catch (error) {
    console.error('Chat API Error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ في معالجة الطلب' },
      { status: 500 }
    );
  }
}
