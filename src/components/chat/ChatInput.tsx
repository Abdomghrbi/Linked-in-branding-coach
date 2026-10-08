'use client';

import { Send, Loader2, Mic, Paperclip, AlertCircle, X, Image as ImageIcon } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

interface ChatInputProps {
  onSend: (message: string, imageBase64?: string) => void;
  loading: boolean;
  disabled?: boolean;
}

const MAX_LENGTH = 2000;
const MIN_LENGTH = 1;

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

function validateInput(input: string, hasImage: boolean): { valid: boolean; error?: string } {
  const sanitized = sanitizeInput(input);
  
  if (!hasImage && sanitized.length < MIN_LENGTH) {
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
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('يرجى اختيار ملف صورة صالح (PNG, JPG, WEBP)');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSend = () => {
    setError(null);
    
    const validation = validateInput(input, !!selectedImage);
    
    if (!validation.valid) {
      setError(validation.error || 'خطأ غير معروف');
      return;
    }

    const sanitized = sanitizeInput(input);
    
    const base64Data = selectedImage ? selectedImage.split(',')[1] : undefined;

    onSend(sanitized, base64Data);
    
    setInput('');
    setSelectedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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
      const validation = validateInput(value, !!selectedImage);
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

      {/* Image Preview Card */}
      {selectedImage && (
        <div className="max-w-3xl mx-auto mb-2 flex items-center gap-2">
          <div className="relative group inline-block">
            <img
              src={selectedImage}
              alt="المعاينة"
              className="w-16 h-16 object-cover rounded-xl border border-gray-200 shadow-sm"
            />
            <button
              type="button"
              onClick={handleRemoveImage}
              className="absolute -top-1.5 -right-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full p-0.5 shadow-md transition-colors"
              title="إزالة"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <span className="text-xs text-gray-400">تم إرفاق الصورة جاهزة للإرسال</span>
        </div>
      )}

      <div className="max-w-3xl mx-auto flex items-center gap-2">
        {/* Hidden File Input */}
        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          onChange={handleImageSelect}
          className="hidden"
        />

        {/* Attachments / Paperclip Button */}
        <button 
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || loading}
          className={`p-2 rounded-lg transition-colors shrink-0 ${
            selectedImage 
              ? 'text-blue-600 bg-blue-50 hover:bg-blue-100' 
              : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
          }`}
          title="إرفاق صورة"
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
            placeholder={selectedImage ? "اكتب سؤالك عن الصورة (اختياري)..." : "اكتب رسالتك هنا..."}
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
          type="button"
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors shrink-0"
          title="صوتي"
        >
          <Mic className="w-5 h-5" />
        </button>

        {/* Send */}
        <button
          type="button"
          onClick={handleSend}
          disabled={(!input.trim() && !selectedImage) || loading || disabled || isOverLimit}
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
