import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  User, 
  BookPlus, 
  FileSpreadsheet, 
  History, 
  Calendar, 
  Settings,
  Menu,
  X
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();

  // Route configuration with titles
  const routes = [
    { path: '/dashboard', title: 'Dashboard' },
    { path: '/quiz/create', title: 'Create Quiz' },
    { path: '/create-quiz-resume', title: 'Quiz by Resume' },
    { path: '/my-sessions', title: 'My Sessions' },
    { path: '/manage-sessions', title: 'Manage Sessions' },
    { path: '/history', title: 'History' },
    { path: '/profile', title: 'Profile' },
  ];

  // Get current page title
  const currentRoute = routes.find(route => route.path === location.pathname);
  const pageTitle = currentRoute?.title || 'Dashboard';

  // Close sidebar when route changes
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  // Handle loading state
  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 100);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <div 
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#111827] transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
            <div className="flex items-center group">
              <div className="relative">
                <LayoutDashboard className="h-8 w-8 text-indigo-600 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12" />
                <div className="absolute inset-0 bg-indigo-400 opacity-0 blur-lg group-hover:opacity-30 transition-opacity duration-300 rounded-full"></div>
              </div>
              <span className="ml-3 text-2xl font-bold text-white">
                Quick<span className="text-indigo-600">PREP</span>
              </span>
            </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden text-gray-400 hover:text-white transition-colors duration-200"
          >
            <span className="sr-only">Close sidebar</span>
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="mt-4 px-2">
          <div className="space-y-1">
            <NavLink to="/dashboard" icon={<LayoutDashboard className="h-5 w-5 mr-3" />} label="Dashboard" currentPath={location.pathname} />
            <NavLink to="/quiz/create" icon={<BookPlus className="h-5 w-5 mr-3" />} label="Create Quiz" currentPath={location.pathname} />
            <NavLink to="/create-quiz-resume" icon={<FileSpreadsheet className="h-5 w-5 mr-3" />} label="Quiz by Resume" currentPath={location.pathname} />
            <NavLink to="/my-sessions" icon={<Calendar className="h-5 w-5 mr-3" />} label="My Sessions" currentPath={location.pathname} />
            <NavLink to="/manage-sessions" icon={<Settings className="h-5 w-5 mr-3" />} label="Manage Sessions" currentPath={location.pathname} />
            <NavLink to="/history" icon={<History className="h-5 w-5 mr-3" />} label="History" currentPath={location.pathname} />
          </div>
        </nav>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen lg:pl-64">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-[#111827] shadow-sm">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="lg:hidden text-white hover:text-gray-300 mr-2"
              >
                <span className="sr-only">Open sidebar</span>
                <Menu className="h-6 w-6" />
              </button>
              <h1 className="text-lg font-bold text-white">{pageTitle}</h1>
            </div>
            
            <Link
              to="/profile"
              className="flex items-center px-2 py-2 border-2 border-gray-300 rounded-full bg-white transition-colors duration-200"
            >
              <User className="h-5 w-5 text-indigo-700" />
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1">
          <div className={`transition-opacity duration-200 ${isLoading ? 'opacity-0' : 'opacity-100'}`}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

// NavLink component
interface NavLinkProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  currentPath: string;
}

const NavLink: React.FC<NavLinkProps> = ({ to, icon, label, currentPath }) => {
  const isActive = currentPath === to;
  
  return (
    <Link
      to={to}
      className={`flex items-center px-4 py-2.5 text-sm font-medium rounded-lg transition-colors duration-200 ${
        isActive 
          ? 'text-white bg-indigo-600' 
          : 'text-gray-300 hover:text-white hover:bg-gray-700'
      }`}
    >
      {icon}
      {label}
    </Link>
  );
};

export default Layout;