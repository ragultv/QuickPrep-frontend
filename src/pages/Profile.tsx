import React, { useEffect, useState } from 'react';
import { Mail, Lock, Award, BookOpen, LogOut } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import type { UserProfile } from '../types';
import { users } from '../utils/api';

export default function Profile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
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
      } catch (err) {
        console.error(err);
        navigate('/login');
      }
    };
    fetchProfile();
  }, [navigate]);

  const handleLogout = () => {
  localStorage.clear();
  toast.success('Logged out successfully');
  setTimeout(() => {
    navigate('/login', { replace: true });
  }, 500); // short delay for toast to show
};

  if (!profile) return <div className="text-center py-20">Loading profile...</div>;

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
              <span className="ml-2 text-sm font-medium text-indigo-600">Average Score</span>
            </div>
            <p className="mt-2 text-2xl font-semibold text-gray-900">{profile.averageScore}%</p>
          </div>

          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center">
              <BookOpen className="h-6 w-6 text-green-600" />
              <span className="ml-2 text-sm font-medium text-green-600">Quizzes Taken</span>
            </div>
            <p className="mt-2 text-2xl font-semibold text-gray-900">{profile.quizzesTaken}</p>
          </div>

          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="flex items-center">
              <Award className="h-6 w-6 text-purple-600" />
              <span className="ml-2 text-sm font-medium text-purple-600">Top Subject</span>
            </div>
            <p className="mt-2 text-2xl font-semibold text-gray-900">{profile.topSubjects[0]}</p>
          </div>
        </div>

        {/* Top Subjects */}
        <div className="mt-8">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Top Subjects</h2>
          <div className="flex flex-wrap gap-2">
            {profile.topSubjects.map((subject) => (
              <span
                key={subject}
                className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800"
              >
                {subject}
              </span>
            ))}
          </div>
        </div>

        {/* Buttons */}
        <div className="mt-8 space-y-4">
          <Link 
            to="/update-profile"
            className="inline-block w-full sm:w-auto flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            <Mail className="h-5 w-5 mr-2" />
            Update Profile
          </Link>
          <Link
            to="/change-password"
            className="inline-block w-full sm:w-auto flex items-center justify-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            <Lock className="h-5 w-5 mr-2" />
            Change Password
          </Link>
          <button
            onClick={handleLogout}
            className="w-full sm:w-auto flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            <LogOut className="h-5 w-5 mr-2" />
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
