PWAclient';

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
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [chatId, setChatId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chats, setChats] = useState<Chat[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // PWA Install Banner
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  // Scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // PWA Install Prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
      // Show banner immediately for testing
      setShowInstallBanner(true);
      console.log('✅ beforeinstallprompt captured!');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setShowInstallBanner(false);
    }

    // For testing: show manual install button after 5 seconds
    const timer = setTimeout(() => {
      if (!installPrompt && !window.matchMedia('(display-mode: standalone)').matches) {
        console.log('⏰ Manual install check...');
        // Try to trigger it manually
        setShowInstallBanner(true);
      }
    }, 5000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      clearTimeout(timer);
    };
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setShowInstallBanner(false);
    }
    
    setInstallPrompt(null);
  };

  const dismissBanner = () => {
    setShowInstallBanner(false);
    // Save to localStorage so it doesn't show again for 24 hours
    localStorage.setItem('pwa-banner-dismissed', Date.now().toString());
  };

  // Load chat history
  const loadChat = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/chat/${id}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
        setChatId(id);
      }
    } catch (err) {
      console.error('Failed to load chat:', err);
    }
  }, []);

  // Send message
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

      // Redirect to login if unauthorized
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
        
        // Refresh chat list
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

  // Fetch chats list
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

  // New chat
  const startNewChat = () => {
    setMessages([]);
    setChatId(null);
    setSidebarOpen(false);
  };

  // Load chats on mount
  useEffect(() => {
    fetchChats();
  }, [fetchChats]);

  const hasMessages = messages.length > 0;

  return (
    <div className="flex h-screen bg-gray-50" dir="rtl">
      {/* PWA Install Banner */}
      {showInstallBanner && (
        <div className="fixed top-0 left-0 right-0 bg-blue-600 text-white p-3 z-[60] shadow-lg animate-slide-down">
          <div className="max-w-3xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Download className="w-5 h-5" />
              <div>
                <p className="font-medium text-sm">ثبّت التطبيق للوصول السريع</p>
                <p className="text-xs text-blue-100">أو استخدم "إضافة للشاشة الرئيسية" من القائمة</p>
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

      {/* Sidebar */}
      <Sidebar
        chats={chats}
        currentChatId={chatId}
        onChatSelect={loadChat}
        onNewChat={startNewChat}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header onMenuClick={() => setSidebarOpen(true)} />

        {/* Messages Area */}
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
                      <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce delay-200" />
                      <span className="mr-2">يكتب...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Input Area */}
        <ChatInput onSend={sendMessage} loading={loading} />
      </div>
    </div>
  );
}
