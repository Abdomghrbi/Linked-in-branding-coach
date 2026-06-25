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
    friendly: 'تعامل مع المستخدم كأنك مستشاره الشخصي وقدم له نصيحة صادقة.',
    challenging: 'ادفع المستخدم للتحدث براحته المطلقة واطرح عليه أسئلة صعبة.',
    inspirational: 'استخدم أمثلة ومواقف تحفز المستخدم.',
  };

  const dialectInstructions: Record<string, string> = {
    fusha: 'استخدم اللغة العربية الفصحى وتجنب الأخطاء الإملائية.',
    gulf: 'استخدم اللهجة الخليجية العامية.',
    egyptian: 'استخدم اللهجة المصرية العامية.',
    levantine: 'استخدم اللهجة الشامية العامية.',
  };

  return `أنت "مستشار شخصي لبناء العلامة الشخصية" — خبير بخبرة 15 عاماُ في التسويق المهني على LinkedIn.

${toneInstructions[voiceTone] || toneInstructions.formal}
${dialectInstructions[dialect] || dialectInstructions.fusha}

قواعدك الذهبية:
1. اسأل أولاً لفهم السياق، ثم قدم الحل. لا تبدأ بنصائح عامة.
2. تحدث كمستشار حقيقي: ابدِ إعجابك، شارك رأيك، واسأل أسئلة متابعة ذكية.
3. عند تقديم اقتراح، اشرح السبب باختصار: "لماذا هذه الطريقة؟".
4. كن مباشراً وموجزاً قدر الإمكان. تجنب التكرار.

مهمتك: مساعدة المستخدم على تحويل أفكاره الخام إلى محتوى مهني ذي تأثير.`;
};

export async function POST(request: NextRequest) {
  try {
    // TODO: استبدل هذا بجلب المستخدم الحقيقي من الجلسة (Session/Auth)
    // حالياً هذا الثابت خطر أمني كبير
    const body = await request.json();
    const { chatId, content } = body;

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'محتوى الرسالة مطلوب' },
        { status: 400 }
      );
    }

    // محاكاة جلب المستخدم (يجب أن يأتي من الـ Auth Middleware)
    const supabase = await createClient();
    
    // مثال: جلب بيانات المستخدم الحالي بشكل آمن
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const userId = user.id;

    const { data: userData } = await supabase
      .from('users')
      .select('voice_tone, dialect')
      .eq('id', userId)
      .single();

    const voiceTone = userData?.voice_tone || 'formal';
    const dialect = userData?.dialect || 'fusha';

    let currentChatId = chatId;

    // إنشاء محادثة جديدة إذا لم تكن موجودة
    if (!currentChatId) {
      const { data: newChat, error: chatError } = await supabase
        .from('chats')
        .insert({ user_id: userId, status: 'active' })
        .select('id')
        .single();

      if (chatError) {
        console.error(chatError);
        return NextResponse.json(
          { error: 'فشل إنشاء المحادثة' },
          { status: 500 }
        );
      }
      currentChatId = newChat.id;
    }

    // جلب سجل المحادثة
    // نستخدم created_at للترتيب بدلاً من sequence_number لتجنب التعارضات
    const { data: historyMessages } = await supabase
      .from('messages')
      .select('role, content, created_at')
      .eq('chat_id', currentChatId)
      .order('created_at', { ascending: true })
      .limit(20); // تقليل العدد لتحسين جودة السياق وتقليل التكلفة

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

    // حفظ رسالة المستخدم أولاً
    const { error: saveUserError } = await supabase
      .from('messages')
      .insert({
        chat_id: currentChatId,
        role: 'user',
        content: content,
        content_type: 'text',
        // لن نعتمد على sequence_number يدوياً، دعنا نعتمد على created_at الافتراضي
      });

    if (saveUserError) {
      console.error('Error saving user message:', saveUserError);
      // لا نوقف العملية هنا بالضرورة، لكننا نسجل الخطأ
    }

    // استدعاء الذكاء الاصطناعي
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: messagesForLLM,
      temperature: 0.7, // زيادة الحرارة قليلاً لتكون الردود أكثر طبيعية وأقل تكراراً
      max_tokens: 800,  // زيادة الحد الأقصى للرموز
    });

    const aiResponse = completion.choices?.message?.content || '';

       
    
    // تحديد نوع المحتوى
    let contentType = 'text';
    let generatedPost = null;

    if (aiResponse.includes('مسوَدّة') || aiResponse.includes('---')) {
      contentType = 'post_draft';
      generatedPost = { raw: aiResponse, extracted_at: new Date().toISOString() };
    } else if (aiResponse.includes('نصيحة') || aiResponse.includes('💡')) {
      contentType = 'tips';
    }

    // حفظ رد الذكاء الاصطناعي
    const { data: aiMessage, error: saveAIError } = await supabase
      .from('messages')
      .insert({
        chat_id: currentChatId,
        role: 'assistant',
        content: aiResponse,
        content_type: contentType,
        generated_post: generatedPost,
        // مرة أخرى، نزيل sequence_number اليدوي
      })
      .select()
      .single();

    if (saveAIError) {
      console.error('Error saving AI message:', saveAIError);
    }

    // تحديث وقت آخر رسالة في المحادثة
    await supabase
      .from('chats')
      .update({ last_message_at: new Date().toISOString() })
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
      
