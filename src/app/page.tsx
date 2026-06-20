'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Bot, MessageSquare } from 'lucide-react';
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

  // Scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

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
          className="flex-1 overflow-y-auto px-4 py-6 space-y-6"
        >
          {!hasMessages ? (
            <div className="flex flex-col items-center justify-center h-full max-w-2xl mx-auto">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center mb-6 shadow-lg">
                <Bot className="w-10 h-10 text-white" />
              </div>
              
              <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">
                مرحباً! أنا مستشارك الشخصي
              </h2>
              <p className="text-gray-500 text-center mb-8 leading-relaxed">
                خبير LinkedIn بخبرة 15 عاماً. أساعدك تحول أفكارك إلى محتوى مهني ذو تأثير.
                <br />
                خبرني عن تجربتك أو فكرتك ونبلش سواً.
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
