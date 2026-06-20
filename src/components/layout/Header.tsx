'use client';

import { Bot, Menu } from 'lucide-react';
import { useState } from 'react';

interface HeaderProps {
  onMenuClick?: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const [showInfo, setShowInfo] = useState(false);

  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center gap-3">
        <button 
          onClick={onMenuClick}
          className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Menu className="w-5 h-5 text-gray-600" />
        </button>
        
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center shadow-lg">
          <Bot className="w-6 h-6 text-white" />
        </div>
        
        <div>
          <h1 className="font-bold text-gray-900 text-lg leading-tight">مستشار العلامة الشخصية</h1>
          <p className="text-xs text-gray-500">خبير LinkedIn بخبرة 15 عاماً</p>
        </div>
      </div>

      <button 
        onClick={() => setShowInfo(!showInfo)}
        className="text-sm text-blue-600 hover:text-blue-700 font-medium px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
      >
        {showInfo ? 'إخفاء' : 'عن المستشار'}
      </button>

      {showInfo && (
        <div className="absolute top-16 left-4 right-4 bg-white border rounded-xl shadow-xl p-4 z-50 max-w-sm mr-auto">
          <p className="text-sm text-gray-600 leading-relaxed">
            أنا مستشارك الشخصي لبناء علامتك المهنية على LinkedIn. 
            أساعدك تحول أفكارك إلى محتوى مهني ذو تأثير.
          </p>
        </div>
      )}
    </header>
  );
}
