import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const body = await request.json();
    const { messageId, type, reason, comment } = body;

    // حفظ سجل التقييم التفصيلي
    const { error: feedbackError } = await supabase
      .from('message_feedback')
      .insert({
        user_id: user.id,
        message_id: messageId,
        rating_type: type,
        reason,
        comment,
      });

    if (feedbackError) {
      console.error('Error saving message feedback:', feedbackError);
    }

    //  تحليل السبب وتحديث ملف التفضيلات العامة للمستخدم
    let preferred_length = undefined;
    let preferred_tone = undefined;

    if (reason === 'too_long') preferred_length = 'concise';
    if (reason === 'too_short') preferred_length = 'detailed';
    if (reason === 'wrong_tone') preferred_tone = 'professional';

    if (preferred_length || preferred_tone) {
      await supabase
        .from('user_preferences')
        .upsert(
          {
            user_id: user.id,
            ...(preferred_length && { preferred_length }),
            ...(preferred_tone && { preferred_tone }),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Feedback API error:', error);
    return NextResponse.json({ error: 'خطأ في معالجة التقييم' }, { status: 500 });
  }
}
