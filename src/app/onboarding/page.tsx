'use client';

import { useState, useEffect } from 'react';
import { Bot, Briefcase, Globe, MessageCircle, Sparkles, ArrowRight, ArrowLeft, Check } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface OnboardingData {
  full_name: string;
  job_title: string;
  industry: string;
  linkedin_url: string;
  voice_tone: string;
  dialect: string;
}

const voiceTones = [
  { id: 'formal', label: 'رسمي', desc: 'لغة مهنية دقيقة', icon: Briefcase },
  { id: 'friendly', label: 'ودي', desc: 'كأنك تتكلم مع صديق', icon: MessageCircle },
  { id: 'challenging', label: 'تحدي', desc: 'يدفعك للأفضل', icon: Sparkles },
  { id: 'inspirational', label: 'تحفيزي', desc: 'يحمسك ويلهمك', icon: Sparkles },
];

const dialects = [
  { id: 'fusha', label: 'الفصحى', desc: 'اللغة العربية القياسية' },
  { id: 'gulf', label: 'خليجية', desc: 'لهجة الخليج العربي' },
  { id: 'egyptian', label: 'مصرية', desc: 'لهجة مصرية عامية' },
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
    linkedin_url: '',
    voice_tone: 'friendly',
    dialect: 'fusha',
  });

  const router = useRouter();
  const supabase = createClient();

  // Load user data
  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);
      
      // Check if user already completed onboarding
      const { data: userData } = await supabase
        .from('users')
        .select('full_name, job_title, industry, linkedin_url, voice_tone, dialect')
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
        }));
      }
    };
    loadUser();
  }, []);

  const handleNext = () => {
    if (step < 5) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleComplete = async () => {
    setLoading(true);
    
    const { error } = await supabase
      .from('users')
      .update({
        full_name: data.full_name,
        job_title: data.job_title,
        industry: data.industry,
        linkedin_url: data.linkedin_url || null,
        voice_tone: data.voice_tone,
        dialect: data.dialect,
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
      case 3: return true; // LinkedIn is optional
      case 4: return true; // Has defaults
      default: return true;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-lg overflow-hidden">
        {/* Progress Bar */}
        <div className="bg-gray-100 h-1.5 w-full">
          <div 
            className="bg-blue-600 h-full transition-all duration-500 ease-out"
            style={{ width: `${(step / 5) * 100}%` }}
          />
        </div>

        <div className="p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Bot className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {step === 5 ? 'أنت جاهز!' : 'نبدأ رحلتك'}
            </h1>
            <p className="text-gray-500 text-sm">
              {step === 1 && 'خلينا نتعرف عليك أكتر'}
              {step === 2 && 'شو بتشتغل؟'}
              {step === 3 && 'رابط LinkedIn (اختياري)'}
              {step === 4 && 'كيف بدك المستشار يتكلم معك؟'}
              {step === 5 && 'كل شي جاهز، هيا نبدأ!'}
            </p>
          </div>

          {/* Step Content */}
          <div className="space-y-6 min-h-[200px]">
            {/* Step 1: Full Name */}
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    الاسم الكامل *
                  </label>
                  <input
                    type="text"
                    value={data.full_name}
                    onChange={(e) => updateField('full_name', e.target.value)}
                    placeholder="مثال: أحمد محمد"
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-right"
                    autoFocus
                  />
                </div>
              </div>
            )}

            {/* Step 2: Job Title & Industry */}
            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    المسمى الوظيفي *
                  </label>
                  <input
                    type="text"
                    value={data.job_title}
                    onChange={(e) => updateField('job_title', e.target.value)}
                    placeholder="مثال: مهندس برمجيات"
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-right"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    مجال العمل *
                  </label>
                  <input
                    type="text"
                    value={data.industry}
                    onChange={(e) => updateField('industry', e.target.value)}
                    placeholder="مثال: التقنية، التسويق، التعليم..."
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-right"
                  />
                </div>
              </div>
            )}

            {/* Step 3: LinkedIn URL */}
            {step === 3 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    رابط LinkedIn <span className="text-gray-400">(اختياري)</span>
                  </label>
                  <div className="relative">
                    <Globe className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="url"
                      value={data.linkedin_url}
                      onChange={(e) => updateField('linkedin_url', e.target.value)}
                      placeholder="https://linkedin.com/in/username"
                      className="w-full pr-10 pl-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-right"
                      dir="ltr"
                      autoFocus
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    رح يساعدني هاد الرابط بفهم محتواك الحالي على LinkedIn
                  </p>
                </div>
              </div>
            )}

            {/* Step 4: Voice Tone & Dialect */}
            {step === 4 && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    نبرة المستشار
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {voiceTones.map((tone) => (
                      <button
                        key={tone.id}
                        onClick={() => updateField('voice_tone', tone.id)}
                        className={`p-4 rounded-xl border-2 text-right transition-all ${
                          data.voice_tone === tone.id
                            ? 'border-blue-600 bg-blue-50 text-blue-900'
                            : 'border-gray-200 hover:border-gray-300 text-gray-700'
                        }`}
                      >
                        <tone.icon className={`w-5 h-5 mb-2 ${data.voice_tone === tone.id ? 'text-blue-600' : 'text-gray-400'}`} />
                        <div className="font-medium text-sm">{tone.label}</div>
                        <div className="text-xs text-gray-500 mt-1">{tone.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    اللهجة
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {dialects.map((d) => (
                      <button
                        key={d.id}
                        onClick={() => updateField('dialect', d.id)}
                        className={`p-4 rounded-xl border-2 text-right transition-all ${
                          data.dialect === d.id
                            ? 'border-blue-600 bg-blue-50 text-blue-900'
                            : 'border-gray-200 hover:border-gray-300 text-gray-700'
                        }`}
                      >
                        <div className="font-medium text-sm">{d.label}</div>
                        <div className="text-xs text-gray-500 mt-1">{d.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 5: Ready! */}
            {step === 5 && (
              <div className="text-center space-y-4">
                <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                  <Check className="w-10 h-10 text-green-600" />
                </div>
                <div className="space-y-2">
                  <p className="text-gray-700">
                    <span className="font-bold text-blue-600">{data.full_name}</span>، أهلاً وسهلاً!
                  </p>
                  <p className="text-sm text-gray-500">
                    مستشارك الشخصي جاهز يساعدك ببناء علامتك على LinkedIn
                    <br />
                    كنسبة <span className="font-medium text-gray-700">{data.job_title}</span> في مجال <span className="font-medium text-gray-700">{data.industry}</span>
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
            <button
              onClick={handleBack}
              disabled={step === 1}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                step === 1
                  ? 'text-gray-300 cursor-not-allowed'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <ArrowRight className="w-4 h-4" />
              رجوع
            </button>

            {step < 5 ? (
              <button
                onClick={handleNext}
                disabled={!canProceed()}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  canProceed()
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                التالي
                <ArrowLeft className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleComplete}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:bg-gray-300"
              >
                {loading ? 'جاري التجهيز...' : 'هيا نبدأ!'}
                <Sparkles className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
            }
