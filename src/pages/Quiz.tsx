"use client"

import { useState, useEffect, useRef, Fragment } from "react"
import { useNavigate, useSearchParams, useLocation } from "react-router-dom"
import { ChevronLeft, ChevronRight, Flag, VolumeX, CheckCircle2, ArrowLeft, ArrowRight, Volume2 } from "lucide-react"
import type { Question } from "../types"
import { auth, quiz } from "../utils/api"

export default function Quiz() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [quizSessionId, setQuizSessionId] = useState<string | null>(null)
  const [isFullScreen, setIsFullScreen] = useState(false)
  const [isMobileView, setIsMobileView] = useState(false)
  const isReadonly = searchParams.get("readonly") === "true";
  
  // Refs for the full screen element
  const quizContainerRef = useRef<HTMLDivElement>(null)
  const questionContentRef = useRef<HTMLDivElement>(null)

  // Countdown timer state
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const isTimeExpired = useRef(false)

  // Request cancellation and mount tracking
  const abortControllerRef = useRef(new AbortController())
  const isMountedRef = useRef(false)
  const isSubmittingRef = useRef(false)
  const fullscreenRetryRef = useRef<NodeJS.Timeout | null>(null)

  // Storage keys for persistent state
  const STORAGE_PREFIX = "quiz_state_"
  const getStorageKey = () => {
    // Prefer session_id if present, otherwise use ids
    const sessionId = searchParams.get("session_id");
    if (sessionId) {
      return `${STORAGE_PREFIX}session_${sessionId}`;
    }
    const idParam = searchParams.get("ids");
    if (idParam) {
      return `${STORAGE_PREFIX}${idParam}`;
    }
    return null;
  }

  // Save state to localStorage
  const saveStateToStorage = () => {
    const storageKey = getStorageKey()
    if (isReadonly) {
      return;
    }
    if (!storageKey || !quizSessionId) {
      return;
    }
    if (questions.length === 0) {
      return;
    }

    const stateToSave = {
      quizSessionId,
      currentQuestionIndex,
      selectedAnswers,
      timeRemaining,
      timestamp: Date.now(),
      questions, // Saving the full questions array
    }

    try {
      localStorage.setItem(storageKey, JSON.stringify(stateToSave))
    } catch (error) {
      // Potentially handle quota exceeded error
    }
  }

  // Load state from localStorage
  const loadStateFromStorage = () => {
    const storageKey = getStorageKey()
    if (!storageKey) {
      return null
    }

    const savedStateString = localStorage.getItem(storageKey)
    if (!savedStateString) {
      return null
    }

    try {
      const parsedState = JSON.parse(savedStateString)

      const now = Date.now()
      const savedTime = parsedState.timestamp || 0
      const MAX_AGE = 24 * 60 * 60 * 1000 // 24 hours

      if (now - savedTime > MAX_AGE) {
        localStorage.removeItem(storageKey)
        return null
      }

      if (!parsedState.questions || parsedState.questions.length === 0) {
        localStorage.removeItem(storageKey); // Clean up invalid state
        return null;
      }
      if (!parsedState.selectedAnswers || parsedState.selectedAnswers.length !== parsedState.questions.length) {
        localStorage.removeItem(storageKey); // Clean up inconsistent state
        return null;
      }

      return parsedState
    } catch (err) {
      localStorage.removeItem(storageKey) // Remove corrupted item
      return null
    }
  }

  // Enhanced enterFullScreen with error recovery
  const enterFullScreen = () => {
    const element = quizContainerRef.current
    if (!element) return

    try {
      if (element.requestFullscreen) {
        element.requestFullscreen().catch(error => {
          setTimeout(enterFullScreen, 1000)
        })
      } else if ((element as any).mozRequestFullScreen) {
        (element as any).mozRequestFullScreen()
      } else if ((element as any).webkitRequestFullscreen) {
        (element as any).webkitRequestFullscreen()
      } else if ((element as any).msRequestFullscreen) {
        (element as any).msRequestFullscreen()
      }
    } catch (error) {
      setTimeout(enterFullScreen, 1000)
    }
  }

  const exitFullScreen = () => {
    try {
      if (document.exitFullscreen) {
        document.exitFullscreen()
      } else if ((document as any).mozCancelFullScreen) {
        (document as any).mozCancelFullScreen()
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen()
      } else if ((document as any).msExitFullscreen) {
        (document as any).msExitFullscreen()
      }
    } catch (error) {
    }
  }

  useEffect(() => {
    const checkToken = async () => {
      const token = localStorage.getItem('access_token');
      const refreshToken = localStorage.getItem('refresh_token');
  
      if (!token && refreshToken) {
        try {
          const response = await auth.refreshToken(refreshToken);
          localStorage.setItem('access_token', response.data.access_token);
          localStorage.setItem('refresh_token', response.data.refresh_token);
        } catch (err) {
          console.log('❌ Token expired, clearing localStorage');
          localStorage.clear();
          navigate('/login');
        }
      }
    };
    checkToken();
  }, [navigate]);

  // Handle fullscreen change events with improved re-entry
  useEffect(() => {
    const handleFullScreenChange = () => {
      const isCurrentlyFullscreen = 
        document.fullscreenElement !== null || 
        (document as any).webkitFullscreenElement !== null || 
        (document as any).mozFullScreenElement !== null || 
        (document as any).msFullscreenElement !== null;
      
      setIsFullScreen(isCurrentlyFullscreen);
      
      // If user exited fullscreen manually and quiz is still in progress, re-enter fullscreen
      if (!isCurrentlyFullscreen && !isSubmittingRef.current && questions.length > 0) {
        // Clear any existing retry timer
        if (fullscreenRetryRef.current) {
          clearTimeout(fullscreenRetryRef.current);
        }
        
        // Set a small delay before re-entering fullscreen to avoid browser conflicts
        fullscreenRetryRef.current = setTimeout(() => {
          if (isMountedRef.current && !isSubmittingRef.current) {
            enterFullScreen();
          }
          fullscreenRetryRef.current = null;
        }, 300); // Reduced delay for faster re-entry
      }
    }

    document.addEventListener('fullscreenchange', handleFullScreenChange)
    document.addEventListener('webkitfullscreenchange', handleFullScreenChange)
    document.addEventListener('mozfullscreenchange', handleFullScreenChange)
    document.addEventListener('MSFullscreenChange', handleFullScreenChange)

    return () => {
      document.removeEventListener('fullscreenchange', handleFullScreenChange)
      document.removeEventListener('webkitfullscreenchange', handleFullScreenChange)
      document.removeEventListener('mozfullscreenchange', handleFullScreenChange)
      document.removeEventListener('MSFullscreenChange', handleFullScreenChange)
      
      if (fullscreenRetryRef.current) {
        clearTimeout(fullscreenRetryRef.current);
      }
    }
  }, [questions])

  // Automatically enter full screen when quiz loads
  useEffect(() => {
    if (isReadonly) return;
    if (!isLoading && questions.length > 0 && !isFullScreen) {
      // Small delay to ensure component is fully rendered
      const timer = setTimeout(() => {
        enterFullScreen()
      }, 500)
      
      return () => clearTimeout(timer)
    }
  }, [isLoading, questions, isFullScreen, isReadonly])

  // Save state whenever relevant parts change
  useEffect(() => {
    if (isReadonly || isLoading) { // Don't save if readonly or initial data is still loading
      return;
    }
    if (quizSessionId && questions.length > 0) {
      saveStateToStorage()
    }
  }, [quizSessionId, currentQuestionIndex, selectedAnswers, timeRemaining, questions, isReadonly, isLoading])

  useEffect(() => {
    const abortController = new AbortController()
    abortControllerRef.current = abortController
    isMountedRef.current = true

    const fetchQuestionsAndCreateSession = async () => {
      const questionIdsFromParams = searchParams.get("ids")?.split(",")
      
      // Try to load saved state first
      const savedState = loadStateFromStorage();

      if (savedState) {
        safeStateUpdate(() => {
          setQuizSessionId(savedState.quizSessionId)
          setQuestions(savedState.questions)
          setCurrentQuestionIndex(savedState.currentQuestionIndex)
          setSelectedAnswers(savedState.selectedAnswers)
          setTimeRemaining(savedState.timeRemaining)
          setIsLoading(false)
        })
       
        return // IMPORTANT: Return here to prevent fetching new session
      } 
      // If no saved state, or it's invalid, proceed with fetching
      const sessionIdParam = searchParams.get("session_id")
      const preloadedSession = location.state?.preloadedSession;
      
      if (!sessionIdParam && !questionIdsFromParams) {
        safeStateUpdate(() => setError("No questions found. Please check the URL parameters."))
        setIsLoading(false); // Stop loading indicator
        return
      }

      const token = localStorage.getItem("access_token")
      if (!token) {
        safeStateUpdate(() => {
          setError("Authentication required. Please log in.")
          navigate("/login")
        })
        return
      }

      try {
        let questionsResponse;
        let sessionResponse;

        if (preloadedSession) {
          sessionResponse = { data: preloadedSession }; // Mimic API response structure
          const questionIdsForPreloaded = sessionResponse.data.questions.map((q: { question_id: string }) => q.question_id);
          questionsResponse = await quiz.getQuestions(questionIdsForPreloaded.join(","));
        } else if (sessionIdParam) {
          // Get existing session if not preloaded (e.g., resuming, direct navigation)
          sessionResponse = await quiz.getSession(sessionIdParam)
          const isReadonly = searchParams.get("readonly") === "true";
          if (!sessionResponse.data.started_at && !isReadonly) {
            setError("Session not started. Please start the session from My Sessions.");
            setIsLoading(false);
            return;
          }
          // Get questions for the session
          const questionIdsForSession = sessionResponse.data.questions.map((q: { question_id: string }) => q.question_id)
          questionsResponse = await quiz.getQuestions(questionIdsForSession.join(","))
        } else {
          // Create new session
          questionsResponse = await quiz.getQuestions(questionIdsFromParams!.join(","))
          sessionResponse = await quiz.createSession({
            question_ids: questionIdsFromParams!,
            prompt: searchParams.get("prompt") || "",
            topic: searchParams.get("topic") || "",
            difficulty: searchParams.get("difficulty") || "",
            company: searchParams.get("company") || "",
          })
        }

        if (!isMountedRef.current) return

        // Calculate time remaining based on started_at and total_duration
        const startedAt = sessionResponse.data.started_at ? new Date(sessionResponse.data.started_at) : null;
        const totalDuration = sessionResponse.data.total_duration * 60; // minutes to seconds, no rounding
        let timeLeft = null;
        if (startedAt && totalDuration) {
          const now = new Date();
          const elapsed = Math.floor((now.getTime() - startedAt.getTime()) / 1000);
          timeLeft = Math.max(totalDuration - elapsed, 0);
        }

        safeStateUpdate(() => {
          setQuizSessionId(sessionResponse.data.id)
          setQuestions(questionsResponse.data)
          setSelectedAnswers(new Array(questionsResponse.data.length).fill(-1))
          setSessionStartedAt(startedAt)
          setSessionDuration(totalDuration)
          setTimeRemaining(timeLeft)
        })
      } catch (err: any) {
        if (abortController.signal.aborted) {
          return
        }
        handleApiError(err)
      } finally {
        safeStateUpdate(() => setIsLoading(false))
        
      }
    }

    fetchQuestionsAndCreateSession()

    return () => {
      isMountedRef.current = false
      abortController.abort()
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [searchParams, navigate, location.state])

  // Timer effect
  useEffect(() => {
    if (timeRemaining === null) return

    if (timeRemaining <= 0) {
      if (!isSubmittingRef.current) {
        isTimeExpired.current = true
        handleSubmit()
      }
      return;
    }

    timerRef.current = setInterval(() => {
      safeStateUpdate(() => {
        setTimeRemaining((prev) => {
          if (prev === null || prev <= 0) {
            if (timerRef.current) {
              clearInterval(timerRef.current)
            }
            // Auto-submit when time runs out
            if (!isSubmittingRef.current && prev === 0) {
              isTimeExpired.current = true
              handleSubmit()
            }
            return 0
          }
          return prev - 1
        })
      })
    }, 1000)

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [timeRemaining])

  // Helper function: only update state if component is still mounted
  const safeStateUpdate = (update: () => void) => {
    if (isMountedRef.current) update()
  }

  // Format time remaining into MM:SS
  const formatTimeRemaining = () => {
    if (timeRemaining === null) return "--:--"
    const minutes = Math.floor(timeRemaining / 60)
    const seconds = timeRemaining % 60
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
  }

  // Error handling for API calls
  const handleApiError = (err: any) => {
    if (!isMountedRef.current) return
    if (err.response?.status === 401) {
      safeStateUpdate(() => {
        setError("Session expired. Please log in again.")
        navigate("/login")
      })
    } else if (err.response?.data?.detail) {
      safeStateUpdate(() => setError(err.response.data.detail))
    } else {
      safeStateUpdate(() => setError("Failed to load questions. Please try again."))
    }
  }

  const handleAnswerSelect = (index: number) => {
    const newAnswers = [...selectedAnswers]
    newAnswers[currentQuestionIndex] = index
    setSelectedAnswers(newAnswers)
  }

  const handlePrevious = () => {
    setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))
  }

  const handleNext = () => {
    setCurrentQuestionIndex((prev) => Math.min(questions.length - 1, prev + 1))
  }

  const handleSubmit = async () => {
    if (isSubmittingRef.current || !quizSessionId) return;

    // Check for unanswered questions
    const unansweredQuestions = selectedAnswers.filter(answer => answer === -1).length;
    if (unansweredQuestions > 0 && !isTimeExpired.current) {
      const confirmSubmit = window.confirm(
        `You have ${unansweredQuestions} unanswered question(s). Are you sure you want to submit?`
      );
      if (!confirmSubmit) return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);

    // Stop the timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    // Exit fullscreen mode if active
    if (isFullScreen) {
      exitFullScreen();
    }

    try {
      // Create answers payload, handling unanswered questions
      const answersPayload = questions.map((question, index) => {
        // If this question wasn't answered, use a default value or marker
        const selectedOption =
          selectedAnswers[index] === -1
            ? "" // Empty string for unanswered questions
            : String.fromCharCode(97 + selectedAnswers[index]); // Convert index to letter

        return {
          question_id: question.id,
          selected_option: selectedOption,
        }
      });

      const response = await quiz.submitAnswers({
        quiz_session_id: quizSessionId,
        answers: answersPayload,
      });

      // Clear saved state after successful submission
      const storageKey = getStorageKey();
      if (storageKey) {
        localStorage.removeItem(storageKey);
      }

      navigate("/quiz/results", {
        state: {
          questions,
          userAnswers: selectedAnswers,
          score: response.data.score,
          correctAnswers: response.data.correct_answers,
          totalQuestions: response.data.total_questions,
          timeExpired: isTimeExpired.current,
        },
        replace: true
      });
    } catch (err: any) {
      if (err.name === "CanceledError" || err.name === "AbortError") return;
      handleApiError(err);
    } finally {
      safeStateUpdate(() => {
        isSubmittingRef.current = false;
        setIsSubmitting(false);
      });
    }
  };

  const isFirstQuestion = currentQuestionIndex === 0
  const isLastQuestion = currentQuestionIndex === questions.length - 1

  // Function to handle clicking on a question number to navigate directly to that question
  const handleQuestionNavigation = (index: number) => {
    setCurrentQuestionIndex(index)
  }

  // Add navigation prevention
  useEffect(() => {
    if (isReadonly) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isSubmittingRef.current && !isLoading && questions.length > 0) {
        // Cancel the event
        e.preventDefault();
        // Chrome requires returnValue to be set
        e.returnValue = '';
        // Message to be displayed
        return 'You are in the middle of a quiz. Are you sure you want to leave?';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isLoading, questions, isReadonly]);

  // Handle back button
  useEffect(() => {
    if (isReadonly) return;
    const handlePopState = () => {
      if (!isSubmittingRef.current && !isLoading && questions.length > 0) {
        // Prevent navigation
        window.history.pushState(null, '', window.location.pathname + window.location.search);
        
        // Show warning
        const leaveConfirmed = window.confirm('You are in the middle of a quiz. Are you sure you want to leave this page?');
        
        if (leaveConfirmed) {
          // If confirmed, navigate away
          if (isFullScreen) {
            exitFullScreen();
          }
          navigate('/dashboard');
        }
      }
    };

    // Push current state to prevent initial back
    window.history.pushState(null, '', window.location.pathname + window.location.search);
    
    window.addEventListener('popstate', handlePopState);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isLoading, questions, navigate, isFullScreen, isReadonly]);

  // Check for mobile view
  useEffect(() => {
    const checkMobileView = () => {
      setIsMobileView(window.innerWidth < 1024) // Changed to 1024px to match lg breakpoint
    }
    
    checkMobileView()
    window.addEventListener('resize', checkMobileView)
    
    return () => {
      window.removeEventListener('resize', checkMobileView)
    }
  }, [])

  const [sessionStartedAt, setSessionStartedAt] = useState<Date | null>(null);
  const [sessionDuration, setSessionDuration] = useState<number | null>(null);

  // Hosted session logic
  const sessionIdRaw = searchParams.get("session_id");
  const sessionId = sessionIdRaw ?? '';
  const isHostedSession = location.state?.isHostedSession || false;
  const [isSessionLive, setIsSessionLive] = useState(location.state?.isSessionLive || false);
  const [waitingForHost, setWaitingForHost] = useState(isHostedSession && !location.state?.isSessionLive);
  const [hasStartedHostedQuiz, setHasStartedHostedQuiz] = useState(() => {
    if (!isHostedSession || !sessionId) return false;
    return !!localStorage.getItem(getHostedQuizStartedKey(sessionId));
  });

  // New function to get hosted quiz started key
  const getHostedQuizStartedKey = (sessionId: string) => {
    return `${STORAGE_PREFIX}hosted_quiz_started_${sessionId}`;
  };

  // Poll for session live status if hosted session and not live
  useEffect(() => {
    let poll: NodeJS.Timeout | null = null;
    if (isHostedSession && !isSessionLive) {
      poll = setInterval(async () => {
        try {
          const res = await quiz.getHostedSessionIsLive(sessionId);
          if (res.data.already_started) {
            setIsSessionLive(true);
            const started = !!localStorage.getItem(getHostedQuizStartedKey(sessionId));
            setHasStartedHostedQuiz(started);
            if (poll) clearInterval(poll);
          }
        } catch (e) {
          // Optionally handle error
        }
      }, 4000);
    }
    return () => {
      if (poll) clearInterval(poll);
    };
  }, [isHostedSession, isSessionLive, sessionId]);

  // Auto start the session if live and not started by user
  useEffect(() => {
    if (isHostedSession && isSessionLive && !hasStartedHostedQuiz) {
      setHasStartedHostedQuiz(true);
      if (isHostedSession && sessionId) {
        localStorage.setItem(getHostedQuizStartedKey(sessionId), "1");
      }
    }
  }, [isHostedSession, isSessionLive, hasStartedHostedQuiz, sessionId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading quiz...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full mx-4">
          <div className="text-center">
            <div className="text-red-500 text-4xl mb-4">⚠️</div>
            <h2 className="text-xl font-semibold text-slate-800 mb-2">Error</h2>
            <p className="text-slate-600 mb-4">{error}</p>
            <button 
              onClick={() => navigate('/')} 
              className="bg-sky-600 hover:bg-sky-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              Go Home
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Timer display logic
  const timerDisplay = formatTimeRemaining();

  // Mobile Question Navigator Logic
  const getMobileNavigatorIndices = () => {
    if (questions.length <= 3) {
      return questions.map((_, i) => i);
    }
    if (currentQuestionIndex === 0) {
      return [0, 1, 2];
    }
    if (currentQuestionIndex === questions.length - 1) {
      return [questions.length - 3, questions.length - 2, questions.length - 1];
    }
    return [currentQuestionIndex - 1, currentQuestionIndex, currentQuestionIndex + 1];
  };

  const mobileNavigatorIndices = getMobileNavigatorIndices();

  return (
    <div ref={quizContainerRef} className="bg-slate-100 text-slate-800" style={{ fontFamily: "'Poppins', sans-serif" }}>
      <div className="min-h-screen flex flex-col">
        {/* Header with Timer - Only show on desktop */}
        {!isMobileView && !isReadonly && timeRemaining !== null && (
          <header className="bg-white shadow-md sticky top-0 z-50">
            <div className="container mx-auto px-4 py-3 flex justify-between items-center">
              <h1 className="text-xl font-semibold text-sky-600">Quiz In Progress</h1>
              <div className="text-lg font-semibold text-slate-700">
                Time Remaining: <span className={`font-bold ${timeRemaining <= 60 ? 'text-red-500' : 'text-sky-600'}`}>{timerDisplay}</span>
              </div>
            </div>
          </header>
        )}

        <main className="flex-grow container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Question Navigator - Left Side (Desktop) */}
            {!isMobileView && (
              <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-lg">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold">Question Navigator</h2>
                  <span className="text-sm text-slate-500">{currentQuestionIndex + 1}-{questions.length}</span>
                </div>
                
                {/* Legend */}
                <div className="flex items-center space-x-4 mb-4 text-sm">
                  <div className="flex items-center">
                    <span className="w-3 h-3 bg-green-500 rounded-full mr-1.5"></span> Answered
                  </div>
                  <div className="flex items-center">
                    <span className="w-3 h-3 bg-amber-400 rounded-full mr-1.5"></span> Current
                  </div>
                  <div className="flex items-center">
                    <span className="w-3 h-3 bg-slate-300 rounded-full mr-1.5"></span> Not Answered
                  </div>
                </div>

                {/* Question Grid */}
                <div className="grid grid-cols-5 sm:grid-cols-7 md:grid-cols-8 lg:grid-cols-5 gap-2 max-h-[calc(100vh-380px)] overflow-y-auto pr-2">
                  {questions.map((_, index) => {
                    let bgColor = 'bg-slate-200 hover:bg-slate-300';
                    let textColor = 'text-slate-700';
                    
                    if (index === currentQuestionIndex) { // Current
                      bgColor = 'bg-amber-400 hover:bg-amber-500';
                      textColor = 'text-white';
                    } else if (selectedAnswers[index] !== -1) { // Answered
                      bgColor = 'bg-green-500 hover:bg-green-600';
                      textColor = 'text-white';
                    }

                    return (
                      <button
                        key={index}
                        onClick={() => handleQuestionNavigation(index)}
                        className={`${bgColor} ${textColor} text-sm font-medium py-2 px-1 rounded-md flex items-center justify-center transition-colors`}
                        disabled={isReadonly}
                      >
                        {index + 1}
                      </button>
                    )
                  })}
                </div>

                {/* Submit Button */}
                {!isReadonly && (
                  <div className="mt-6">
                    <button 
                      onClick={handleSubmit}
                      disabled={isSubmitting}
                      className="w-full bg-sky-600 hover:bg-sky-700 disabled:bg-slate-400 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
                    >
                      <CheckCircle2 className="mr-2 h-5 w-5" />
                      {isSubmitting ? 'Submitting...' : 'Submit Quiz'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Question Content - Right Side or Full Width on Mobile */}
            <div className={`${isMobileView ? 'col-span-1' : 'lg:col-span-2'} bg-white p-6 sm:p-8 rounded-xl shadow-lg`}>
              {/* Mobile Question Navigator - Top of Content */}
              {isMobileView && (
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <h2 className="text-lg font-semibold">Questions</h2>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-slate-500">{currentQuestionIndex + 1} / {questions.length}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <button
                      onClick={handlePrevious}
                      disabled={isFirstQuestion || isSubmitting}
                      className="p-2 rounded-md hover:bg-slate-100 disabled:opacity-50"
                    >
                      <ChevronLeft className="h-6 w-6 text-slate-600" />
                    </button>
                    <div className="flex items-center space-x-2">
                      {mobileNavigatorIndices.map((index) => {
                        let bgColor = 'bg-slate-200 hover:bg-slate-300';
                        let textColor = 'text-slate-700';
                        if (index === currentQuestionIndex) {
                          bgColor = 'bg-amber-400 hover:bg-amber-500';
                          textColor = 'text-white';
                        } else if (selectedAnswers[index] !== -1) {
                          bgColor = 'bg-green-500 hover:bg-green-600';
                          textColor = 'text-white';
                        }
                        return (
                          <button
                            key={`mobile-nav-${index}`}
                            onClick={() => !isReadonly && handleQuestionNavigation(index)}
                            className={`${bgColor} ${textColor} text-sm font-medium w-10 h-10 rounded-md flex items-center justify-center transition-colors`}
                            disabled={isReadonly}
                          >
                            {index + 1}
                          </button>
                        );
                      })}
                    </div>
                    <button
                      onClick={handleNext}
                      disabled={isLastQuestion || isSubmitting}
                      className="p-2 rounded-md hover:bg-slate-100 disabled:opacity-50"
                    >
                      <ChevronRight className="h-6 w-6 text-slate-600" />
                    </button>
                  </div>
                </div>
              )}
              {/* Question Header */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <p className="text-sm text-slate-500">Question {currentQuestionIndex + 1} of {questions.length}</p>
                </div>
                
                {/* Progress Bar */}
                <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden mb-4">
                  <div 
                    className="h-full bg-sky-500 transition-all duration-300 ease-in-out"
                    style={{ width: `${((currentQuestionIndex + 1) / (questions.length || 1)) * 100}%` }}
                  ></div>
                </div>

                {/* Question Text - smaller font on mobile */}
                <h3 ref={questionContentRef} className={`font-semibold text-slate-800 leading-tight ${isMobileView ? 'text-base' : 'text-xl sm:text-2xl'}`}>
                  {questions[currentQuestionIndex]?.question}
                </h3>
              </div>

              {/* Answer Options */}
              <div className="space-y-4">
                {questions[currentQuestionIndex]?.options.map((option, i) => (
                  <label
                    key={i}
                    className={`block p-4 border rounded-lg cursor-pointer transition-all group
                      ${selectedAnswers[currentQuestionIndex] === i
                        ? "bg-sky-100 border-sky-500"
                        : "border-slate-300 hover:border-sky-500 hover:bg-sky-50"
                      } ${isReadonly ? 'cursor-not-allowed' : ''}`}
                    onClick={() => !isReadonly && handleAnswerSelect(i)}
                  >
                    <input
                      type="radio"
                      name={`question-${currentQuestionIndex}`}
                      className="sr-only"
                      value={String.fromCharCode(97 + i)}
                      checked={selectedAnswers[currentQuestionIndex] === i}
                      onChange={() => !isReadonly && handleAnswerSelect(i)}
                      disabled={isReadonly}
                    />
                    <div className="flex items-center">
                      <span className={`w-6 h-6 border-2 rounded-full flex items-center justify-center mr-3 flex-shrink-0
                        ${selectedAnswers[currentQuestionIndex] === i
                          ? "border-sky-500"
                          : "border-slate-400 group-hover:border-sky-500"
                        }`}
                      >
                        {selectedAnswers[currentQuestionIndex] === i && (
                          <span className="w-3 h-3 bg-sky-500 rounded-full"></span>
                        )}
                      </span>
                      <span className="text-slate-700">{option}</span>
                    </div>
                  </label>
                ))}
              </div>

              {/* Navigation Buttons - Modified for Last Question Submit */}
              {!isReadonly && (
                <div className="mt-8 flex justify-between items-center">
                  <button
                    onClick={handlePrevious}
                    disabled={isFirstQuestion || isSubmitting}
                    className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold py-2.5 px-6 rounded-lg transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ArrowLeft className="mr-1 h-5 w-5" />
                    Previous
                  </button>
                  
                  {isLastQuestion ? (
                    <button
                      onClick={handleSubmit}
                      disabled={isSubmitting} // Keep disabled while submitting
                      className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2.5 px-6 rounded-lg transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      
                      Submit
                    </button>
                  ) : (
                    <button
                      onClick={handleNext}
                      disabled={isSubmitting} // Keep disabled while submitting (e.g. if next auto-triggers something)
                      className="bg-sky-600 hover:bg-sky-700 text-white font-semibold py-2.5 px-6 rounded-lg transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                      <ArrowRight className="ml-1 h-5 w-5" />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
      {isMobileView && !isReadonly && timeRemaining !== null && (
        <div
          style={{
            position: 'fixed',
            top: 10,
            right: 10,
            zIndex: 50,
            background: '#111',
            color: '#fff',
            borderRadius: '0.5rem',
            padding: '0.4rem 1rem',
            fontWeight: 600,
            fontSize: '1rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
          }}
        >
          {formatTimeRemaining()}
        </div>
      )}
    </div>
  )
}