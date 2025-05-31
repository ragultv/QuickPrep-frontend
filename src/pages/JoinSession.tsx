import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { auth, quiz } from '../utils/api';
import { Users, Clock, Play } from 'lucide-react';

interface HostedSession {
  id: string;
  title: string;
  total_spots: number;
  current_participants: number;
  is_active: boolean;
  started_at: string | null;
  quiz_session: {
    id: string;
    topic: string;
    difficulty: string;
    num_questions: number;
  } | null;
  current_user_participant_quiz_session_id?: string;
}

interface JoinSessionResponse {
  participant_quiz_session_id: string;
  hosted_session_id: string;
  is_live: boolean;
  message?: string;
}

interface JoinedSession {
  id: string;
  title: string;
  quiz_session_id: string;
  parent_hosted_session_id: string;
  is_live: boolean;
  joined_at: string;
}

export default function JoinSession() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<HostedSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [isParticipant, setIsParticipant] = useState(false);
  const [isSessionLive, setIsSessionLive] = useState(false);

  useEffect(() => {
    const fetchSession = async () => {
      if (!sessionId) {
        setError('Invalid session ID');
        setLoading(false);
        return;
      }

      const token = localStorage.getItem("access_token");
      if (!token) {
        const refresh_token=localStorage.getItem("refresh_token");
        if(refresh_token){
          const response=await auth.refreshToken(refresh_token);
          localStorage.setItem("access_token",response.data.access_token);
          localStorage.setItem("refresh_token",response.data.refresh_token);
        }
        localStorage.setItem("redirect_after_login", `/join-session/${sessionId}`);
        navigate("/login", { replace: true });
        return;
      }

      try {
        const response = await quiz.getHostedSession(sessionId);
        if (!response.data) {
          setError('No session data received');
          setLoading(false);
          return;
        }
        setSession(response.data);
        setIsSessionLive(!!response.data.started_at);
        
        // Check if user is already a participant but don't auto-redirect
        if (response.data.current_user_participant_quiz_session_id) {
          setIsParticipant(true);
        }

      } catch (err: any) {
        console.error('Error fetching session:', err);
        setError(err.response?.data?.detail || 'Failed to load session. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    fetchSession();
  }, [sessionId]);

  const redirectToQuiz = (participantQuizSessionId: string, hostedSessionId: string, sessionIsLive: boolean) => {
    if (!participantQuizSessionId) {
      console.error('Attempted to redirect with missing participantQuizSessionId');
      setError('Participant quiz session ID is missing. Cannot redirect.');
      return;
    }
    // Save to localStorage for refresh recovery, now including parent_hosted_session_id
    localStorage.setItem('last_hosted_quiz_redirect', JSON.stringify({
      participantQuizSessionId,
      parentHostedSessionId: hostedSessionId, // Store the parent ID
      sessionIsLive
    }));
    // Include parent_hosted_session_id in the URL
    navigate(`/hosted-quiz?session_id=${participantQuizSessionId}&parent_hosted_session_id=${hostedSessionId}`, {
      state: {
        // location.state can still be used for non-critical initial values if desired,
        // but essential IDs must be in the URL for refresh.
        isHostedSession: true,
        isSessionLive: sessionIsLive,
        hosted_session_id: hostedSessionId 
      }
    });
  };

  const handleJoinSession = async () => {
    if (!sessionId) {
      setError('Invalid session ID');
      return;
    }
    try {
      setJoining(true);
      
      // If user is already a participant, just redirect them
      if (isParticipant && session?.current_user_participant_quiz_session_id) {
        redirectToQuiz(
          session.current_user_participant_quiz_session_id,
          sessionId,
          !!session.started_at
        );
        return;
      }

      // For new participants, join the session
      const response = await quiz.joinHostedSession(sessionId) as { data: JoinSessionResponse };
      const joinData = response.data;

      if (!joinData || !joinData.participant_quiz_session_id) {
        setError('Failed to get participant session details after joining. Please try again.');
        setJoining(false);
        return;
      }

      // Save joined session information
      const joinedSession = {
        id: joinData.participant_quiz_session_id,
        title: session?.title || 'Untitled Session',
        quiz_session_id: joinData.participant_quiz_session_id,
        parent_hosted_session_id: sessionId,
        is_live: joinData.is_live,
        joined_at: new Date().toISOString()
      };

      // Get existing joined sessions
      const existingSessions = localStorage.getItem('joined_sessions');
      let joinedSessions: JoinedSession[] = [];
      if (existingSessions) {
        try {
          joinedSessions = JSON.parse(existingSessions);
        } catch (e) {
          console.error('Error parsing joined sessions:', e);
        }
      }

      // Add new session if it doesn't exist
      if (!joinedSessions.some((s: JoinedSession) => s.id === joinedSession.id)) {
        joinedSessions.push(joinedSession);
        localStorage.setItem('joined_sessions', JSON.stringify(joinedSessions));
      }

      setIsParticipant(true);
      setIsSessionLive(joinData.is_live);
      redirectToQuiz(joinData.participant_quiz_session_id, sessionId, joinData.is_live);

    } catch (err: any) {
      // If already joined, fetch session and redirect
      if (err.response?.data?.detail?.toLowerCase().includes('already joined')) {
        try {
          const currentSessionState = await quiz.getHostedSession(sessionId);
          if (currentSessionState.data?.current_user_participant_quiz_session_id) {
            setIsParticipant(true);
            redirectToQuiz(
              currentSessionState.data.current_user_participant_quiz_session_id,
              sessionId,
              !!currentSessionState.data.started_at
            );
          } else {
            setError("Could not retrieve your session details though you've already joined. Please refresh or contact support.");
          }
        } catch (fetchErr: any) {
          setError(fetchErr.response?.data?.detail || 'Failed to load your existing session details.');
        }
      } else {
        setError(err.response?.data?.detail || 'Failed to join session. Please try again.');
      }
    } finally {
      setJoining(false);
    }
  };

  const handleStartUserHostedSession = async () => {
    if (!sessionId) {
      setError('Invalid session ID');
      return;
    }
    try {
      setJoining(true);
      const response = await quiz.startUserHostedSession(sessionId);
      console.log("handleStartUserHostedSession: response:", response);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to start user hosted session. Please try again.');
    }
  }


  const handleStartSession = async () => {
    const participantQuizId = session?.current_user_participant_quiz_session_id || session?.quiz_session?.id;

    if (!sessionId) {
      setError('Invalid session ID');
      return;
    }

    if (participantQuizId && session) {
      try {
        setJoining(true);
        console.log('Starting user hosted session with participantQuizId:', participantQuizId);
        await quiz.startUserHostedSession(participantQuizId);
        navigate(`/hosted-quiz?session_id=${participantQuizId}`, {
          state: {
            isHostedSession: true,
            isSessionLive: true,
            hosted_session_id: session.id
          }
        });
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Failed to start user hosted session. Please try again.');
      } finally {
        setJoining(false);
      }
    } else {
      setError("Could not determine your quiz session ID to start.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-red-50 text-red-700 p-4 rounded-lg">
          <h2 className="font-semibold mb-2">Error Loading Session</h2>
          <p>{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!session || !session.quiz_session) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Session Not Found</h1>
          <p className="text-gray-600">The session you're looking for doesn't exist or has been removed.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">{session.title}</h1>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Topic</p>
              <p className="font-medium">{session.quiz_session.topic}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Difficulty</p>
              <p className="font-medium">{session.quiz_session.difficulty}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Questions</p>
              <p className="font-medium">{session.quiz_session.num_questions}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Available Spots</p>
              <p className="font-medium flex items-center">
                <Users className="w-4 h-4 mr-1" />
                {session.total_spots - session.current_participants} of {session.total_spots}
              </p>
            </div>
          </div>
          <div className="mt-6">
            {isSessionLive ? (
              <div className="text-center">
                <div className="flex items-center justify-center space-x-4 mb-4">
                  <Play className="w-8 h-8 text-green-600" />
                  <p className="text-lg text-gray-700">Session is live! You can join now.</p>
                </div>
                <button
                  onClick={handleJoinSession}
                  disabled={joining || !session.is_active || session.current_participants >= session.total_spots}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {joining ? 'Joining...' : isParticipant ? 'Enter Session' : 'Join Session'}
                </button>
              </div>
            ) : (
              <div className="text-center">
                <div className="flex items-center justify-center space-x-4 mb-4">

                </div>
                <button
                  onClick={handleJoinSession}
                  disabled={joining || !session.is_active || session.current_participants >= session.total_spots}
                  className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  {joining ? 'Joining...' : isParticipant ? 'Re-enter Session' : 'Join Session'}
                </button>
              </div>
            )}
            {!session.is_active && (
              <p className="mt-2 text-sm text-red-600">This session is no longer active</p>
            )}
            {session.current_participants >= session.total_spots && (
              <p className="mt-2 text-sm text-red-600">This session is full</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}