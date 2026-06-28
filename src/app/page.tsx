'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Bot, MessageSquare, Download, X } from 'lucide-react';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import ChatMessage from '@/components/chat/ChatMessage';
import ChatInput from '@/components/chat/ChatInput';
import SuggestedPrompts from '@/components/chat/SuggestedPrompts';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  contentType?: string;
  createdAt?: string;
}

interface Chat {
  id: string;
  title: string;
  lastMessageAt: string;
  messageCount: number;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [chatId, setChatId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chats, setChats] = useState<Chat[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
  useEffect(() => {
  // 1. إذا كان مُثبّتاً حالياً (من الأيقونة) — أخفِ النافذة
  const isStandalone = 
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    (window.navigator as any).standalone === true;

  if (isStandalone) {
    setShowInstallBanner(false);
    return;
  }

  // 2. إذا كان المستخدم ضغط "تثبيت" سابقاً (بنجاح أو إلغاء)
  const installStatus = localStorage.getItem('pwa-install-status');
  if (installStatus === 'installed' || installStatus === 'dismissed') {
    setShowInstallBanner(false);
    return;
  }

  const handleBeforeInstallPrompt = (e: Event) => {
    e.preventDefault();
    setInstallPrompt(e);
    setShowInstallBanner(true);
  };

  const handleAppInstalled = () => {
    localStorage.setItem('pwa-install-status', 'installed');
    setShowInstallBanner(false);
    setInstallPrompt(null);
  };

  window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  window.addEventListener('appinstalled', handleAppInstalled);

  // 3. مؤقت للعرض (فقط إذا لم يتم رفض/تثبيت سابقاً)
  const timer = setTimeout(() => {
    const status = localStorage.getItem('pwa-install-status');
    if (!status) {
      setShowInstallBanner(true);
    }
  }, 3000);

  return () => {
    window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.removeEventListener('appinstalled', handleAppInstalled);
    clearTimeout(timer);
  };
}, []);
    
  const sendMessage = async (content: string) => {
    if (!content.trim() || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: content.trim(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId, content: userMsg.content }),
      });

      if (res.status === 401) {
        window.location.href = '/login';
        return;
      }

      const data = await res.json();

      if (data.success) {
        setChatId(data.chatId);
        setMessages((prev) => [
          ...prev,
          {
            id: data.message.id || Date.now().toString() + 'ai',
            role: 'assistant',
            content: data.message.content,
            contentType: data.message.contentType,
            createdAt: data.message.createdAt,
          },
        ]);
        fetchChats();
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString() + 'err',
            role: 'assistant',
            content: data.error || 'حدث خطأ، جرب مرة ثانية.',
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString() + 'err',
          role: 'assistant',
          content: 'مشكلة بالاتصال، تأكد من الإنترنت.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchChats = useCallback(async () => {
    try {
      const res = await fetch('/api/chats');
      if (res.ok) {
        const data = await res.json();
        setChats(data.chats || []);
      }
    } catch (err) {
      console.error('Failed to fetch chats:', err);
    }
  }, []);

  const startNewChat = () => {
    setMessages([]);
    setChatId(null);
    setSidebarOpen(false);
  };

  useEffect(() => {
    fetchChats();
  }, [fetchChats]);

  const hasMessages = messages.length > 0;

  return (
    <div className="flex h-screen bg-gray-50" dir="rtl">
      {showInstallBanner && (
        <div className="fixed top-0 left-0 right-0 bg-blue-600 text-white p-3 z-[60] shadow-lg">
          <div className="max-w-3xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Download className="w-5 h-5" />
              <div>
                <p className="font-medium text-sm">ثبّت التطبيق للوصول السريع</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleInstall}
                className="px-4 py-1.5 bg-white text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-50 transition-colors"
              >
                تثبيت
              </button>
              <button
                onClick={dismissBanner}
                className="p-1.5 hover:bg-blue-700 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      <Sidebar
        chats={chats}
        currentChatId={chatId}
        onChatSelect={loadChat}
        onNewChat={startNewChat}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <Header onMenuClick={() => setSidebarOpen(true)} />

        <div
          ref={scrollRef}
          className={`flex-1 overflow-y-auto px-4 py-6 space-y-6 ${showInstallBanner ? 'pt-16' : ''}`}
        >
          {!hasMessages ? (
            <div className="flex flex-col items-center justify-center h-full max-w-2xl mx-auto">
              <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">
                مرحباً أنا مستشارك الشخصي
              </h2>
              <p className="text-gray-500 text-center mb-8 leading-relaxed">
                أساعدك بتحويل أفكارك الخام إلى محتوى مهني واضح وجذاب.
                <br />
                أخبرني عن تجربتك أو فكرتك، هيا نبدأ...
              </p>
              <SuggestedPrompts onSelect={sendMessage} />
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-6">
              {messages.map((msg) => (
                <ChatMessage
                  key={msg.id}
                  id={msg.id}
                  role={msg.role}
                  content={msg.content}
                  contentType={msg.contentType}
                  createdAt={msg.createdAt}
                />
              ))}
              {loading && (
                <div className="flex gap-3 flex-row-reverse">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-5 py-3.5 shadow-sm">
                    <div className="flex items-center gap-2 text-gray-400 text-sm">
                      <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce delay-100" />
                      <div className="w-2 h--2 bg-blue-600 rounded-full animate-bounce delay-200" />
                      <span className="mr-2">يكتب...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <ChatInput onSend={sendMessage} loading={loading} />
      </div>
    </div>
  );
}
