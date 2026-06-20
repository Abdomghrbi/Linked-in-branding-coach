'use client';

import { Send, Loader2, Mic, Paperclip } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

interface ChatInputProps {
  onSend: (message: string) => void;
  loading: boolean;
  disabled?: boolean;
}

export default function ChatInput({ onSend, loading, disabled }: ChatInputProps) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleSend = () => {
    if (!input.trim() || loading || disabled) return;
    onSend(input.trim());
    setInput('');
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

  return (
<div className="bg-white border-t border-gray-200 px-4 py-3">
  <div className="max-w-3xl mx-auto flex items-center gap-2">
    {/* Attachments */}
    <button 
      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors shrink-0"
      title="إرفاق ملف"
    >
      <Paperclip className="w-5 h-5" />
    </button>

    {/* Textarea */}
    <div className="flex-1">
      <textarea
        ref={textareaRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="اكتب رسالتك هنا..."
        rows={1}
        disabled={disabled || loading}
        className="w-full resize-none rounded-xl border-0 bg-gray-100 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white disabled:bg-gray-200 disabled:text-gray-400 min-h-[44px] max-h-[120px]"
        dir="rtl"
      />
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
      disabled={!input.trim() || loading || disabled}
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
