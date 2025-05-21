import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { quiz } from '../utils/api';
import { Trophy, Users, Calendar, User, Clock, Award } from 'lucide-react';

interface Participant {
  id: string;
  name: string;
  score: number;
  position: number;
  started_at: string | null;
  submitted_at: string | null;
  avatar: string;
}

interface SessionDetails {
  id: string;
  title: string;
  host: {
    id: string;
    name: string;
  };
  total_spots: number;
  current_participants: number;
  is_active: boolean;
  participants: Participant[];
}

export default function SessionDetails() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState<SessionDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'leaderboard' | 'participants'>('details');

  useEffect(() => {
    const fetchSessionDetails = async () => {
      try {
        const response = await quiz.getSessionDetails(sessionId!);
        setSession(response.data);
      } catch (err: any) {
        setError('Failed to load session details.');
      } finally {
        setLoading(false);
      }
    };

    fetchSessionDetails();
  }, [sessionId]);

  const handleViewProfile = (userId: string) => {
    navigate(`/profile/${userId}`);
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return 'Not started';
    return new Date(dateString).toLocaleString();
  };

  const getMedalEmoji = (position: number) => {
    switch (position) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-red-600">{error || 'Session not found'}</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{session.title}</h1>
        <div className="flex gap-4">
          <button
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === 'details' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'
            }`}
            onClick={() => setActiveTab('details')}
          >
            Details
          </button>
          <button
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === 'leaderboard' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'
            }`}
            onClick={() => setActiveTab('leaderboard')}
          >
            Leaderboard
          </button>
          <button
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === 'participants' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'
            }`}
            onClick={() => setActiveTab('participants')}
          >
            Participants
          </button>
        </div>
      </div>

      {activeTab === 'details' && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-gray-500" />
              <span className="text-gray-700">Host: {session.host.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-gray-500" />
              <span className="text-gray-700">
                Participants: {session.current_participants} / {session.total_spots}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${session.is_active ? 'bg-green-500' : 'bg-gray-500'}`} />
              <span className="text-gray-700">{session.is_active ? 'Active' : 'Completed'}</span>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'leaderboard' && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Trophy className="w-6 h-6 text-yellow-500" />
            Leaderboard
          </h2>
          <div className="space-y-4">
            {session.participants
              .filter(p => p.submitted_at)
              .sort((a, b) => a.position - b.position)
              .map((participant) => (
                <div
                  key={participant.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 flex items-center justify-center font-bold text-gray-700">
                      {getMedalEmoji(participant.position) || `#${participant.position}`}
                    </div>
                    <img
                      src={participant.avatar}
                      alt={participant.name}
                      className="w-10 h-10 rounded-full"
                    />
                    <div>
                      <div className="font-medium">{participant.name}</div>
                      <div className="text-sm text-gray-500 space-y-1">
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          Started: {formatDateTime(participant.started_at)}
                        </div>
                        <div className="flex items-center gap-1">
                          <Award className="w-4 h-4" />
                          Completed: {formatDateTime(participant.submitted_at)}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-lg font-semibold">{participant.score}%</div>
                </div>
              ))}
          </div>
        </div>
      )}

      {activeTab === 'participants' && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-500" />
            Participants
          </h2>
          <div className="space-y-4">
            {session.participants.map(participant => (
              <div
                key={participant.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer"
                onClick={() => handleViewProfile(participant.id)}
              >
                <div className="flex items-center gap-4">
                  <img
                    src={participant.avatar}
                    alt={participant.name}
                    className="w-10 h-10 rounded-full"
                  />
                  <div>
                    <div className="font-medium">{participant.name}</div>
                    <div className="text-sm text-gray-500 space-y-1">
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        Started: {formatDateTime(participant.started_at)}
                      </div>
                      {participant.submitted_at && (
                        <div className="flex items-center gap-1">
                          <Award className="w-4 h-4" />
                          Completed: {formatDateTime(participant.submitted_at)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                {participant.submitted_at && (
                  <div className="text-lg font-semibold">{participant.score}%</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 