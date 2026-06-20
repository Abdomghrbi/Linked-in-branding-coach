'use client';

import { Lightbulb, TrendingUp, Users, Award, Briefcase } from 'lucide-react';

interface SuggestedPromptsProps {
  onSelect: (prompt: string) => void;
}

const prompts = [
  {
    icon: Lightbulb,
    text: 'عندي فكرة لمشروع جديد، كيف أعرضها على LinkedIn؟',
    color: 'bg-amber-50 text-amber-600 border-amber-200',
  },
  {
    icon: TrendingUp,
    text: 'حضرت مؤتمر AI، ساعدني أكتب عن التجربة',
    color: 'bg-blue-50 text-blue-600 border-blue-200',
  },
  {
    icon: Users,
    text: 'كيف أزيد engagement على منشوراتي؟',
    color: 'bg-green-50 text-green-600 border-green-200',
  },
  {
    icon: Award,
    text: 'حصلت على شهادة جديدة، كيف أعلن عنها؟',
    color: 'bg-purple-50 text-purple-600 border-purple-200',
  },
  {
    icon: Briefcase,
    text: 'بدي أغير مجال عملي، كيف أبني Personal Branding؟',
    color: 'bg-rose-50 text-rose-600 border-rose-200',
  },
];

export default function SuggestedPrompts({ onSelect }: SuggestedPromptsProps) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500 text-center mb-4">أو اختر من الاقتراحات:</p>
      <div className="grid grid-cols-1 gap-2.5 max-w-lg mx-auto">
        {prompts.map((prompt, index) => (
          <button
            key={index}
            onClick={() => onSelect(prompt.text)}
            className={`flex items-center gap-3 p-3.5 rounded-xl border text-right text-sm font-medium hover:shadow-md transition-all ${prompt.color}`}
          >
            <prompt.icon className="w-5 h-5 shrink-0" />
            <span>{prompt.text}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
