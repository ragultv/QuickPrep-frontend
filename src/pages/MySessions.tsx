import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { quiz } from '../utils/api';
import { Eye } from 'lucide-react';

interface QuizSession {
  id: string;
  prompt: string;
  topic: string | null;
  difficulty: string | null;
  company: string | null;
  num_questions: number;
  started_at: string;
  submitted_at: string | null;
  score: number;
}

export default function MySessions() {
  const [sessions, setSessions] = useState<QuizSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'general' | 'resume'>('general');
  const navigate = useNavigate();

  const fetchSessions = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem("access_token");
      if (!token) {
        setError("You must be logged in to view your sessions.");
        setLoading(false);
        return;
      }

      const response = await quiz.showSessions();
      setSessions(response.data);
    } catch (err: any) {
      console.error("Error fetching sessions:", err);
      
      if (err.response?.status === 401) {
        localStorage.removeItem("access_token");
        navigate("/login", { replace: true });
      } else {
        setError("Failed to load sessions. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [navigate]);

  const handleStartSession = async (sessionId: string) => {
    try {
      const response = await quiz.startSession(sessionId);
      if (response.data) {
        navigate(`/quiz?session_id=${sessionId}`, { state: { preloadedSession: response.data } });
      }
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to start session. Please try again.');
    }
  };

  const handleViewResults = (sessionId: string) => {
    navigate(`/quiz-result/${sessionId}`);
  };

  const handleViewQuestions = (sessionId: string) => {
    navigate(`/quiz?session_id=${sessionId}&readonly=true`);
  };

  // Filter sessions based on active tab
  const filteredSessions = sessions.filter(session => {
    return activeTab === 'general' ? session.topic !== 'Resume' : session.topic === 'Resume';
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">My Sessions</h1>
      </div>

      <div className="flex gap-4 mb-8">
        <button
          className={`px-4 py-2 rounded-lg font-medium ${activeTab === 'general' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'}`}
          onClick={() => setActiveTab('general')}
        >
          General
        </button>
        <button
          className={`px-4 py-2 rounded-lg font-medium ${activeTab === 'resume' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'}`}
          onClick={() => setActiveTab('resume')}
        >
          Resume
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {filteredSessions.length > 0 ? (
          filteredSessions.map((session) => (
            <div
              key={session.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    {session.topic || "Untitled"} {session.difficulty} Quiz
                  </h3>
                  
                  <div className="mt-2 space-y-1">
                    <p className="text-sm text-gray-500">
                      Questions: {session.num_questions}
                    </p>
                    <p className="text-sm text-gray-500">
                      Started: {session.started_at ? new Date(session.started_at).toLocaleString() : 'Not started'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {session.submitted_at ? (
                    <>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          session.score >= 90
                            ? "bg-green-100 text-green-800"
                            : session.score >= 80
                            ? "bg-blue-100 text-blue-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {session.score}%
                      </span>
                      <button
                        onClick={() => handleViewResults(session.id)}
                        className="px-3 py-1 text-sm text-indigo-600 hover:text-indigo-700"
                      >
                        View Results
                      </button>
                    </>
                  ) : (
                    <>
                      {session.topic !== 'Resume' && (
                        <button
                         
                        >
                          
                        </button>
                      )}
                      <button
                        onClick={() => handleStartSession(session.id)}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                      >
                        {session.started_at ? 'Resume Quiz' : 'Start Quiz'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No {activeTab} sessions found
            </h3>
            <p className="text-gray-500 mb-4">
              {activeTab === 'general' 
                ? 'Create your first quiz to get started!'
                : 'Upload a resume to generate a quiz!'}
            </p>
            <button
              onClick={() => navigate(activeTab === 'general' ? '/quiz/create' : '/quiz/resume')}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              {activeTab === 'general' ? 'Create New Quiz' : 'Upload Resume'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
} 