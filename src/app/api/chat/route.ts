import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import Groq from 'groq-sdk';

export const dynamic = 'force-dynamic';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

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

const MAX_CONTENT_LENGTH = 2000;
const MIN_CONTENT_LENGTH = 1; 

function sanitizeInput(input: string): string {
  return input.replace(/<[^>]*>/g, '').trim();
}

function validateContent(content: string, hasImage: boolean): { valid: boolean; error?: string } {
  if (!hasImage && (!content || content.length < MIN_CONTENT_LENGTH)) {
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

const getSystemPrompt = (
  voiceTone: string, 
  dialect: string, 
  preferences?: { preferred_length?: string; preferred_tone?: string },
  recentFeedbacks?: Array<{ rating_type: string; reason: string; comment?: string }>
): string => {
  const toneInstructions: Record<string, string> = {
    formal: 'تحدث بلغة مهنية مختصرة ومباشرة، واستخدم مصطلحات دقيقة.',
    friendly: 'تعامل كمستشار شخصي وناصح، إجاباتك موجزة وودية دون إطالة.',
    challenging: 'إدفع المستخدم للتحدث وعبّر عن رأيك باختصار وجرأة.',
    inspirational: 'استخدم أمثلة خفيفة ومواقف موجزة تحفز المستخدم.',
  };

  const dialectInstructions: Record<string, string> = {
    fusha: 'استخدم اللغة العربية الفصحى.',
    gulf: 'استخدم اللهجة الخليجية العامية.',
    egyptian: 'استخدم اللهجة المصرية العامية.',
    levantine: 'استخدم اللهجة الشامية العامية.',
  };

  let preferenceInstructions = '';
  if (preferences) {
    if (preferences.preferred_length === 'concise') {
      preferenceInstructions += '\n- يُفضل المستخدم الإجابات المختصرة والمباشرة جداً دون أي تفاصيل زائدة.';
    } else if (preferences.preferred_length === 'detailed') {
      preferenceInstructions += '\n- يُفضل المستخدم الإجابات المفصلة والشاملة مع أمثلة وشرح كامل.';
    }

    if (preferences.preferred_tone === 'simple') {
      preferenceInstructions += '\n- استخدم أسلوباً بسيطاً وواضحاً وبدون تعقيد لغوي.';
    } else if (preferences.preferred_tone === 'professional') {
      preferenceInstructions += '\n- استخدم نبرة رسمية واحترافية عالية.';
    }
  }

  let feedbackContext = '';
  if (recentFeedbacks && recentFeedbacks.length > 0) {
    feedbackContext += '\n\nتنبيهات وملاحظات سابقة من المستخدم بناءً على تقييماته للإجابات السابقة:';
    recentFeedbacks.forEach((f) => {
      if (f.rating_type === 'dislike') {
        if (f.reason === 'too_long') feedbackContext += '\n- اشتكى المستخدم سابقاً من طول الإجابة، ركز على الإيجاز الشديد.';
        if (f.reason === 'too_short') feedbackContext += '\n- طلب المستخدم سابقاً تفاصيل أكثر، قدّم شرحاً كافياً.';
        if (f.reason === 'wrong_tone') feedbackContext += '\n- راجع نبرتك لتكون أكثر تناسباً مع تفضيلات المستخدم.';
        if (f.reason === 'inaccurate') feedbackContext += '\n- ركز على الدقة وتقديم معلومات قيمة ومؤكدة.';
        if (f.comment) feedbackContext += `\n- ملاحظة نصية مباشرة من المستخدم: "${f.comment}"`;
      }
    });
  }

  return `أنت "مستشار شخصي لبناء العلامة الشخصية" متخصص في التسويق المهني على لينكدإن.

${toneInstructions[voiceTone] || toneInstructions.formal}
${dialectInstructions[dialect] || dialectInstructions.fusha}
${preferenceInstructions}
${feedbackContext}

قواعد أساسية لضبط طول الرد:
1. كن موجزاً ومباشراً دائماً: ادخل في صلب الموضوع فوراً وتجنب الترحيب الطويل أو الشكر والمقدمات الطويلة.
2. إذا تم إرفاق صورة، قم بتحليلها بدقة وربطها بنصيحة تخص لينكدإن وبناء المحتوى المهني.
3. اطرح سؤال متابعة واحد فقط أو قدم فكرة واحدة ركيزة في كل رد.
4. اشرح "لماذا" باختصار شديد (في جملة واحدة).
5. استخدم المصطلحات التقنية الإنجليزية عند الضرورة.
هدفُك هو مساعدة المستخدم بأسلوب مستشار سريع ومباشر لتحويل حسابه إلى علامة شخصية فريدة على لينكدإن.`;
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let { chatId, content, image } = body;

    content = content ? sanitizeInput(content) : '';

    const validation = validateContent(content, !!image);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

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

    const { data: userPreferences } = await supabase
      .from('user_preferences')
      .select('preferred_length, preferred_tone')
      .eq('user_id', user.id)
      .single();

    const { data: recentFeedbacks } = await supabase
      .from('message_feedback')
      .select('rating_type, reason, comment')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    const voiceTone = userData?.voice_tone || 'formal';
    const dialect = userData?.dialect || 'fusha';

    let currentChatId = chatId;

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
        return NextResponse.json(
          { error: `فشل إنشاء المحادثة: ${chatError.message}` },
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

    const { error: saveUserError } = await supabase
      .from('messages')
      .insert({
        chat_id: currentChatId,
        role: 'user',
        content: content ? `${content} [صورة مرفقة]` : '[صورة مرفقة]',
        content_type: 'text',
        sequence_number: (historyMessages?.length || 0) + 1,
      });

    if (saveUserError) {
      return NextResponse.json(
        { error: `فشل حفظ الرسالة: ${saveUserError.message}` },
        { status: 500 }
      );
    }

    const systemPromptContent = getSystemPrompt(
      voiceTone, 
      dialect, 
      userPreferences || undefined,
      recentFeedbacks || undefined
    );

    const messagesForLLM: any[] = [
      { role: 'system', content: systemPromptContent },
    ];

    if (historyMessages && historyMessages.length > 0) {
      const maxHistory = 10;
      const recentMessages = historyMessages.slice(-maxHistory);
      
      recentMessages.forEach((msg) => {
        messagesForLLM.push({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: String(msg.content || ''),
        });
      });
    }

    const modelToUse = image 
      ? 'meta-llama/llama-4-scout-17b-16e-instruct' 
      : 'qwen/qwen3.8-27b';

    if (image) {
      const formattedImageUrl = image.startsWith('data:') 
        ? image 
        : `data:image/jpeg;base64,${image}`;

      messagesForLLM.push({
        role: 'user',
        content: [
          {
            type: 'text',
            text: content && content.trim() !== '' ? content : 'حلل هذه الصورة وركّز على ما يفيد في محتوى لينكدإن بناءً على سياق المحادثة.',
          },
          {
            type: 'image_url',
            image_url: {
              url: formattedImageUrl,
            },
          },
        ],
      });
    } else {
      messagesForLLM.push({
        role: 'user',
        content: String(content),
      });
    }

    const completion = await groq.chat.completions.create({
      model: modelToUse,
      messages: messagesForLLM,
      temperature: 0.3,
      max_tokens: 500, 
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

  } catch (error: any) {
    const errorMessage = error?.message || (typeof error === 'string' ? error : 'خطأ غير معروف');
    
    return NextResponse.json(
      { error: `تفاصيل الخطأ: ${errorMessage}` },
      { status: 500 }
    );
  }
}
