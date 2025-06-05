import { LogOut, User, Lock, Settings as SettingsIcon } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';

export default function Settings() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    window.dispatchEvent(new Event('storage'));
    navigate('/login', { replace: true });
  };

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-3">
          <SettingsIcon className="h-8 w-8 text-gray-700" />
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link
          to="/update-profile"
          className="group relative bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-indigo-700 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
          <div className="relative p-6 flex items-center space-x-4">
            <div className="bg-indigo-100 rounded-lg p-3 group-hover:bg-white/10 transition-colors duration-200">
              <User className="h-6 w-6 text-indigo-600 group-hover:text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 group-hover:text-white">Update Profile</h2>
              <p className="text-gray-500 group-hover:text-white/80">Manage your personal information</p>
            </div>
          </div>
        </Link>

        <Link
          to="/change-password"
          className="group relative bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-gray-700 to-gray-800 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
          <div className="relative p-6 flex items-center space-x-4">
            <div className="bg-gray-100 rounded-lg p-3 group-hover:bg-white/10 transition-colors duration-200">
              <Lock className="h-6 w-6 text-gray-700 group-hover:text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 group-hover:text-white">Change Password</h2>
              <p className="text-gray-500 group-hover:text-white/80">Update your security credentials</p>
            </div>
          </div>
        </Link>

        <button
          onClick={handleLogout}
          className="group relative bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden col-span-1 md:col-span-2"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-red-600 to-red-700 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
          <div className="relative p-6 flex items-center space-x-4">
            <div className="bg-red-100 rounded-lg p-3 group-hover:bg-white/10 transition-colors duration-200">
              <LogOut className="h-6 w-6 text-red-600 group-hover:text-white" />
            </div>
            <div className="text-left">
              <h2 className="text-xl font-semibold text-gray-900 group-hover:text-white">Logout</h2>
              <p className="text-gray-500 group-hover:text-white/80">Sign out of your account</p>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}