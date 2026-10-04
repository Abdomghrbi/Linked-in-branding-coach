'use client';

import { useState } from 'react';
import { X, ThumbsUp, ThumbsDown } from 'lucide-react';

interface FeedbackModalProps {
  isOpen: boolean;
  type: 'like' | 'dislike';
  messageId: string;
  onClose: () => void;
  onSubmit: (reason: string, comment: string) => Promise<void>;
}

export default function FeedbackModal({
  isOpen,
  type,
  onClose,
  onSubmit,
}: FeedbackModalProps) {
  const [reason, setReason] = useState('');
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const dislikeReasons = [
    { id: 'too_long', label: 'الرسالة طويلة جداً ومملة' },
    { id: 'too_short', label: 'الرسالة قصيرة وغير كافية' },
    { id: 'wrong_tone', label: 'النبرة غير مناسبة (رسمية/عامية أكثر من اللازم)' },
    { id: 'inaccurate', label: 'المعلومات غير دقيقة أو غير مفيدة' },
    { id: 'off_topic', label: 'النموذج لم يفهم الطلب جيداً' },
  ];

  const likeReasons = [
    { id: 'perfect_length', label: 'الطول والإيجاز ممتاز' },
    { id: 'great_tone', label: 'النبرة والأسلوب رائعان' },
    { id: 'helpful_content', label: 'المحتوى عملي ومفيد جداً' },
  ];

  const currentReasons = type === 'like' ? likeReasons : dislikeReasons;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason) return;

    setIsSubmitting(true);
    await onSubmit(reason, comment);
    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 shadow-xl relative animate-in fade-in zoom-in duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 left-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-4">
          {type === 'like' ? (
            <ThumbsUp className="w-6 h-6 text-green-500" />
          ) : (
            <ThumbsDown className="w-6 h-6 text-red-500" />
          )}
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            {type === 'like' ? 'ما الذي أعجبك في الإجابة؟' : 'ما المشكلة في هذه الإجابة؟'}
          </h3>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            {currentReasons.map((item) => (
              <label
                key={item.id}
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  reason === item.id
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium'
                    : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="feedback_reason"
                  value={item.id}
                  checked={reason === item.id}
                  onChange={(e) => setReason(e.target.value)}
                  className="hidden"
                />
                <span className="text-sm">{item.label}</span>
              </label>
            ))}
          </div>

          <div>
            <textarea
              placeholder="تفاصيل إضافية (اختياري)..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
              className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white placeholder-gray-400"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={!reason || isSubmitting}
              className="px-5 py-2 rounded-xl text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? 'جاري الحفظ...' : 'إرسال التقييم'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
