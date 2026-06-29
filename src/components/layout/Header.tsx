'use client';

import { Computer, Menu, LogOut, User, DoorOpen } from 'lucide-react';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface HeaderProps {
  onMenuClick?: () => void;
}

interface UserData {
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const [showInfo, setShowInfo] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data: profile } = await supabase
          .from('users')
          .select('full_name, avatar_url, email')
          .eq('id', user.id)
          .single();
        
        setUserData(profile || {
          full_name: user.user_metadata?.full_name || user.email?.split('@') || 'مستخدم',
          avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
          email: user.email,
        });
      }
      
      setLoading(false);
    };
    
    loadUser();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const getInitials = (name: string | null) => {
    if (!name) return 'م';
    return name.split(' ').map(n => n).join('').slice(0, 2).toUpperCase();
  };

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center gap-3">
        <button 
          onClick={onMenuClick}
          className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Menu className="w-5 h-5 text-gray-600" />
        </button>
        
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center shadow-lg">
          <Computer className="w-6 h-6 text-white" />
        </div>
        
        <div>
          <h1 className="font-bold text-gray-900 text-lg leading-tight">مستشار العلامة الشخصية</h1>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button 
          onClick={() => setShowInfo(!showInfo)}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
        >
          {showInfo ? 'إخفاء' : '❕'}
        </button>

        {/* User Avatar / Login */}
        {!loading && (
          userData ? (
            <div className="relative group">
              <button className="flex items-center gap-2 p-1 rounded-full hover:bg-gray-100 transition-colors">
                {userData.avatar_url ? (
                  <img 
                    src={userData.avatar_url} 
                    alt={userData.full_name || 'المستخدم'}
                    className="w-9 h-9 rounded-full object-cover border-2 border-blue-100"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-sm font-bold border-2 border-blue-100">
                    {getInitials(userData.full_name)}
                  </div>
                )}
              </button>
              
              {/* Dropdown Menu */}
              <div className="absolute left-0 top-full mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-xl p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <div className="flex items-center gap-3 pb-3 border-b border-gray-100 mb-2">
                  {userData.avatar_url ? (
                    <img 
                      src={userData.avatar_url} 
                      alt={userData.full_name || ''}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-sm font-bold">
                      {getInitials(userData.full_name)}
                    </div>
                  )}
                  <div className="text-right">
                    <p className="font-medium text-sm text-gray-900 truncate max-w-[140px]">
                      {userData.full_name || 'مستخدم'}
                    </p>
                    <p className="text-xs text-gray-500 truncate max-w-[140px]">
                      {userData.email}
                    </p>
                  </div>
                </div>
                
                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors text-right"
                >
                  <LogOut className="w-4 h-4" />
                  تسجيل الخروج
                </button>
              </div>
            </div>
          ) : (
            <a 
              href="/login"
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors"
            >
             
              <DoorOpen className="w-4 h-4 rotate-180" /> 
              دخول
            </a>
          )
        )}
      </div>

      {showInfo && (
        <div className="absolute top-16 left-4 right-4 bg-white border rounded-xl shadow-xl p-4 z-50 max-w-sm mr-auto">
          <p className="text-sm text-gray-600 leading-relaxed">
            أنا مستشارك الشخصي لبناء علامتك المهنية على LinkedIn. 
            أساعدك بتحويل أفكارك إلى محتوى مهني ذو تأثير.
          </p>
        </div>
      )}
    </div>
  );
}
