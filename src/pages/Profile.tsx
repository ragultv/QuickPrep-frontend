import React, { useEffect, useState } from 'react';
import { Mail, Lock, Award, BookOpen, LogOut, Settings as SettingsIcon } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import type { UserProfile } from '../types';
import {auth, users, userStats } from '../utils/api';
import { eachDayOfInterval, startOfYear, endOfYear, format, isSameDay } from 'date-fns';

// ← added: define props so Profile can receive onLogout callback
interface ProfileProps {
  onLogout: () => void;
}

export default function Profile({ onLogout }: ProfileProps) {  // ← changed: accept onLogout
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const navigate = useNavigate();
  const [contributions, setContributions] = useState<{ [date: string]: number }>({});

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        let token = localStorage.getItem("access_token");
        const refreshToken = localStorage.getItem("refresh_token");
  
        // If no access token but refresh token exists, try to refresh
        if (!token && refreshToken) {
          const response = await auth.refreshToken(refreshToken);
          localStorage.setItem("access_token", response.data.access_token);
          localStorage.setItem("refresh_token", response.data.refresh_token);
        }
  
        if (!token) {
          navigate('/login');
          return;
        }
  
        // Now we have a valid token, continue fetching
        const res = await users.getMe();
        setProfile({
          name: res.data.name,
          email: res.data.email,
          avatar:
            'https://mrwallpaper.com/images/high/funny-baby-with-mustache-ls1hyj6cikry3zsx.webp',
          quizzesTaken: 24,
          topSubjects: ['JavaScript', 'Python'],
          averageScore: 85
        });
  
        const histRes = await userStats.getHistory();
        const contrib: { [date: string]: number } = {};
        if (Array.isArray(histRes.data)) {
          histRes.data.forEach((session: any) => {
            const date = session.created_at
              ? format(new Date(session.created_at), 'yyyy-MM-dd')
              : session.completed_at
                ? format(new Date(session.completed_at), 'yyyy-MM-dd')
                : null;
            if (date) {
              contrib[date] = (contrib[date] || 0) + 1;
            }
          });
        }
        setContributions(contrib);
  
      } catch (err) {
        console.error(err);
        navigate('/login');
      }
    };
  
    fetchProfile();
  }, [navigate]);
  

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    onLogout();                // ← changed: actually invoke the prop
    navigate('/login', { replace: true });
  };                           // ← added: close handleLogout

  if (!profile)                   // ← moved out of handleLogout
    return <div className="text-center py-20">Loading profile...</div>;

  return (
    <div className="w-full max-w-5xl mx-auto px-4 overflow-x-hidden">
      <div className="bg-white rounded-xl shadow-lg overflow-hidden p-4 sm:p-6 relative w-full">
        <div className="absolute top-6 right-6">
          <button
            onClick={() => navigate('/settings')}
            className="bg-indigo-100 hover:bg-indigo-200 text-indigo-600 rounded-full p-2 shadow transition-colors"
            title="Settings"
          >
            <SettingsIcon className="w-6 h-6" />
          </button>
        </div>
        <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6">
          <img src={profile.avatar} alt={profile.name} className="h-20 w-20 sm:h-24 sm:w-24 rounded-full" />
          <div className="text-center sm:text-left">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{profile.name}</h1>
            <p className="text-gray-500">{profile.email}</p>
          </div>
        </div>

        {/* Streak Calendar */}
        
      </div>
    </div>
  );
}

