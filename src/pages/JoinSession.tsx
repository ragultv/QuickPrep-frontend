import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { quiz } from '../utils/api';
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
        // Store the session ID in localStorage for redirect after login
        localStorage.setItem("redirect_after_login", `/join-session/${sessionId}`);
        navigate("/login", { replace: true });
        return;
      }

      try {
        const response = await quiz.getHostedSession(sessionId);
        console.log('Hosted session response on load:', response.data); 
        if (!response.data) {
          setError('No session data received');
          setLoading(false);
          return;
        }
        setSession(response.data);
        setIsSessionLive(!!response.data.started_at);
        
        // If user is already a participant, redirect immediately
        if (response.data.current_user_participant_quiz_session_id) {
          console.log("User is already a participant, redirecting with participant_quiz_session_id:", response.data.current_user_participant_quiz_session_id);
          setIsParticipant(true);
          redirectToQuiz(response.data.current_user_participant_quiz_session_id, response.data.id, !!response.data.started_at);
          return; // Exit early to prevent further processing
        }

        // If not found in current_user_participant_quiz_session_id, check participants list
        if (response.data.quiz_session?.id) {
          try {
            const details = await quiz.getSessionDetails(sessionId);
            const currentUserId = localStorage.getItem('user_id');
            const isAlreadyListedAsParticipant = details.data.participants.some((p: any) => p.id === currentUserId);
            
            if (isAlreadyListedAsParticipant) {
              console.warn("User is listed as participant, but specific participant_quiz_session_id not found on initial load. Redirecting with general quiz_session_id.");
              setIsParticipant(true);
              redirectToQuiz(response.data.quiz_session.id, response.data.id, !!response.data.started_at);
              return; // Exit early to prevent further processing
            }
          } catch (participantErr) {
            console.error("Error checking participant status via getSessionDetails:", participantErr);
          }
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
    console.log(`Redirecting to /hosted-quiz?session_id=${participantQuizSessionId} (participant's quiz) for hosted_session_id: ${hostedSessionId}`);
    navigate(`/hosted-quiz?session_id=${participantQuizSessionId}`, {
      state: {
        isHostedSession: true,
        isSessionLive: sessionIsLive,
        hosted_session_id: hostedSessionId 
      }
    });
  };

  useEffect(() => {
    let intervalId: NodeJS.Timeout | undefined;
    if (isParticipant && !isSessionLive && session && session.is_active) {
      intervalId = setInterval(async () => {
        try {
          const response = await quiz.getHostedSession(sessionId!);
          if (response.data.started_at) {
            setSession(response.data); 
            setIsSessionLive(true);
            if (intervalId) clearInterval(intervalId);
            const finalParticipantQuizId = session.current_user_participant_quiz_session_id || session.quiz_session?.id;
            if (finalParticipantQuizId) {
                 redirectToQuiz(finalParticipantQuizId, session.id, true);
            } else {
                console.error("Cannot redirect on session live: participant quiz ID not found.");
                setError("Your quiz session ID could not be found when the session went live.");
            }
          }
        } catch (pollingError: any) {
          console.error("Error polling session status:", pollingError);
          if (pollingError.response?.status === 404 || (pollingError.response?.data && !pollingError.response.data.is_active)) {
            if (intervalId) clearInterval(intervalId);
          }
        }
      }, 5000);
    }
    return () => { if (intervalId) clearInterval(intervalId); };
  }, [sessionId, isParticipant, isSessionLive, session]);

  useEffect(() => {
    if (isParticipant && session && !loading) {
        const participantQuizIdToUse = session.current_user_participant_quiz_session_id || session.quiz_session?.id;
        if (participantQuizIdToUse) {
            console.log("useEffect [isParticipant, session, loading] redirecting with quiz_id:", participantQuizIdToUse);
            redirectToQuiz(participantQuizIdToUse, session.id, !!session.started_at);
        } else {
            console.warn("useEffect [isParticipant, session, loading]: participantQuizIdToUse is null, cannot redirect");
        }
    }
  }, [isParticipant, session, loading]);

  const handleJoinSession = async () => {
    if (!sessionId) {
      setError('Invalid session ID');
      return;
    }
    try {
      setJoining(true);
      const response = await quiz.joinHostedSession(sessionId) as { data: JoinSessionResponse };
      const joinData = response.data;

      if (!joinData || !joinData.participant_quiz_session_id) {
        setError('Failed to get participant session details after joining. Please try again.');
        setJoining(false);
        return;
      }

      setIsParticipant(true);
      setIsSessionLive(joinData.is_live);
      redirectToQuiz(joinData.participant_quiz_session_id, sessionId, joinData.is_live);

    } catch (err: any) {
      // If already joined, fetch session and redirect
      if (err.response?.data?.detail?.toLowerCase().includes('already joined')) {
        try {
          // Wait a moment before retrying (optional, helps with race conditions)
          await new Promise(res => setTimeout(res, 500));
          const currentSessionState = await quiz.getHostedSession(sessionId);
          if (currentSessionState.data?.current_user_participant_quiz_session_id) {
            redirectToQuiz(currentSessionState.data.current_user_participant_quiz_session_id, sessionId, !!currentSessionState.data.started_at);
          } else if (currentSessionState.data?.quiz_session?.id) {
            redirectToQuiz(currentSessionState.data.quiz_session.id, sessionId, !!currentSessionState.data.started_at);
          } else {
            setError("Could not retrieve your session details though you've already joined. Please refresh or contact support.");
          }
        } catch (fetchErr: any) {
          setError(fetchErr.response?.data?.detail || 'Failed to load your existing session details.');
        }
      } else {
        // For other errors, allow retry
        setError(err.response?.data?.detail || 'Failed to join session. Please try again.');
      }
    } finally {
      setJoining(false);
    }
  };

  const handleStartSession = () => {
    const participantQuizId = session?.current_user_participant_quiz_session_id || session?.quiz_session?.id;
    if (participantQuizId && session) {
       console.log("handleStartSession: Navigating with participantQuizId:", participantQuizId);
      navigate(`/hosted-quiz?session_id=${participantQuizId}`, {
        state: {
          isHostedSession: true,
          isSessionLive: true,
          hosted_session_id: session.id
        }
      });
    } else {
        console.error("handleStartSession: participantQuizId or session is missing.");
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
            {isParticipant ? (
              <div className="text-center">
                {isSessionLive ? (
                  <>
                    <div className="flex items-center justify-center space-x-4 mb-4">
                      <Play className="w-8 h-8 text-green-600" />
                      <p className="text-lg text-gray-700">Session is live! You can start now.</p>
                    </div>
                    <button
                      onClick={handleStartSession}
                      className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Start Session
                    </button>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-center space-x-4 mb-4">
                      <Clock className="w-8 h-8 text-indigo-600 animate-pulse" />
                      <p className="text-lg text-gray-700">Waiting for host to start the session...</p>
                    </div>
                    <button
                      disabled={true}
                      className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg opacity-50 cursor-not-allowed"
                    >
                      You Already Joined
                    </button>
                  </>
                )}
              </div>
            ) : (
              <>
                <button
                  onClick={handleJoinSession}
                  disabled={joining || !session.is_active || session.current_participants >= session.total_spots}
                  className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  {joining ? 'Joining...' : 'Join Session'}
                </button>
                {!session.is_active && (
                  <p className="mt-2 text-sm text-red-600">This session is no longer active</p>
                )}
                {session.current_participants >= session.total_spots && (
                  <p className="mt-2 text-sm text-red-600">This session is full</p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}