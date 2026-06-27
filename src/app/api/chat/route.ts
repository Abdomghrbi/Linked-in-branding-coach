import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import Groq from 'groq-sdk';

export const dynamic = 'force-dynamic';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// ====== RATE LIMITING ======
const RATE_LIMIT = 30; 
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; 
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(userId: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const userLimit = rateLimitStore.get(userId);

  if (!userLimit || now > userLimit.resetTime) {
    rateLimitStore.set(userId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return { allowed: true, remaining: RATE_LIMIT - 1 };
  }

  if (userLimit.count >= RATE_LIMIT) {
    return { allowed: false, remaining: 0 };
  }

  userLimit.count++;
  return { allowed: true, remaining: RATE_LIMIT - userLimit.count };
}

// ====== INPUT VALIDATION ======
const MAX_CONTENT_LENGTH = 2000;
const MIN_CONTENT_LENGTH = 1; 

function sanitizeInput(input: string): string {
  
  return input.replace(/<[^>]*>/g, '').trim();
}

function validateContent(content: string): { valid: boolean; error?: string } {
  if (!content || content.length < MIN_CONTENT_LENGTH) {
    return { valid: false, error: 'محتوى الرسالة قصير جداً' };
  }
  
  if (content.length > MAX_CONTENT_LENGTH) {
    return { valid: false, error: `الرسالة طويلة جداً. الحد الأقصى ${MAX_CONTENT_LENGTH} حرف` };
  }
  const forbiddenPatterns = [
    /system\s*:/i,
    /ignore\s*previous/i,
    /forget\s*everything/i,
    /you\s*are\s*now/i,
    /act\s*as\s*/i,
  ];

  for (const pattern of forbiddenPatterns) {
    if (pattern.test(content)) {
      return { valid: false, error: 'تم اكتشاف محاولة حقن غير مصرح بها' };
    }
  }

  return { valid: true };
}

const getSystemPrompt = (voiceTone: string, dialect: string): string => {
  const toneInstructions: Record<string, string> = {
    formal: 'تحدث بلغة رسمية، استخدم مصطلحات دقيقة.',
    friendly: 'تعامل مع المستخدم على أنك مستشاره الشخصي وقدم له نصيحة صادقة.',
    challenging: 'إدفع المستخدم للتحدث براحته المطلقة.',
    inspirational: 'استخدم أمثلة ومواقف تحفز المستخدم.',
  };

  const dialectInstructions: Record<string, string> = {
    fusha: 'استخدم اللغة العربية الفصحى وتجنّب الأخطاء الإملائية.',
    gulf: 'استخدم اللهجة الخليجية العامية.',
    egyptian: 'استخدم اللهجة المصرية العامية.',
    levantine: 'استخدم اللهجة الشامية العامية.',
  };

  return `أنت "مستشار شخصي لبناء العلامة الشخصية" — خبير بخبرة تزيد عن 15 عاماً في التسويق المهني على LinkedIn.

${toneInstructions[voiceTone] || toneInstructions.formal}
${dialectInstructions[dialect] || dialectInstructions.fusha}

قواعدك الذهبية:
1. لا تقدم كلاماً عشوائياً، اسأل أولاً، تفقد السياق، ناقش مع المستخدم.
2. تحدث كمستشار حقيقي: اسأل أسئلة متابعة، ابدِ إعجابك، شارك رأيك.
3. في كل مرة تقدم فيها اقتراحاً، علّم المستخدم: "لماذا هذه الطريقة؟" و"كيف تبني مصداقيتك؟"
4. استخدم المصطلحات التقنية الإنجليزية عند الضرورة
مهمتك: مساعدة المستخدم كمستشاره الشخصي في بناء علامته الفريدة، ومساعدته على تحويل أفكاره الخام إلى محتوى مهني مناسب للنشر على لينكد.`;
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let { chatId, content } = body;

    // ====== INPUT VALIDATION ======
    if (!content) {
      return NextResponse.json(
        { error: 'محتوى الرسالة مطلوب' },
        { status: 400 }
      );
    }

    // Sanitize input
    content = sanitizeInput(content);

    const validation = validateContent(content);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Validate chatId if provided
    if (chatId && typeof chatId !== 'string') {
      return NextResponse.json(
        { error: 'معرف المحادثة غير صالح' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'يجب تسجيل الدخول' },
        { status: 401 }
      );
    }

    // ====== RATE LIMITING ======
    const rateLimit = checkRateLimit(user.id);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'تم تجاوز الحد المسموح من الطلبات. حاول بعد ساعة.' },
        { status: 429 }
      );
    }

    const { data: userData } = await supabase
      .from('users')
      .select('voice_tone, dialect')
      .eq('id', user.id)
      .single();

    const voiceTone = userData?.voice_tone || 'formal';
    const dialect = userData?.dialect || 'fusha';

    let currentChatId = chatId;

    // Verify chat ownership if chatId provided
    if (currentChatId) {
      const { data: chatData, error: chatCheckError } = await supabase
        .from('chats')
        .select('id')
        .eq('id', currentChatId)
        .eq('user_id', user.id)
        .single();

      if (chatCheckError || !chatData) {
        return NextResponse.json(
          { error: 'المحادثة غير موجودة أو لا تملك صلاحية الوصول إليها' },
          { status: 403 }
        );
      }
    }

    if (!currentChatId) {
      const { data: newChat, error: chatError } = await supabase
        .from('chats')
        .insert({ user_id: user.id, status: 'active' })
        .select('id')
        .single();

      if (chatError) {
        console.error('Chat creation error:', chatError);
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
      .order('created_at', { ascending: true });

    const messagesForLLM: Groq.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: getSystemPrompt(voiceTone, dialect) },
    ];

    if (historyMessages && historyMessages.length > 0) {
      // Limit history to prevent token overflow
      const maxHistory = 20;
      const recentMessages = historyMessages.slice(-maxHistory);
      
      recentMessages.forEach((msg) => {
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
      temperature: 0.3,
      max_tokens: 800,
    });

    const aiResponse = completion.choices[0]?.message?.content || '';

    let contentType = 'text';
    let generatedPost = null;

    if (
      aiResponse.includes('مسودة المنشور') ||
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
      rateLimit: {
        remaining: rateLimit.remaining,
        limit: RATE_LIMIT,
      },
    });

     } catch (error) {
    // Safe error logging - don't expose internal details
    console.error('Chat API Error:', error instanceof Error ? error.message : 'Unknown error');
    
    return NextResponse.json(
      { error: 'حدث خطأ في معالجة الطلب' },
      { status: 500 }
    );
  }
}
