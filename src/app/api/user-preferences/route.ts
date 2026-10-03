import { createClient } from '@/utils/supabase/server'; // عدّل المسار حسب مشروعك
import { NextResponse } from 'next/server';

// 1. جلب تفضيلات المستخدم
export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 تعني عدم وجود سجل
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ preferences: data || { preferred_length: 'balanced', preferred_tone: 'friendly' } });
}

// 2. تحديث تفضيلات المستخدم
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { preferred_length, preferred_tone } = await req.json();

  const { data, error } = await supabase
    .from('user_preferences')
    .upsert({
      user_id: user.id,
      preferred_length,
      preferred_tone,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, preferences: data });
}
  
