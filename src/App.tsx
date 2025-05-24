import * as React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import CreateQuiz from './pages/CreateQuiz';
import History from './pages/History';
import Quiz from './pages/Quiz';
import QuizResults from './pages/QuizResults';
import Profile from './pages/Profile';
import LoginForm from './pages/LoginForm';
import RegisterForm from './pages/RegisterForm';
import QuizResultPage from './pages/QuizResultPage';
import UpdateProfile from './pages/UpdateProfile';
import ChangePassword from './pages/ChangePassword';
import CreateQuizResume from './pages/createQuizResume';
import MySessions from './pages/MySessions';
import JoinSession from './pages/JoinSession';
import ManageSessions from './pages/ManageSessions';
import SessionDetails from './pages/SessionDetails';
import UserProfile from './pages/UserProfile';
import Settings from './pages/Settings';
import HostedQuiz from './pages/HostedQuiz';

import { auth } from './utils/api';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [isLoading, setIsLoading] = React.useState(true);
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);

  React.useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('access_token');
      const refreshToken = localStorage.getItem('refresh_token');

      if (token) {
        setIsAuthenticated(true);
        setIsLoading(false);
        return;
      }

      if (!token && refreshToken) {
        try {
          const response = await auth.refreshToken(refreshToken);
          localStorage.setItem('access_token', response.data.access_token);
          localStorage.setItem('refresh_token', response.data.refresh_token);
          console.log('Refreshed token:', response.data);
          window.dispatchEvent(new Event('storage'));
          setIsAuthenticated(true);
        } catch (err) {
          console.error('Failed to refresh token:', err);
          localStorage.removeItem('refresh_token');
          setIsAuthenticated(false);
        }
      } else {
        setIsAuthenticated(false);
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function App() {
  const [isLoggedIn, setIsLoggedIn] = React.useState(() => {
    return !!localStorage.getItem('access_token');
  });

  // Listen for storage changes to keep isLoggedIn in sync
  React.useEffect(() => {
    const handleStorageChange = () => {
      setIsLoggedIn(!!localStorage.getItem('access_token'));
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route
          path="/login"
          element={
            localStorage.getItem('access_token') 
              ? <Navigate to="/" replace /> 
              : <LoginForm />
          }
        />
        <Route
          path="/register"
          element={isLoggedIn ? <Navigate to="/" replace /> : <RegisterForm />}
        />     
        
        {/* Protected Routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout>
                <Dashboard />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/quiz/create"
          element={
            <ProtectedRoute>
              <Layout>
                <CreateQuiz />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/quiz"
          element={
            <ProtectedRoute>
              <Quiz />
            </ProtectedRoute>
          }
        />
        <Route
          path="/hosted-quiz"
          element={
            <ProtectedRoute>
              <HostedQuiz />
            </ProtectedRoute>
          }
        />
        <Route
          path="/quiz/results"
          element={
            <ProtectedRoute>
              <Layout>
                <QuizResults />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Layout>
                <Profile onLogout={() => setIsLoggedIn(false)} />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/update-profile"
          element={
            <ProtectedRoute>
              <Layout>
                <UpdateProfile />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/change-password"
          element={
            <ProtectedRoute>
              <Layout>
                <ChangePassword />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/history"
          element={
            <ProtectedRoute>
              <Layout>
                <History />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-sessions"
          element={
            <ProtectedRoute>
              <Layout>
                <MySessions />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/create-quiz-resume"
          element={
            <ProtectedRoute>
              <Layout>
                <CreateQuizResume />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route path="/quiz-result/:sessionId" element={<QuizResultPage />} />
        <Route path="/join-session/:sessionId" element={<JoinSession />} />
        <Route
          path="/manage-sessions"
          element={
            <ProtectedRoute>
              <Layout>
                <ManageSessions />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/session-details/:sessionId"
          element={
            <ProtectedRoute>
              <Layout>
                <SessionDetails />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile/:userId"
          element={
            <ProtectedRoute>
              <Layout>
                <UserProfile />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Layout>
                <Settings />
              </Layout>
            </ProtectedRoute>
          }
        />


        {/* Catch all route - redirect to login if not authenticated, dashboard if authenticated */}
        <Route
          path="*"
          element={isLoggedIn ? <Navigate to="/" replace /> : <Navigate to="/login" replace />}
        />
      </Routes>
    </Router>
  );
}

export default App;
