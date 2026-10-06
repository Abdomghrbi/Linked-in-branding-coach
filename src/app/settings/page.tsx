'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { User, Save, Check, ArrowRight, Sparkles, ShieldCheck, Settings2, Trash2, Edit3, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const supabase = createClient();
  const router = useRouter();
  
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [saved, setSaved] = useState(false);
  
  const systemRules = [
    'عدم استخدام النجوم (*) في التنسيق نهائياً',
    'الالتزام بنبرة احترافية وتفاعلية ملائمة لـ LinkedIn',
    'تقديم إجابات مباشرة ومختصرة بدون مقدمات طويلة',
    'التركيز على بناء البصمة الشخصية وتطوير المحتوى',
  ];

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

  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');
  const [newRuleInput, setNewRuleInput] = useState('');

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

  
  const userRulesList = form.custom_rules
    ? form.custom_rules.split('\n').filter((r) => r.trim().length > 0)
    : [];

  const handleDeleteRule = (indexToDelete: number) => {
    const updated = userRulesList.filter((_, idx) => idx !== indexToDelete);
    setForm({ ...form, custom_rules: updated.join('\n') });
  };

  const handleStartEdit = (index: number, currentText: string) => {
    setEditingIndex(index);
    setEditingText(currentText);
  };

  const handleSaveEdit = (index: number) => {
    const updated = [...userRulesList];
    if (editingText.trim().length > 0) {
      updated[index] = editingText.trim();
    } else {
      updated.splice(index, 1);
    }
    setForm({ ...form, custom_rules: updated.join('\n') });
    setEditingIndex(null);
    setEditingText('');
  };

  const handleAddQuickRule = () => {
    if (!newRuleInput.trim()) return;
    const updated = [...userRulesList, newRuleInput.trim()];
    setForm({ ...form, custom_rules: updated.join('\n') });
    setNewRuleInput('');
  };

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
              rows={3}
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

          <div className="pt-6 border-t border-slate-100 space-y-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-blue-600" />
              القواعد والتخصيصات المطبقة حالياً
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      قواعد النظام الافتراضية
                    </span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-medium">
                      ثابتة
                    </span>
                  </div>

                  <ul className="space-y-2 text-xs text-slate-600">
                    {systemRules.map((rule, idx) => (
                      <li key={idx} className="flex items-start gap-2 bg-white p-2.5 rounded-xl border border-slate-100 shadow-2xs">
                        <span className="text-blue-500 font-bold">•</span>
                        <span>{rule}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <p className="text-[11px] text-slate-400 mt-3 pt-2 border-t border-slate-200/60">
                  * هذه القواعد يلتزم بها المساعد الذكي تلقائياً للجميع.
                </p>
              </div>

              <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <User className="w-4 h-4 text-blue-600" />
                      قواعدك الخاصة المُخصصة
                    </span>
                    <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-medium">
                      {userRulesList.length} قواعد
                    </span>
                  </div>

                  {userRulesList.length === 0 ? (
                    <div className="text-center py-6 bg-white/60 rounded-xl border border-dashed border-slate-200">
                      <p className="text-xs text-slate-400">لا توجد قواعد خاصة مضافة حالياً.</p>
                      <p className="text-[11px] text-slate-400 mt-1">اكتب قاعدة في الحقل أعلاه واضغط حفظ.</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                      {userRulesList.map((rule, index) => (
                        <div
                          key={index}
                          className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between gap-2"
                        >
                          {editingIndex === index ? (
                            <div className="flex items-center gap-1.5 w-full">
                              <input
                                type="text"
                                value={editingText}
                                onChange={(e) => setEditingText(e.target.value)}
                                className="w-full text-xs p-1.5 border border-blue-400 rounded-lg outline-none"
                                autoFocus
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveEdit(index)}
                                className="p-1 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <>
                              <span className="text-xs text-slate-700 font-medium break-words">
                                {rule}
                              </span>
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleStartEdit(index, rule)}
                                  className="p-1 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors"
                                  title="تعديل"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteRule(index)}
                                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                  title="حذف"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              
                <div className="mt-3 pt-2 border-t border-blue-100 flex items-center gap-1.5">
                  <input
                    type="text"
                    value={newRuleInput}
                    onChange={(e) => setNewRuleInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddQuickRule();
                      }
                    }}
                    placeholder="إضافة قاعدة جديدة..."
                    className="w-full text-xs px-3 py-1.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddQuickRule}
                    className="p-1.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shrink-0"
                    title="إضافة"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
