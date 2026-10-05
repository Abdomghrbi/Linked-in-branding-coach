'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { User, Save, Check, ArrowRight, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const supabase = createClient();
  const router = useRouter();
  
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [saved, setSaved] = useState(false);

  const [form, setForm] = useState({
    full_name: '',
    job_title: '',
    industry: '',
    target_audience: '',
    linkedin_url: '',
    voice_tone: 'friendly',
    dialect: 'fusha',
    custom_rules: '',
  });

  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (data) {
        setForm({
          full_name: data.full_name || '',
          job_title: data.job_title || '',
          industry: data.industry || '',
          target_audience: data.target_audience || '',
          linkedin_url: data.linkedin_url || '',
          voice_tone: data.voice_tone || 'friendly',
          dialect: data.dialect || 'fusha',
          custom_rules: Array.isArray(data.custom_rules) ? data.custom_rules.join('\n') : (data.custom_rules || ''),
        });
      }
      setFetching(false);
    };

    fetchUserData();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const rulesArray = form.custom_rules
      ? form.custom_rules.split('\n').map(r => r.trim()).filter(r => r.length > 0)
      : [];

    const { error } = await supabase
      .from('users')
      .update({
        full_name: form.full_name,
        job_title: form.job_title,
        industry: form.industry,
        target_audience: form.target_audience,
        linkedin_url: form.linkedin_url,
        voice_tone: form.voice_tone,
        dialect: form.dialect,
        custom_rules: rulesArray,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    setLoading(false);

    if (!error) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } else {
      alert('حدث خطأ أثناء حفظ التعديلات');
    }
  };

  if (fetching) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center" dir="rtl">
        <p className="text-sm text-slate-500">جاري تحميل البيانات...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8" dir="rtl">
      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* Header Navigation */}
        <div className="flex items-center justify-between">
          <button 
            onClick={() => router.back()}
            className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
            عودة
          </button>
          <h1 className="text-xl font-bold text-slate-900">إعدادات البصمة الشخصية</h1>
        </div>

        <form onSubmit={handleSave} className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <User className="w-5 h-5 text-blue-600" />
              تفضيلات المساعد الذكي
            </h2>
            <Sparkles className="w-5 h-5 text-amber-500" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">الاسم الكامل</label>
              <input
                type="text"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-600 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">المسمى الوظيفي</label>
              <input
                type="text"
                value={form.job_title}
                onChange={(e) => setForm({ ...form, job_title: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-600 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">المجال / التخصص</label>
              <input
                type="text"
                value={form.industry}
                onChange={(e) => setForm({ ...form, industry: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-600 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">الجمهور المستهدف</label>
              <input
                type="text"
                value={form.target_audience}
                onChange={(e) => setForm({ ...form, target_audience: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-600 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">رابط LinkedIn</label>
            <input
              type="url"
              value={form.linkedin_url}
              onChange={(e) => setForm({ ...form, linkedin_url: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-600 outline-none text-left"
              dir="ltr"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">قواعد خاصة للمساعد الذكي</label>
            <textarea
              value={form.custom_rules}
              onChange={(e) => setForm({ ...form, custom_rules: e.target.value })}
              rows={4}
              placeholder="اكتب كل قاعدة في سطر مستقِل (مثال: تجنب النجوم، ركز على الأمثلة...)"
              className="w-full p-3.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-600 outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            {saved && (
              <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                <Check className="w-4 h-4" /> تم حفظ التغييرات بنجاح
              </span>
            )}
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl text-xs font-semibold transition-all disabled:bg-slate-300 shadow-md"
            >
              <Save className="w-4 h-4" />
              {loading ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
          }
