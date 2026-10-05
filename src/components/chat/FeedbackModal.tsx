'use client';

import { useState } from 'react';
import { X, ThumbsUp, ThumbsDown } from 'lucide-react';

interface FeedbackModalProps {
  isOpen: boolean;
  type: 'like' | 'dislike';
  messageId: string;
  onClose: () => void;
  onSubmit: (reason: string, comment: string) => void;
}

export default function FeedbackModal({
  isOpen,
  type,
  onClose,
  onSubmit,
}: FeedbackModalProps) {
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [comment, setComment] = useState<string>('');

  if (!isOpen) return null;

  const reasons =
    type === 'dislike'
      ? [
          { id: 'too_long', label: 'الإجابة طويلة جداً' },
          { id: 'too_short', label: 'الإجابة قصيرة جداً' },
          { id: 'wrong_tone', label: 'النبرة غير مناسبة' },
          { id: 'inaccurate', label: 'معلومات غير دقيقة' },
          { id: 'other', label: 'سبب آخر' },
        ]
      : [
          { id: 'helpful', label: 'إجابة مفيدة ودقيقة' },
          { id: 'good_tone', label: 'النبرة مناسبة جداً' },
          { id: 'perfect_length', label: 'الطول ممتاز' },
          { id: 'other', label: 'سبب آخر' },
        ];

  const handleSend = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!selectedReason) return;
    
    onSubmit(selectedReason, comment);
    setSelectedReason('');
    setComment('');
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      <div 
        className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl relative animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* زر الإغلاق */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="absolute top-4 left-4 text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* العنوان */}
        <div className="flex items-center gap-2 mb-4">
          {type === 'like' ? (
            <div className="p-2 bg-green-100 text-green-600 rounded-full">
              <ThumbsUp className="w-5 h-5" />
            </div>
          ) : (
            <div className="p-2 bg-red-100 text-red-600 rounded-full">
              <ThumbsDown className="w-5 h-5" />
            </div>
          )}
          <h3 className="text-lg font-bold text-gray-800">
            {type === 'like' ? 'ما الذي أعجبك في هذا الرد؟' : 'ما المشكلة في هذا الرد؟'}
          </h3>
        </div>

    
        <div className="space-y-4">
          {/* خيارات السبب */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">ما السبب؟:</label>
            <div className="grid grid-cols-1 gap-2">
              {reasons.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedReason(r.id);
                  }}
                  className={`w-full text-right px-4 py-2.5 rounded-xl border text-sm transition-all ${
                    selectedReason === r.id
                      ? 'border-blue-600 bg-blue-50 text-blue-700 font-medium'
                      : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* تعليق إضافي */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ملاحظات إضافية (اختياري):
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="اكتب ملاحظاتك لتحسين استجابة النموذج في الردود القادمة..."
              rows={3}
              className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
            />
          </div>

          {/* أزرار الإجراءات */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleSend}
              disabled={!selectedReason}
              className="flex-1 bg-blue-600 text-white py-2.5 px-4 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              إرسال التقييم
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              إلغاء
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
