'use client';

import { Send, Loader2, Mic, Paperclip, AlertCircle } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

interface ChatInputProps {
  onSend: (message: string) => void;
  loading: boolean;
  disabled?: boolean;
}

const MAX_LENGTH = 2000;
const MIN_LENGTH = 1;

// Prompt Injection
const FORBIDDEN_PATTERNS = [
  /system\s*:/i,
  /ignore\s*previous/i,
  /forget\s*everything/i,
  /you\s*are\s*now/i,
  /act\s*as\s*/i,
  /override\s*instructions/i,
  /disregard\s*all/i,
];

function sanitizeInput(input: string): string {
  
  return input.replace(/<[^>]*>/g, '').trim();
}

function validateInput(input: string): { valid: boolean; error?: string } {
  const sanitized = sanitizeInput(input);
  
  if (sanitized.length < MIN_LENGTH) {
    return { valid: false, error: 'الرسالة فارغة' };
  }
  
  if (sanitized.length > MAX_LENGTH) {
    return { valid: false, error: `الرسالة طويلة جداً. الحد الأقصى ${MAX_LENGTH} حرف` };
  }

  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(sanitized)) {
      return { valid: false, error: 'تم اكتشاف محاولة حقن غير مصرح بها' };
    }
  }

  return { valid: true };
}

export default function ChatInput({ onSend, loading, disabled }: ChatInputProps) {
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleSend = () => {
    setError(null);
    
    const validation = validateInput(input);
    
    if (!validation.valid) {
      setError(validation.error || 'خطأ غير معروف');
      return;
    }

    const sanitized = sanitizeInput(input);
    onSend(sanitized);
    setInput('');
    setError(null);
    
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInput(value);
    
    if (error) {
      const validation = validateInput(value);
      if (validation.valid) {
        setError(null);
      }
    }
  };

  const charCount = input.length;
  const isNearLimit = charCount > MAX_LENGTH * 0.9;
  const isOverLimit = charCount > MAX_LENGTH;

  return (
    <div className="bg-white border-t border-gray-200 px-4 py-3">
      {/* Error Message */}
      {error && (
        <div className="max-w-3xl mx-auto mb-2">
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        </div>
      )}

      <div className="max-w-3xl mx-auto flex items-center gap-2">
        {/* Attachments */}
        <button 
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors shrink-0"
          title="إرفاق ملف"
        >
          <Paperclip className="w-5 h-5" />
        </button>

        {/* Textarea */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="اكتب رسالتك هنا..."
            rows={1}
            disabled={disabled || loading}
            className={`w-full resize-none rounded-xl border-0 bg-gray-100 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:bg-white disabled:bg-gray-200 disabled:text-gray-400 min-h-[44px] max-h-[120px] ${
              error 
                ? 'ring-2 ring-red-500 bg-red-50' 
                : 'focus:ring-blue-500'
            }`}
            dir="rtl"
          />
          
          {/* Character Counter */}
          <div className={`absolute left-3 bottom-1 text-xs ${
            isOverLimit 
              ? 'text-red-500 font-medium' 
              : isNearLimit 
                ? 'text-amber-500' 
                : 'text-gray-400'
          }`}>
            {charCount}/{MAX_LENGTH}
          </div>
        </div>

        {/* Voice */}
        <button 
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors shrink-0"
          title="صوتي"
        >
          <Mic className="w-5 h-5" />
        </button>

        {/* Send */}
        <button
          onClick={handleSend}
          disabled={!input.trim() || loading || disabled || isOverLimit}
          className="p-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg transition-colors shadow-sm shrink-0"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </button>
      </div>
    </div>
  );
}
