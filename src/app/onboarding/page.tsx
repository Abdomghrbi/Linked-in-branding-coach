'use client';

import { useState, useEffect } from 'react';
import { 
  Computer, Briefcase, Globe, MessageCircle, Sparkles, 
  ArrowRight, ArrowLeft, Check, Users, ShieldAlert, Sliders, Target
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface OnboardingData {
  full_name: string;
  job_title: string;
  industry: string;
  target_audience: string;
  linkedin_url: string;
  voice_tone: string;
  dialect: string;
  custom_rules: string;
}

const voiceTones = [
  { id: 'formal', label: 'رسمي ومهني', desc: 'لغة عمل دقيقة واحترافية', icon: Briefcase },
  { id: 'friendly', label: 'ودي وتفاعلي', desc: 'أسلوب قاطن وقريب من القارئ', icon: MessageCircle },
  { id: 'challenging', label: 'طرح جريء', desc: 'يطرح تساؤلات ويدفع بالتفكير', icon: Target },
  { id: 'inspirational', label: 'تحفيزي وإلهامي', desc: 'يشجع ويثير الحماس', icon: Sparkles },
];

const dialects = [
  { id: 'fusha', label: 'الفصحى', desc: 'اللغة العربية القياسية' },
  { id: 'gulf', label: 'خليجية', desc: 'لهجة الخليج العربي' },
  { id: 'egyptian', label: 'مصرية', desc: 'لهجة عامية مصرية' },
  { id: 'levantine', label: 'شامية', desc: 'لهجة بلاد الشام' },
];

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [data, setData] = useState<OnboardingData>({
    full_name: '',
    job_title: '',
    industry: '',
    target_audience: '',
    linkedin_url: '',
    voice_tone: 'friendly',
    dialect: 'fusha',
    custom_rules: '',
  });

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);
      
      const { data: userData } = await supabase
        .from('users')
        .select('full_name, job_title, industry, linkedin_url, voice_tone, dialect, target_audience, custom_rules')
        .eq('id', user.id)
        .single();
      
      if (userData?.job_title && userData?.industry) {
        router.push('/');
        return;
      }

      if (userData) {
        setData(prev => ({
          ...prev,
          full_name: userData.full_name || user.user_metadata?.full_name || '',
          voice_tone: userData.voice_tone || 'friendly',
          dialect: userData.dialect || 'fusha',
          target_audience: userData.target_audience || '',
          custom_rules: Array.isArray(userData.custom_rules) ? userData.custom_rules.join('\n') : (userData.custom_rules || ''),
        }));
      }
    };
    loadUser();
  }, []);

  const handleNext = () => {
    if (step < 6) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

    const handleComplete = async () => {
    setLoading(true);
    
    try {
      if (!user) {
        alert('حدث خطأ في الجلسة، يرجى إعادة تسجيل الدخول');
        router.push('/login');
        return;
      }

      // تحويل القواعد النصية إلى مصفوفة نصوص
      const rulesArray = data.custom_rules
        ? data.custom_rules
            .split('\n')
            .map(r => r.trim())
            .filter(r => r.length > 0)
        : [];

      const { error } = await supabase
        .from('users')
        .update({
          full_name: data.full_name,
          job_title: data.job_title,
          industry: data.industry,
          target_audience: data.target_audience || null,
          linkedin_url: data.linkedin_url || null,
          voice_tone: data.voice_tone,
          dialect: data.dialect,
          custom_rules: rulesArray,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) {
        console.error('Error updating user onboarding:', error);
        alert(`فشل حفظ البيانات: ${error.message}`);
        setLoading(false);
        return;
      }

      // التوجيه المباشر وإعادة تنشيط الصفحات
      router.refresh();
      window.location.href = '/';
    } catch (err: any) {
      console.error('Unexpected error:', err);
      alert('حدث خطأ غير متوقع، يرجى المحاولة مرة أخرى.');
      setLoading(false);
    }
  };

    
    // تحويل القواعد النصية إلى مصفوفة نصوص
    const rulesArray = data.custom_rules
      .split('\n')
      .map(r => r.trim())
      .filter(r => r.length > 0);

    const { error } = await supabase
      .from('users')
      .update({
        full_name: data.full_name,
        job_title: data.job_title,
        industry: data.industry,
        target_audience: data.target_audience || null,
        linkedin_url: data.linkedin_url || null,
        voice_tone: data.voice_tone,
        dialect: data.dialect,
        custom_rules: rulesArray,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (!error) {
      router.push('/');
    } else {
      console.error('Error updating user:', error);
    }
    
    setLoading(false);
  };

  const updateField = (field: keyof OnboardingData, value: string) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const canProceed = () => {
    switch (step) {
      case 1: return data.full_name.trim().length > 0;
      case 2: return data.job_title.trim().length > 0 && data.industry.trim().length > 0;
      case 3: return true; // Target Audience & LinkedIn (Optional)
      case 4: return true; // Tone & Dialect
      case 5: return true; // Custom Rules (Optional)
      default: return true;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans" dir="rtl">
      <div className="w-full max-w-xl bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden transition-all">
        {/* Progress Bar */}
        <div className="bg-slate-100 h-2 w-full">
          <div 
            className="bg-gradient-to-r from-blue-600 to-indigo-600 h-full transition-all duration-500 ease-out"
            style={{ width: `${(step / 6) * 100}%` }}
          />
        </div>

        <div className="p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4 border border-blue-100 shadow-sm">
              <Computer className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-1">
              {step === 6 ? 'بصمتك جاهزة تماماً!' : 'بناء بصمتك الرقمية (Personal DNA)'}
            </h1>
            <p className="text-slate-500 text-sm">
              {step === 1 && 'لنبدأ بالتعرف على اسمك الكريم'}
              {step === 2 && 'ما هو تخصك ومجالك المهني؟'}
              {step === 3 && 'من تجذب برسالك ورابط حسابك؟'}
              {step === 4 && 'كيف تحب أن يتحدث معك المساعد؟'}
              {step === 5 && 'تخصيص قواعد خاصة للمساعد (اختياري)'}
              {step === 6 && 'راجع تفضيلاتك قبل البدء'}
            </p>
          </div>

          {/* Step Content */}
          <div className="space-y-6 min-h-[260px] flex flex-col justify-center">
            {/* Step 1: Full Name */}
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    الاسم الكامل <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={data.full_name}
                    onChange={(e) => updateField('full_name', e.target.value)}
                    placeholder="مثال: أحمد المحمد"
                    className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-blue-600 focus:border-transparent text-right transition-all outline-none"
                    autoFocus
                  />
                </div>
              </div>
            )}

            {/* Step 2: Job Title & Industry */}
            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    المسمى الوظيفي <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={data.job_title}
                    onChange={(e) => updateField('job_title', e.target.value)}
                    placeholder="مثال: مستشار تسويق رقمي / مهندس برمجيات"
                    className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-blue-600 focus:border-transparent text-right transition-all outline-none"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    المجال أو التخصص <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={data.industry}
                    onChange={(e) => updateField('industry', e.target.value)}
                    placeholder="مثال: الذكاء الاصطناعي، التجارة الإلكترونية..."
                    className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-blue-600 focus:border-transparent text-right transition-all outline-none"
                  />
                </div>
              </div>
            )}

            {/* Step 3: Audience & LinkedIn */}
            {step === 3 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    الجمهور المستهدف <span className="text-slate-400 font-normal">(اختياري)</span>
                  </label>
                  <div className="relative">
                    <Users className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      value={data.target_audience}
                      onChange={(e) => updateField('target_audience', e.target.value)}
                      placeholder="مثال: أصحاب الشركات الناشئة، المبرمجون المبتدئون"
                      className="w-full pr-12 pl-4 py-3.5 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-blue-600 focus:border-transparent text-right outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    رابط LinkedIn <span className="text-slate-400 font-normal">(اختياري)</span>
                  </label>
                  <div className="relative">
                    <Globe className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="url"
                      value={data.linkedin_url}
                      onChange={(e) => updateField('linkedin_url', e.target.value)}
                      placeholder="https://linkedin.com/in/username"
                      className="w-full pr-12 pl-4 py-3.5 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-blue-600 focus:border-transparent text-right outline-none transition-all"
                      dir="ltr"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Voice Tone & Dialect */}
            {step === 4 && (
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">نبرة التواصل</label>
                  <div className="grid grid-cols-2 gap-2.5">
                    {voiceTones.map((tone) => (
                      <button
                        key={tone.id}
                        type="button"
                        onClick={() => updateField('voice_tone', tone.id)}
                        className={`p-3.5 rounded-2xl border-2 text-right transition-all flex flex-col justify-between ${
                          data.voice_tone === tone.id
                            ? 'border-blue-600 bg-blue-50/50 text-blue-900 shadow-sm'
                            : 'border-slate-100 hover:border-slate-200 text-slate-700 bg-slate-50/30'
                        }`}
                      >
                        <tone.icon className={`w-5 h-5 mb-2 ${data.voice_tone === tone.id ? 'text-blue-600' : 'text-slate-400'}`} />
                        <div>
                          <div className="font-bold text-xs">{tone.label}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">{tone.desc}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">اللهجة</label>
                  <div className="grid grid-cols-2 gap-2.5">
                    {dialects.map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => updateField('dialect', d.id)}
                        className={`p-3 rounded-xl border text-right transition-all ${
                          data.dialect === d.id
                            ? 'border-blue-600 bg-blue-50/50 text-blue-900 font-bold'
                            : 'border-slate-100 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div className="text-xs">{d.label}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 5: Custom Rules */}
            {step === 5 && (
              <div className="space-y-3">
                <label className="block text-sm font-semibold text-slate-700">
                  تعليمات وقواعد خاصة للمساعد <span className="text-slate-400 font-normal">(اختياري)</span>
                </label>
                <textarea
                  value={data.custom_rules}
                  onChange={(e) => updateField('custom_rules', e.target.value)}
                  placeholder="اكتب كل قاعدة في سطر مستقل، مثال:&#10;- لا تستخدم علامات النجوم أو الماركداون&#10;- تجنب استخدام الأسلوب الترويجي البحت&#10;- ركز دائماً على الإيجاز والعملية"
                  rows={4}
                  className="w-full p-4 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm leading-relaxed text-right outline-none transition-all"
                />
                <p className="text-xs text-slate-400">سيلتزم المساعد الذكي بهذه الشروط في كافة الردود والمنشورات.</p>
              </div>
            )}

            {/* Step 6: Confirmation */}
            {step === 6 && (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                  <Check className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <p className="text-lg font-bold text-slate-800">
                    أهلاً بك، <span className="text-blue-600">{data.full_name}</span>!
                  </p>
                  <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
                    تم تجهيز المستشار الذكي بناءً على بصمتك كـ <span className="font-semibold text-slate-700">{data.job_title}</span> في مجال <span className="font-semibold text-slate-700">{data.industry}</span>.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-100">
            <button
              onClick={handleBack}
              disabled={step === 1}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                step === 1
                  ? 'text-slate-300 cursor-not-allowed'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <ArrowRight className="w-4 h-4" />
              رجوع
            </button>

            {step < 6 ? (
              <button
                onClick={handleNext}
                disabled={!canProceed()}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  canProceed()
                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                التالي
                <ArrowLeft className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleComplete}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all disabled:bg-slate-300"
              >
                {loading ? 'جاري الحفظ...' : 'ابدأ استخدام المساعد'}
                <Sparkles className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
