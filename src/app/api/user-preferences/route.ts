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


    if (!messageId || !type || !reason) {
      return NextResponse.json(
        { error: 'بيانات التقييم غير مكتملة (messageId, type, reason مطلوبة)' },
        { status: 400 }
      );
    }

  
    if (!['like', 'dislike'].includes(type)) {
      return NextResponse.json(
        { error: 'نوع التقييم غير صالح' },
        { status: 400 }
      );
    }

    
    const { error: feedbackError } = await supabase
      .from('message_feedback')
      .insert({
        user_id: user.id,
        message_id: messageId,
        rating_type: type,
        reason,
        comment: comment || null,
      });

    if (feedbackError) {
      console.error('Error saving message feedback:', feedbackError);
      return NextResponse.json(
        { error: 'فشل حفظ سجل التقييم في قاعدة البيانات' },
        { status: 500 }
      );
    }

  
    let preferred_length: string | undefined = undefined;
    let preferred_tone: string | undefined = undefined;

    if (reason === 'too_long') preferred_length = 'concise';
    if (reason === 'too_short') preferred_length = 'detailed';
    if (reason === 'wrong_tone') preferred_tone = 'professional';

    if (preferred_length || preferred_tone) {
      const { error: preferenceError } = await supabase
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

      if (preferenceError) {
        console.error('Error updating user preferences:', preferenceError);
      }
    }

    return NextResponse.json({ success: true, message: 'تم تسجيل التقييم بنجاح' });
  } catch (error) {
    console.error('Feedback API error:', error);
    return NextResponse.json({ error: 'حدث خطأ في معالجة التقييم' }, { status: 500 });
  }
}
