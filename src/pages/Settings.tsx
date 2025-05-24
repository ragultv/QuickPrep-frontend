import { useState } from 'react';
import UpdateProfile from './UpdateProfile';
import ChangePassword from './ChangePassword';
import { LogOut, User, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Settings() {
  const [activeForm, setActiveForm] = useState<'profile' | 'password' | null>(null);
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    // Dispatch storage event to notify other components
    window.dispatchEvent(new Event('storage'));
    navigate('/login', { replace: true });
  };

  return (
    <div className="max-w-2xl mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Settings</h1>
      <div className="flex flex-col gap-4 mb-8">
        <button
          className="flex items-center px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          onClick={() => setActiveForm('profile')}
        >
          <User className="h-5 w-5 mr-2" /> Update Profile
        </button>
        <button
          className="flex items-center px-4 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-800"
          onClick={() => setActiveForm('password')}
        >
          <Lock className="h-5 w-5 mr-2" /> Change Password
        </button>
        <button
          onClick={handleLogout}
          className="flex items-center px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          <LogOut className="h-5 w-5 mr-2" /> Logout
        </button>
      </div>
      <div className="bg-white rounded-xl shadow-lg overflow-hidden p-6 sm:p-8">
        {activeForm === 'profile' && <UpdateProfile />}
        {activeForm === 'password' && <ChangePassword />}
      </div>
    </div>
  );
} 