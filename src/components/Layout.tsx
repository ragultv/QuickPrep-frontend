import React, { useState } from 'react';
import { Layout as LayoutIcon, User, BookOpen, LogOut, BarChart } from 'lucide-react';
import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out`}>
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center space-x-2">
            <LayoutIcon className="h-6 w-6 text-indigo-600" />
            <span className="text-xl font-semibold text-gray-800">QuickPrep</span>
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden text-gray-500 hover:text-gray-700"
          >
            <span className="sr-only">Close sidebar</span>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className="mt-4 px-2">
          <div className="space-y-1">
            <Link
              to="/"
              className={`flex items-center px-4 py-2.5 text-sm font-medium rounded-lg ${
                location.pathname === '/' ? 'text-indigo-600 bg-indigo-50' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <BarChart className="h-5 w-5 mr-3" />
              Dashboard
            </Link>
            <Link
              to="/profile"
              className={`flex items-center px-4 py-2.5 text-sm font-medium rounded-lg ${
                location.pathname === '/profile' ? 'text-indigo-600 bg-indigo-50' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <User className="h-5 w-5 mr-3" />
              Profile
            </Link>
            <Link
              to="/quiz/create"
              className={`flex items-center px-4 py-2.5 text-sm font-medium rounded-lg ${
                location.pathname === '/quiz/create' ? 'text-indigo-600 bg-indigo-50' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <BookOpen className="h-5 w-5 mr-3" />
              Create Quiz
            </Link>
            <Link
              to="/create-quiz-resume"
              className={`flex items-center px-4 py-2.5 text-sm font-medium rounded-lg ${
                location.pathname === '/create-quiz-resume' ? 'text-indigo-600 bg-indigo-50' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <BookOpen className="h-5 w-5 mr-3" />
              Quiz by Resume
            </Link>
            <Link
              to="/history"
              className={`flex items-center px-4 py-2.5 text-sm font-medium rounded-lg ${
                location.pathname === '/history' ? 'text-indigo-600 bg-indigo-50' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <BookOpen className="h-5 w-5 mr-3" />
              History
            </Link>
            
            
          </div>
        </nav>
      </div>

      {/* Main Content */}
      <div className={`lg:pl-64 ${isSidebarOpen ? '' : 'pl-0'}`}>
        {/* Mobile Header */}
        <div className="sticky top-0 z-40 lg:hidden">
          <div className="flex items-center justify-between bg-white px-4 py-2 shadow-sm">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="text-gray-500 hover:text-gray-700"
            >
              <span className="sr-only">Open sidebar</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="flex items-center space-x-2">
              <LayoutIcon className="h-6 w-6 text-indigo-600" />
              <span className="text-xl font-semibold text-gray-800">QuizMaster</span>
            </div>
          </div>
        </div>

        {/* Page Content */}
        <main className="py-8 px-4 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
