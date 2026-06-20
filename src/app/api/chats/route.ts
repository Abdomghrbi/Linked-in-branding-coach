import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      // For testing - return empty or use test user
      return NextResponse.json({ chats: [] });
    }

    const { data: chats, error } = await supabase
      .from('chats')
      .select('id, title, last_message_at, message_count')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('last_message_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ chats: chats || [] });
  } catch (error) {
    console.error('Error fetching chats:', error);
    return NextResponse.json({ chats: [] }, { status: 500 });
  }
}
