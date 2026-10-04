'use client';

import { User, Computer, ThumbsUp, ThumbsDown, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import FeedbackModal from './FeedbackModal'; // استيراد النافذة المنبثقة

interface MessageProps {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  contentType?: string;
  createdAt?: string;
}

export default function ChatMessage({ id, role, content, contentType }: MessageProps) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<'like' | 'dislike' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // حالات التحكم بالنافذة المنبثقة
  const [activeFeedbackType, setActiveFeedbackType] = useState<'like' | 'dislike' | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 1. فتح النافذة عند الضغط على أزرار التقييم
  const handleOpenModal = (type: 'like' | 'dislike') => {
    if (isSubmitting) return;

    // إذا ضغط نفس الزر المكتمل سابقاً يلغي التقييم
    if (feedback === type) {
      setFeedback(null);
      return;
    }

    setActiveFeedbackType(type);
    setIsModalOpen(true);
  };

  // 2. إرسال التقييم بعد اختيار السبب من النافذة المنبثقة
  const handleSubmitFeedback = async (reason: string, comment: string) => {
    if (!activeFeedbackType) return;

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/user-preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messageId: id, // تمرير معرف الرسالة
          type: activeFeedbackType, // 'like' أو 'dislike'
          reason, // السبب المختار
          comment, // الملاحظة النصية
        }),
      });

      if (response.ok) {
        setFeedback(activeFeedbackType);
        router.refresh(); 
      } else {
        throw new Error('فشل حفظ التقييم');
      }
    } catch (error) {
      console.error('Error saving feedback:', error);
      setFeedback(null);
    } finally {
      setIsSubmitting(false);
      setIsModalOpen(false);
    }
  };

  const isUser = role === 'user';

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row' : 'flex-row-reverse'}`}>
      {/* Avatar */}
      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-1 ${isUser ? 'bg-gray-200' : 'bg-gradient-to-br from-blue-600 to-blue-800'}`}>
        {isUser ? (
          <User className="w-4 h-4 text-gray-600" />
        ) : (
          <Computer className="w-4 h-4 text-white" />
        )}
      </div>

      {/* Message Bubble */}
      <div className={`max-w-[85%] lg:max-w-[75%] group relative ${isUser ? 'mr-0' : 'ml-0'}`}>
        {/* Content Type Badge */}
        {!isUser && contentType && contentType !== 'text' && (
          <div className="mb-1.5">
            {contentType === 'post_draft' && (
              <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-xs px-2.5 py-1 rounded-full font-medium">
                <Check className="w-3 h-3" />
                مسودة منشور
              </span>
            )}
            {contentType === 'tips' && (
              <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 text-xs px-2.5 py-1 rounded-full font-medium">
                💡 نصيحة
              </span>
            )}
          </div>
        )}

        <div className={`relative rounded-2xl px-5 py-3.5 text-sm leading-relaxed shadow-sm ${isUser ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-white border border-gray-200 text-gray-800 rounded-tl-sm'}`}>
          <p className="whitespace-pre-wrap">{content}</p>
          
          {/* Copy Button */}
          <button
            onClick={handleCopy}
            className={`absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg ${
              isUser ? 'hover:bg-blue-700 text-blue-100' : 'hover:bg-gray-100 text-gray-400'
            }`}
            title="نسخ"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Feedback Buttons (AI only) */}
        {!isUser && (
          <div className="flex items-center gap-1 mt-1.5 mr-2">
            <button 
              onClick={() => handleOpenModal('like')}
              disabled={isSubmitting}
              className={`p-1 rounded transition-colors ${
                feedback === 'like' 
                  ? 'text-green-600 bg-green-50' 
                  : 'text-gray-400 hover:bg-gray-100 hover:text-green-600'
              }`} 
              title="أعجبني"
            >
              <ThumbsUp className="w-3.5 h-3.5" />
            </button>

            <button 
              onClick={() => handleOpenModal('dislike')}
              disabled={isSubmitting}
              className={`p-1 rounded transition-colors ${
                feedback === 'dislike' 
                  ? 'text-red-600 bg-red-50' 
                  : 'text-gray-400 hover:bg-gray-100 hover:text-red-600'
              }`} 
              title="لم يعجبني"
            >
              <ThumbsDown className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* النافذة المنبثقة للتفاصيل */}
      {activeFeedbackType && (
        <FeedbackModal
          isOpen={isModalOpen}
          type={activeFeedbackType}
          messageId={id}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleSubmitFeedback}
        />
      )}
    </div>
  );
}
