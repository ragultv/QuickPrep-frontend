import { useEffect, useState } from 'react';
import {useNavigate, useParams } from 'react-router-dom';
import {auth, users, userStats as userStatsApi } from '../utils/api';
import { Award, BookOpen } from 'lucide-react';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar: string;
  quizzesTaken?: number;
  averageScore?: number;
  topSubjects?: string[];
}

export default function UserProfile() {
  const { userId } = useParams();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const checkToken = async () => {
      const token = localStorage.getItem('access_token');
      const refreshToken = localStorage.getItem('refresh_token');
  
      if (!token && refreshToken) {
        try {
          const response = await auth.refreshToken(refreshToken);
          localStorage.setItem('access_token', response.data.access_token);
          localStorage.setItem('refresh_token', response.data.refresh_token);
          console.log('✅ Token refreshed');
        } catch (err) {
          console.error('❌ Failed to refresh token', err);
          console.log('❌ Token expired, clearing localStorage');
          localStorage.clear();
          navigate('/login');
        }
      }
    };
    checkToken();
  }, [navigate]);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await users.getUserById(userId!);
        // Fetch stats for this user
        let quizzesTaken, averageScore, topSubjects;
        try {
          const statsRes = await userStatsApi.getUserStats(userId!);
          quizzesTaken = statsRes.data.total_quiz;
          averageScore = statsRes.data.best_score;
          topSubjects = statsRes.data.top_subjects || [];
        } catch {}
        setProfile({
          id: res.data.id,
          name: res.data.name,
          email: res.data.email,
          avatar: res.data.avatar_url || `https://ui-avatars.com/api/?name=${res.data.name.replace(' ', '+')}`,
          quizzesTaken,
          averageScore,
          topSubjects,
        });
      } catch (err: any) {
        setError('Failed to load user profile.');
      } finally {
        setLoading(false);
      }
    };
    if (userId) fetchProfile();
  }, [userId]);

  if (loading) return <div className="text-center py-20">Loading profile...</div>;
  if (error || !profile) return <div className="text-center py-20 text-red-600">{error || 'User not found.'}</div>;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white rounded-xl shadow-lg overflow-hidden p-6 sm:p-8">
        <div className="flex items-center space-x-6">
          <img src={profile.avatar} alt={profile.name} className="h-24 w-24 rounded-full" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{profile.name}</h1>
            <p className="text-gray-500">{profile.email}</p>
          </div>
        </div>
        {/* Stats */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-indigo-50 p-4 rounded-lg">
            <div className="flex items-center">
              <Award className="h-6 w-6 text-indigo-600" />
              <span className="ml-2 text-sm font-medium text-indigo-600">Best Score</span>
            </div>
            <p className="mt-2 text-2xl font-semibold text-gray-900">{profile.averageScore ?? '--'}%</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center">
              <BookOpen className="h-6 w-6 text-green-600" />
              <span className="ml-2 text-sm font-medium text-green-600">Quizzes Taken</span>
            </div>
            <p className="mt-2 text-2xl font-semibold text-gray-900">{profile.quizzesTaken ?? '--'}</p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="flex items-center">
              <Award className="h-6 w-6 text-purple-600" />
              <span className="ml-2 text-sm font-medium text-purple-600">Top Subjects</span>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {profile.topSubjects && profile.topSubjects.length > 0 ? (
                profile.topSubjects.map((subject) => (
                  <span key={subject} className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                    {subject}
                  </span>
                ))
              ) : (
                <span className="text-gray-400">--</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 