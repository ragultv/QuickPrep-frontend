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


interface ProtectedRouteProps {
  children: React.ReactNode;
}

function ProtectedRoute({ children }: ProtectedRouteProps) {
  const isLoggedIn = !!localStorage.getItem('access_token');
  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function App() {
  const [isLoggedIn, setIsLoggedIn] = React.useState(() => {
    // Check if user has a valid token in localStorage
    return !!localStorage.getItem('access_token');
  });

  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route
          path="/login"
          element={isLoggedIn ? <Navigate to="/" replace /> : <LoginForm onLogin={() => setIsLoggedIn(true)} />}
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
