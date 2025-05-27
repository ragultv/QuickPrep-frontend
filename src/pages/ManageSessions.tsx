import { useState, useEffect } from 'react';
import {auth, quiz } from '../utils/api';
import { useNavigate } from 'react-router-dom';
import { Users, Copy, Check, Eye } from 'lucide-react';

interface HostedSession {
  id: string;
  quiz_session_id: string;
  title: string;
  total_spots: number;
  current_participants: number;
  is_active: boolean;
  total_duration: number | null;
  ended_at: string | null;
  started_at?: string;
}

export default function ManageSessions() {
  const navigate = useNavigate();
  const [hostedSessions, setHostedSessions] = useState<HostedSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending');
  const [copiedSessionId, setCopiedSessionId] = useState<string | null>(null);

  useEffect(() => {

    const fetchData = async () => {
      setLoading(true);
      setError(null);
    
      const token = localStorage.getItem("access_token");
      const refresh_token=localStorage.getItem("refresh_token");
      if (!token) {
        if(refresh_token){
        const response=await auth.refreshToken(refresh_token);
        localStorage.setItem("access_token",response.data.access_token);
        localStorage.setItem("refresh_token",response.data.refresh_token);
        }
        
        return;
      }
      try {
        const response = await quiz.getHostedSessions();
        setHostedSessions(response.data);
      } catch (err: any) {
        setError('Failed to load sessions.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleViewQuestions = (quizsession_id: string) => {
    navigate(`/hosted-quiz?session_id=${quizsession_id}&readonly=true`)
  }

  const handleViewSessionDetails = (sessionId: string) => {
    navigate(`/session-details/${sessionId}`);
  };

  const filteredSessions = hostedSessions.filter(session => {
    if (activeTab === 'pending') {
      return session.is_active;
    } else {
      return !session.is_active;
    }
  });

  const handleStartQuiz = async (hostedQuizSessionId: string, hostedSessionId: string) => {
    try {
      await quiz.startHostedSession(hostedQuizSessionId);
      navigate(`/session-details/${hostedSessionId}`);
    } catch (err: any) {
      console.error("Error starting hosted quiz:", err);
      alert(err.response?.data?.detail || 'Failed to start hosted quiz. Please try again.');
    }
  };

  const handleCopyLink = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const sessionUrl = `${window.location.origin}/join-session/${sessionId}`;
    try {
      await navigator.clipboard.writeText(sessionUrl);
      setCopiedSessionId(sessionId);
      setTimeout(() => setCopiedSessionId(null), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
      alert('Failed to copy link. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex justify-center px-4 py-8">
      <div className="max-w-4xl w-full">
        <h1 className="text-3xl font-bold mb-6 text-center"></h1>

        <div className="flex gap-4 mb-8 border-b border-gray-200 justify-center">
          <button
            className={`py-2 px-4 font-medium text-sm focus:outline-none ${
              activeTab === 'pending'
                ? 'border-b-2 border-indigo-600 text-indigo-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('pending')}
          >
            Pending Sessions
          </button>
          <button
            className={`py-2 px-4 font-medium text-sm focus:outline-none ${
              activeTab === 'completed'
                ? 'border-b-2 border-indigo-600 text-indigo-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('completed')}
          >
            Completed Sessions
          </button>
        </div>

        {loading ? (
          <div className="text-center">Loading...</div>
        ) : error ? (
          <div className="text-red-600 text-center">{error}</div>
        ) : (
          <div className="space-y-4">
            {filteredSessions.length === 0 ? (
              <div className="text-center">No {activeTab} sessions found.</div>
            ) : (
              filteredSessions.map(session => (
                <div 
                  // key={session.id} 
                   className="bg-white rounded-lg shadow-sm border p-4 hover:shadow-md transition-shadow cursor-pointer"
                  // onClick={() => handleViewSessionDetails(session.id)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold text-lg">
                        <button
                          onClick={() => handleViewSessionDetails(session.id)}
                          className="text-indigo-600 hover:underline">
                          {session.title}
                        </button>
                      </div>
                      <div className="text-sm text-gray-500 mt-2">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          <span>Spots: {session.current_participants} / {session.total_spots}</span>
                        </div>
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {session.is_active ? 'Active' : 'Completed'}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {session.is_active && !session.started_at && (
                        <>
                          <button
                            onClick={(e) => handleCopyLink(session.id, e)}
                            className="p-2 text-gray-500 hover:text-indigo-600 transition-colors rounded-full hover:bg-gray-100"
                            title="Copy join link"
                          >
                            {copiedSessionId === session.id ? (
                              <Check className="w-5 h-5 text-green-500" />
                            ) : (
                              <Copy className="w-5 h-5" />
                            )}
                          </button>
                          
                          <button
                            onClick={() => handleViewQuestions(session.id)}
                            className="p-2 text-gray-500 hover:text-indigo-600 transition-colors rounded-full hover:bg-gray-100"
                            title="View questions"
                          >
                            <Eye className="w-5 h-5" />
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartQuiz(session.quiz_session_id, session.id);
                            }}
                            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm"
                          >
                            Start Quiz
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}