// --- Contribution Calendar Component ---
function ContributionCalendar({ contributions }: { contributions: { [date: string]: number } }) {
  const year = new Date().getFullYear();
  const start = startOfYear(new Date(year, 0, 1));
  const end = endOfYear(new Date(year, 11, 31));
  const days = eachDayOfInterval({ start, end });
  const weeks = Math.ceil(days.length / 7);
  const max = Math.max(1, ...Object.values(contributions));
  const getColor = (count: number) => {
    if (count === 0) return '#f3f4f6'; // gray-100 (lighter for empty)
    if (count < max * 0.25) return '#c7d2fe'; // indigo-200
    if (count < max * 0.5) return '#818cf8'; // indigo-400
    if (count < max * 0.75) return '#6366f1'; // indigo-500
    return '#312e81'; // indigo-900
  };
  // Month labels
  const monthLabels: { [key: number]: string } = {
    0: 'Jan', 1: 'Feb', 2: 'Mar', 3: 'Apr', 4: 'May', 5: 'Jun',
    6: 'Jul', 7: 'Aug', 8: 'Sep', 9: 'Oct', 10: 'Nov', 11: 'Dec'
  };
  // Find the first day index of each month in the grid
  const firstDayIndexes: { [month: number]: number } = {};
  days.forEach((date, idx) => {
    if (date.getDate() === 1) {
      firstDayIndexes[date.getMonth()] = idx;
    }
  });
  return (
    <div className="flex flex-col items-start px-2 pb-2 w-full max-w-full">
      {/* Month labels */}
      <div className="relative h-5 mb-2 ml-10 w-full max-w-full">
        {Object.entries(firstDayIndexes).map(([month, idx]) => (
          <span
            key={month}
            className="absolute text-xs text-gray-500 font-medium"
            style={{ left: `${(parseInt(idx.toString()) / 7) * 16}px` }}
          >
            {monthLabels[parseInt(month)]}
          </span>
        ))}
      </div>
      <div className="flex w-full max-w-full">
        {/* Weekday labels */}
        <div className="flex flex-col justify-between mr-2 h-[112px]">
          {['Mon', 'Wed', 'Fri'].map((d, i) => (
            <div key={i} className="text-xs text-gray-400 h-4 mt-[20px]">{d}</div>
          ))}
        </div>
        {/* Contribution grid */}
        <div className="flex-1 max-w-full" style={{ display: 'grid', gridTemplateColumns: `repeat(${weeks}, 1fr)`, gridTemplateRows: 'repeat(7, 1fr)', gap: 2 }}>
          {Array.from({ length: weeks * 7 }).map((_, idx) => {
            const week = Math.floor(idx / 7);
            const day = idx % 7;
            const date = new Date(start);
            date.setDate(start.getDate() + week * 7 + day);
            if (date > end) return <div key={idx} style={{ width: 14, height: 14 }} />;
            const dateStr = format(date, 'yyyy-MM-dd');
            const count = contributions[dateStr] || 0;
            return (
              <div
                key={dateStr}
                title={`${dateStr}: ${count} session${count !== 1 ? 's' : ''}`}
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 3,
                  background: getColor(count),
                  border: '1px solid #e5e7eb',
                  transition: 'background 0.2s',
                }}
              />
            );
          })}
        </div>
      </div>
      {/* Legend */}
      <div className="flex gap-2 mt-2 text-xs text-gray-500 items-center ml-10">
        <span>Less</span>
        <span style={{ background: getColor(0), width: 16, height: 8, display: 'inline-block', borderRadius: 2, border: '1px solid #e5e7eb' }} />
        <span style={{ background: getColor(1), width: 16, height: 8, display: 'inline-block', borderRadius: 2 }} />
        <span style={{ background: getColor(Math.ceil(max * 0.25)), width: 16, height: 8, display: 'inline-block', borderRadius: 2 }} />
        <span style={{ background: getColor(Math.ceil(max * 0.5)), width: 16, height: 8, display: 'inline-block', borderRadius: 2 }} />
        <span style={{ background: getColor(Math.ceil(max * 0.75)), width: 16, height: 8, display: 'inline-block', borderRadius: 2 }} />
        <span style={{ background: getColor(max), width: 16, height: 8, display: 'inline-block', borderRadius: 2 }} />
        <span>More</span>
      </div>
    </div>
  );
}
