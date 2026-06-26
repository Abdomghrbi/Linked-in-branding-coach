const { data: { user }, error: authError } = await supabase.auth.getUser();

if (authError || !user) {
  return NextResponse.json(
    { error: 'يجب تسجيل الدخول' },
    { status: 401 }
  );
}
