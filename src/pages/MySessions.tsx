"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { auth, quiz } from "../utils/api"
import { Eye } from "lucide-react"

interface QuizSession {
  id: string
  prompt: string
  topic: string | null
  difficulty: string | null
  company: string | null
  num_questions: number
  started_at: string
  submitted_at: string | null
  score: number
}

interface JoinedSession {
  id: string
  title: string
  quiz_session_id: string
  parent_hosted_session_id: string
  is_live: boolean
  joined_at: string
  submitted_at?: string | null
  expires_at?: string
}

export default function MySessions() {
  const [sessions, setSessions] = useState<QuizSession[]>([])
  const [joinedSessions, setJoinedSessions] = useState<JoinedSession[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"general sessions" | "resume sessions" | "joined sessions">("general sessions")
  const navigate = useNavigate()
  

  const fetchSessions = async () => {
    setLoading(true)
    setError(null)

    try {
      const token = localStorage.getItem("access_token")
      const refresh_token = localStorage.getItem("refresh_token")
      if (!token) {
        if (refresh_token) {
          const response = await auth.refreshToken(refresh_token)
          localStorage.setItem("access_token", response.data.access_token)
          localStorage.setItem("refresh_token", response.data.refresh_token)
        }

        return
      }

      const response = await quiz.showSessions()
      setSessions(response.data)
    } catch (err: any) {
      console.error("Error fetching sessions:", err)

      if (err.response?.status === 401) {
        localStorage.removeItem("access_token")
        navigate("/login", { replace: true })
      } else {
        setError("Failed to load sessions. Please try again.")
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSessions()
  }, [navigate])

  // Function to check if a session should be removed
  const shouldRemoveSession = (session: JoinedSession): boolean => {
    // Check if session has expired (if expires_at is set)
    if (session.expires_at) {
      const now = new Date();
      const expiresAt = new Date(session.expires_at);
      if (now > expiresAt) return true;
    }

    // Check if session was submitted
    if (session.submitted_at) return true;

    return false;
  };

  // Function to update session status
  const updateSessionStatus = async (session: JoinedSession) => {
    try {
      // First check the participant's quiz session
      const participantResponse = await quiz.getSession(session.quiz_session_id);
      const participantData = participantResponse.data;

      // If participant has submitted, remove the session
      if (participantData.submitted_at) {
        const updatedSessions = joinedSessions.filter(s => s.id !== session.id);
        setJoinedSessions(updatedSessions);
        localStorage.setItem('joined_sessions', JSON.stringify(updatedSessions));
        return;
      }

      // Then check the parent hosted session
      const hostedResponse = await quiz.getHostedSession(session.parent_hosted_session_id);
      const hostedData = hostedResponse.data;

      // If hosted session is no longer active, remove it
      if (!hostedData.is_active) {
        const updatedSessions = joinedSessions.filter(s => s.id !== session.id);
        setJoinedSessions(updatedSessions);
        localStorage.setItem('joined_sessions', JSON.stringify(updatedSessions));
        return;
      }

      // Update session status
      const updatedSession = {
        ...session,
        is_live: !!hostedData.started_at,
        submitted_at: participantData.submitted_at,
        expires_at: hostedData.expires_at
      };

      const updatedSessions = joinedSessions.map(s => 
        s.id === session.id ? updatedSession : s
      );
      setJoinedSessions(updatedSessions);
      localStorage.setItem('joined_sessions', JSON.stringify(updatedSessions));
    } catch (err) {
      console.error('Error updating session status:', err);
      // If session not found or error, remove it
      const updatedSessions = joinedSessions.filter(s => s.id !== session.id);
      setJoinedSessions(updatedSessions);
      localStorage.setItem('joined_sessions', JSON.stringify(updatedSessions));
    }
  };

  // Load and validate joined sessions from localStorage
  useEffect(() => {
    const loadJoinedSessions = async () => {
      const savedSessions = localStorage.getItem('joined_sessions')
      if (savedSessions) {
        try {
          const parsed = JSON.parse(savedSessions) as JoinedSession[];
          // Filter out sessions that should be removed
          const validSessions = parsed.filter(session => !shouldRemoveSession(session));
          
          if (validSessions.length !== parsed.length) {
            // If some sessions were removed, update localStorage
            localStorage.setItem('joined_sessions', JSON.stringify(validSessions));
          }
          
          setJoinedSessions(validSessions);
        } catch (e) {
          console.error('Error parsing joined sessions:', e)
          localStorage.removeItem('joined_sessions')
        }
      }
    }
    loadJoinedSessions()
  }, [])

  // Periodically update session status
  useEffect(() => {
    if (activeTab === 'joined sessions' && joinedSessions.length > 0) {
      const updateInterval = setInterval(() => {
        joinedSessions.forEach(session => {
          updateSessionStatus(session);
        });
      }, 30000); // Update every 30 seconds

      return () => clearInterval(updateInterval);
    }
  }, [activeTab, joinedSessions]);

  const handleStartSession = async (sessionId: string) => {
    try {
      const response = await quiz.startSession(sessionId)
      if (response.data) {
        navigate(`/quiz?session_id=${sessionId}`, { state: { preloadedSession: response.data } })
      }
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to start session. Please try again.")
    }
  }

  const handleViewResults = (sessionId: string) => {
    navigate(`/quiz-result/${sessionId}`)
  }

  const handleViewQuestions = (sessionId: string) => {
    navigate(`/quiz?session_id=${sessionId}&readonly=true`)
  }

  const handleJoinSession = async (session: JoinedSession) => {
    try {
      // First check if the participant has already submitted
      const participantResponse = await quiz.getSession(session.quiz_session_id);
      if (participantResponse.data.submitted_at) {
        // If submitted, remove from joined sessions and show error
        const updatedSessions = joinedSessions.filter(s => s.id !== session.id);
        setJoinedSessions(updatedSessions);
        localStorage.setItem('joined_sessions', JSON.stringify(updatedSessions));
        setError('This session has already been completed.');
        return;
      }

      // Then check the parent hosted session
      const hostedResponse = await quiz.getHostedSession(session.parent_hosted_session_id);
      if (!hostedResponse.data.is_active) {
        // If hosted session is not active, remove from joined sessions and show error
        const updatedSessions = joinedSessions.filter(s => s.id !== session.id);
        setJoinedSessions(updatedSessions);
        localStorage.setItem('joined_sessions', JSON.stringify(updatedSessions));
        setError('This session is no longer active.');
        return;
      }

      // Update session status before joining
      await updateSessionStatus(session);
      
      // If session was removed during update, don't proceed
      if (!joinedSessions.some(s => s.id === session.id)) {
        return;
      }

      navigate(`/hosted-quiz?session_id=${session.quiz_session_id}&parent_hosted_session_id=${session.parent_hosted_session_id}`, {
        state: {
          isHostedSession: true,
          isSessionLive: session.is_live,
          hosted_session_id: session.parent_hosted_session_id
        }
      });
    } catch (err) {
      console.error('Error joining session:', err);
      setError('Failed to join session. Please try again.');
    }
  };

  // Filter sessions based on active tab
  const filteredSessions = sessions.filter((session) => {
    if (activeTab === "general sessions") return session.topic !== "Resume"
    if (activeTab === "resume sessions") return session.topic === "Resume"
    return false
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex justify-center px-4 py-8">
      <div className="max-w-4xl w-full">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900"></h1>
        </div>

        {/* Centered Tab Navigation */}
        <div className="flex gap-4 mb-8 border-b border-gray-200 justify-center">
          <button
            className={`py-2 px-4 font-medium text-sm focus:outline-none ${
              activeTab === 'general sessions'
                ? 'border-b-2 border-indigo-600 text-indigo-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab("general sessions")}
          >
            General Sessions
          </button>
          <button
            className={`py-2 px-4 font-medium text-sm focus:outline-none ${
              activeTab === 'resume sessions'
                ? 'border-b-2 border-indigo-600 text-indigo-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab("resume sessions")}
          >
            Resume Sessions
          </button>
          <button
            className={`py-2 px-4 font-medium text-sm focus:outline-none ${
              activeTab === 'joined sessions'
                ? 'border-b-2 border-indigo-600 text-indigo-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab("joined sessions")}
          >
            Joined Sessions
          </button>
        </div>

        {error && <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg">{error}</div>}

        <div className="space-y-4">
          {activeTab === "joined sessions" ? (
            joinedSessions.length > 0 ? (
              joinedSessions.map((session) => (
                <div key={session.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">{session.title}</h3>
                      <div className="mt-2 space-y-1">
                        <p className="text-sm text-gray-500">
                          Joined: {new Date(session.joined_at).toLocaleString()}
                        </p>
                        <p className="text-sm text-gray-500">
                          Status: {session.is_live ? (
                            <span className="text-green-600">Live</span>
                          ) : (
                            <span className="text-yellow-600">Waiting</span>
                          )}
                        </p>
                        {session.submitted_at && (
                          <p className="text-sm text-red-600">
                            Completed: {new Date(session.submitted_at).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {!session.submitted_at && (
                        <button
                          onClick={() => handleJoinSession(session)}
                          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm"
                        >
                          {session.is_live ? "Enter Session" : "Enter Session"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <h3 className="text-lg font-medium text-gray-900 mb-2">No joined sessions found</h3>
                <p className="text-gray-500 mb-4">Join a session to see it here!</p>
              </div>
            )
          ) : filteredSessions.length > 0 ? (
            filteredSessions.map((session) => (
              <div key={session.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">
                      {session.topic || "Untitled"} {session.difficulty} Quiz
                    </h3>

                    <div className="mt-2 space-y-1">
                      <p className="text-sm text-gray-500">Questions: {session.num_questions}</p>
                      <p className="text-sm text-gray-500">
                        Started: {session.started_at ? new Date(session.started_at).toLocaleString() : "Not started"}
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
                        {/* You can add additional buttons or elements here if needed */}
                        <button
                          onClick={() => handleStartSession(session.id)}
                          className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm"
                        >
                          {session.started_at ? "start" : "Start "}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <h3 className="text-lg font-medium text-gray-900 mb-2">No {activeTab} sessions found</h3>
              <p className="text-gray-500 mb-4">
                {activeTab === "general sessions"
                  ? "Create your first quiz to get started!"
                  : "Upload a resume to generate a quiz!"}
              </p>
              <button
                onClick={() => navigate(activeTab === "general sessions" ? "/quiz/create" : "/quiz/resume")}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                {activeTab === "general sessions" ? "Create New Quiz" : "Upload Resume"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}