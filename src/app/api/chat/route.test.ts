import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST } from './route';
import { createClient } from '@/lib/supabase/server';
import { OpenAI } from 'openai';

// Mock Supabase
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

// Mock OpenAI
vi.mock('openai', () => ({
  OpenAI: vi.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: vi.fn(),
      },
    },
  })),
}));

describe('Chat API Route', () => {
  let mockSupabase: any;
  let mockOpenAI: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // إعداد mock Supabase
    mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123', email: 'test@test.com' } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { voice_tone: 'friendly', dialect: 'fusha' },
        error: null,
      }),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
    };

    (createClient as any).mockResolvedValue(mockSupabase);

    // إعداد mock OpenAI
    mockOpenAI = new OpenAI();
    (mockOpenAI.chat.completions.create as any).mockResolvedValue({
      choices: [
        {
          message: {
            content: 'مرحباً! شو أخبارك اليوم؟ خبرني أكتر عن تجربتك.',
          },
        },
      ],
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('يرفض الطلب بدون محتوى', async () => {
    const request = new Request('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({ content: '' }),
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('محتوى الرسالة مطلوب');
  });

  it('يرفض الطلب بدون تسجيل دخول', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: new Error('Unauthorized'),
    });

    const request = new Request('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({ content: 'مرحباً' }),
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('يجب تسجيل الدخول');
  });

  it('ينشئ محادثة جديدة إذا لم يُرسل chatId', async () => {
    mockSupabase.insert.mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: 'chat-456' },
          error: null,
        }),
      }),
    });

    const request = new Request('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({ content: 'اليوم حضرت مؤتمر AI' }),
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.chatId).toBe('chat-456');
    expect(data.message.role).toBe('assistant');
  });

  it('يستخدم محادثة موجودة إذا أُرسل chatId', async () => {
    const request = new Request('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        chatId: 'chat-existing-789',
        content: 'كملنا الحديث',
      }),
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(mockSupabase.from).toHaveBeenCalledWith('messages');
  });

  it('يحفظ رسالة المستخدم في قاعدة البيانات', async () => {
    mockSupabase.insert.mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: 'msg-001' },
          error: null,
        }),
      }),
    });

    const request = new Request('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({ content: 'رسالة اختبار' }),
    });

    await POST(request as any);

    expect(mockSupabase.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        role: 'user',
        content: 'رسالة اختبار',
        content_type: 'text',
      })
    );
  });

  it('يستدعي OpenAI مع System Prompt صحيح', async () => {
    const request = new Request('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({ content: 'اختبار System Prompt' }),
    });

    await POST(request as any);

    const callArgs = (mockOpenAI.chat.completions.create as any).mock.calls[0][0];
    expect(callArgs.messages[0].role).toBe('system');
    expect(callArgs.messages[0].content).toContain('مستشار بناء العلامة الشخصية');
    expect(callArgs.messages[0].content).toContain('15 عاماً');
  });

  it('يحدد نوع المحتوى post_draft إذا احتوى الرد على مسودة', async () => {
    (mockOpenAI.chat.completions.create as any).mockResolvedValue({
      choices: [
        {
          message: {
            content: 'هاي مسودة المنشور:\n\n---\n\nاليوم حضرت مؤتمر AI في دبي\n\n#LinkedIn #AI',
          },
        },
      ],
    });

    mockSupabase.insert.mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: 'msg-ai-001', created_at: new Date().toISOString() },
          error: null,
        }),
      }),
    });

    const request = new Request('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({ content: 'ساعدني أكتب منشور' }),
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(data.message.contentType).toBe('post_draft');
  });

  it('يحدد نوع المحتوى tips إذا احتوى الرد على نصائح', async () => {
    (mockOpenAI.chat.completions.create as any).mockResolvedValue({
      choices: [
        {
          message: {
            content: '💡 نصيحة مهمة: ركز على القصة الشخصية في منشورك.',
          },
        },
      ],
    });

    mockSupabase.insert.mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: 'msg-ai-002', created_at: new Date().toISOString() },
          error: null,
        }),
      }),
    });

    const request = new Request('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({ content: 'نصيحة من فضلك' }),
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(data.message.contentType).toBe('tips');
  });

  it('يحدث إحصائيات المحادثة بعد الرد', async () => {
    const request = new Request('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({ content: 'اختبار التحديث' }),
    });

    await POST(request as any);

    expect(mockSupabase.update).toHaveBeenCalledWith(
      expect.objectContaining({
        last_message_at: expect.any(String),
        message_count: expect.any(Number),
      })
    );
  });

  it('يُعيد خطأ 500 عند فشل غير متوقع', async () => {
    mockSupabase.auth.getUser.mockRejectedValue(new Error('Database connection failed'));

    const request = new Request('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({ content: 'اختبار الخطأ' }),
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('حدث خطأ في معالجة الطلب');
  });
});
