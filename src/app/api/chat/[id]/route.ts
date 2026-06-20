import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    
    // للاختبار - user وهمي
    const user = { id: '4a97bf17-7513-4377-b6b5-90f72cc43120' };
    
    // للإنتاج - فعّل هاد:
    // const { data: { user } } = await supabase.auth.getUser();
    // if (!user) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    const { data: messages, error } = await supabase
      .from('messages')
      .select('id, role, content, content_type, created_at')
      .eq('chat_id', params.id)
      .order('sequence_number', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ messages: messages || [] });
  } catch (error) {
    console.error('Error fetching chat:', error);
    return NextResponse.json({ error: 'Failed to fetch chat' }, { status: 500 });
  }
}
