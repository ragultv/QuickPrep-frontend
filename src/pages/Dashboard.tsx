import React, { useEffect, useState } from 'react';
import { BookOpen, Trophy, Clock } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

interface RecentSession {
  session_id: string;
  score: number;
  topic: string;
  num_questions: number;
  time_taken: string;
  difficulty: string;
}
interface UserStats {
  total_quiz: number;
  best_score: number;
  average_time: string;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [recentSessions, setRecentSessions] = useState<RecentSession[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [userName, setUserName] = useState('');

  // ── 1) BLOCK BACK BUTTON ───────────────────────────────────────────────
  useEffect(() => {
    // Push an extra history entry for the current URL
    const blockBack = () => window.history.pushState(null, '', window.location.href);

    // Immediately push one entry…
    blockBack();
    // …and trap any popstate (Back/Forward)
    window.addEventListener('popstate', blockBack);

    return () => {
      window.removeEventListener('popstate', blockBack);
    };
  }, []);

  // ── 2) FETCH USER & STATS ──────────────────────────────────────────────
  useEffect(() => {
    const controller = new AbortController();
    let isMounted = true;

    const fetchDashboard = async () => {
      const token = localStorage.getItem('access_token');
      if (!token) {
        navigate('/login', { replace: true });
        return;
      }

      try {
        setIsLoading(true);
        
        // First get the user info
        const userRes = await axios.get('http://localhost:8000/users/me', {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        
        if (isMounted) {
          setUserName(userRes.data.name);
        }
        
        // Then try to get sessions and stats separately to handle errors better
        try {
          const sessionRes = await axios.get('http://localhost:8000/user_stats/recent_sessions', {
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
          });
          
          if (isMounted) {
            // Ensure we always set an array, even if the API returns null or undefined
            setRecentSessions(Array.isArray(sessionRes.data) ? sessionRes.data : []);
          }
        } catch (sessionErr: any) {
          console.log('Failed to load sessions:', sessionErr);
          // Don't set an error, just use empty array
          if (isMounted) {
            setRecentSessions([]);
          }
        }
        
        try {
          const statsRes = await axios.get<UserStats>('http://localhost:8000/user_stats/my_stats', {
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
          });
          
          if (isMounted) {
            setUserStats(statsRes.data || { total_quiz: 0, best_score: 0, average_time: '0m' });
          }
        } catch (statsErr: any) {
          console.log('Failed to load stats:', statsErr);
          // Use default stats
          if (isMounted) {
            setUserStats({ total_quiz: 0, best_score: 0, average_time: '0m' });
          }
        }
      } catch (err: any) {
        if (!isMounted) return;
        if (err.response?.status === 401) {
          localStorage.removeItem('access_token');
          navigate('/login', { replace: true });
        } else {
          setError(err.response?.data?.detail || 'Failed to load dashboard.');
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchDashboard();
    return () => {
      controller.abort();
      isMounted = false;
    };
  }, [navigate]);

  // ── 3) RENDER ──────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-red-500">{error}</p>
        <button onClick={() => window.location.reload()} className="ml-4 px-4 py-2 bg-indigo-600 text-white rounded">
          Retry
        </button>
      </div>
    );
  }
  
  const handleGenerateQuiz = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      await axios.get('http://localhost:8000/users/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      navigate('/quiz/create');
    } catch (error: any) {
      if (error.response?.status === 401) {
        localStorage.removeItem('access_token');
        navigate('/login');
      }
    }
  };

  // Make sure we have default values for userStats to avoid null reference errors
  const stats = userStats || { total_quiz: 0, best_score: 0, average_time: '0m' };

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Welcome back, {userName}!</h1>
            <p className="mt-1 text-gray-500">Ready to test your knowledge today?</p>
          </div>
          <button
            type="button"
            onClick={handleGenerateQuiz}
            className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <BookOpen className="h-5 w-5 mr-2" />
            Generate New Quiz
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center">
            <Trophy className="h-8 w-8 text-yellow-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Best Score</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.best_score}%</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center">
            <BookOpen className="h-8 w-8 text-blue-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Quizzes</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.total_quiz}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center">
            <Clock className="h-8 w-8 text-green-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Average Time</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.average_time}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Quizzes (Dynamic) */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Quizzes</h2>
        <div className="space-y-4">
          {recentSessions && recentSessions.length > 0 ? (
            recentSessions.map((session) => (
              <Link
                to={`/quiz-result/${session.session_id}`}
                key={session.session_id}
                className="block"
              >
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h3 className="font-medium text-gray-900">{session.topic + ' ' + session.difficulty + ' ' + 'Test'}</h3>
                    <p className="text-sm text-gray-500">Time Taken: {session.time_taken}</p>
                    <p className="text-sm text-gray-500">Questions: {session.num_questions}</p>
                  </div>
                  <div className="flex items-center">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        session.score >= 90
                          ? 'bg-green-100 text-green-800'
                          : session.score >= 80
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {session.score}%
                    </span>
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center p-8 bg-gray-50 rounded-lg">
              <p className="text-gray-500 text-center mb-4">You haven't taken any quizzes yet. Generate your first quiz to see your results here!</p>
              <button
                onClick={handleGenerateQuiz}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Generate Your First Quiz
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
