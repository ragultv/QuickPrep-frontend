"use client"

import { useState, useEffect, useRef, Fragment, useCallback } from "react"
import { useNavigate, useSearchParams, useLocation } from "react-router-dom"
import { ChevronLeft, ChevronRight, Play, Clock } from "lucide-react"
import type { Question } from "../types"
import { auth,quiz } from "../utils/api"

// Page state for participant flow in hosted sessions
type PageState = 'initial_load' | 'waiting_for_host' | 'prompt_participant_start' | 'loading_questions' | 'quiz_active' | 'error_page';

const STORAGE_PREFIX = "quiz_state_";

// Helper type for vendor-prefixed fullscreen elements
interface DocumentWithFullscreen extends Document {
  mozCancelFullScreen?: () => Promise<void>;
  webkitExitFullscreen?: () => Promise<void>;
  msExitFullscreen?: () => Promise<void>;
  mozFullScreenElement?: Element;
  webkitFullscreenElement?: Element;
  msFullscreenElement?: Element;
}

// Helper type for API errors
interface ApiErrorResponse {
  detail?: string;
}

interface ApiError {
  response?: {
    data?: ApiErrorResponse;
    status?: number;
  };
  message?: string;
  name?: string; // For AbortError / CanceledError
}

export default function HostedQuiz() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()

  // Robust extraction of session IDs from URL
  const participantQuizSessionIdFromUrl = searchParams.get("session_id");
  const parentHostedSessionIdFromUrl = searchParams.get("parent_hosted_session_id");

  // States for participant flow in hosted sessions
  const [pageState, setPageState] = useState<PageState>('initial_load');
  const isHostedSession = !!parentHostedSessionIdFromUrl || location.state?.isHostedSession || true; // Prioritize URL
  const initialIsLive = !!location.state?.isSessionLive; // State is less critical here if polling covers it
  const [currentHostedSessionIsLive, setCurrentHostedSessionIsLive] = useState(initialIsLive);
  const getParticipantStartedKey = (quiz_session_id: string | null) => quiz_session_id ? `${STORAGE_PREFIX}participant_started_${quiz_session_id}` : null;
  const [participantHasClickedStart, setParticipantHasClickedStart] = useState(false);
  
  // The main quizSessionId for this participant's quiz content
  const [quizSessionId, setQuizSessionId] = useState<string | null>(participantQuizSessionIdFromUrl);

  const [questions, setQuestions] = useState<Question[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([])
  const [isLoading, setIsLoading] = useState(true)
  // const [isSubmitting, setIsSubmitting] = useState(false) // Unused, isSubmittingRef is used
  const [error, setError] = useState("")
  const [isFullScreen, setIsFullScreen] = useState(false); // setIsFullScreen is now used
  const [isMobileView, setIsMobileView] = useState(false);
  const isReadonly = searchParams.get("readonly") === "true";

  const quizContainerRef = useRef<HTMLDivElement>(null)
  const questionContentRef = useRef<HTMLDivElement>(null)

  const exitFullScreen = () => {
    try {
      const doc = document as DocumentWithFullscreen;
      if (doc.exitFullscreen) {
        doc.exitFullscreen();
      } else if (doc.mozCancelFullScreen) {
        doc.mozCancelFullScreen();
      } else if (doc.webkitExitFullscreen) {
        doc.webkitExitFullscreen();
      } else if (doc.msExitFullscreen) {
        doc.msExitFullscreen();
      }
    } catch (e) {
      const exitError = e as Error;
      console.error("Error exiting fullscreen:", exitError.message);
    }
  };

  useEffect(() => {
    const checkToken = async () => {
      const token = localStorage.getItem('access_token');
      const refreshToken = localStorage.getItem('refresh_token');
  
      if (!token && refreshToken) {
        try {
          const response = await auth.refreshToken(refreshToken);
          localStorage.setItem('access_token', response.data.access_token);
          localStorage.setItem('refresh_token', response.data.refresh_token);
          console.log('✅ Token refreshed');
        } catch (err) {
          console.error('❌ Failed to refresh token', err);
          console.log('❌ Token expired, clearing localStorage');
          localStorage.clear();
          navigate('/login');
        }
      }
    };
    checkToken();
  }, [navigate]);
  
  // Effect to correctly update isFullScreen state
  useEffect(() => {
    const handleFullscreenChange = () => {
      const doc = document as DocumentWithFullscreen;
      setIsFullScreen(!!(doc.fullscreenElement || doc.mozFullScreenElement || doc.webkitFullscreenElement || doc.msFullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []); // setIsFullScreen is stable, no need to add to dependencies

  const [timeRemaining, setTimeRemaining] = useState<number | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const isTimeExpired = useRef(false)

  const abortControllerRef = useRef(new AbortController())
  const isMountedRef = useRef(false)
  const isSubmittingRef = useRef(false)
  // const fullscreenRetryRef = useRef<NodeJS.Timeout | null>(null) // Unused

  const safeStateUpdate = (update: () => void) => {
    if (isMountedRef.current) {
        update();
    }
  }

  // Define getStorageKey with useCallback first
  const getStorageKey = useCallback(() => {
    const idParam = searchParams.get("ids");
    if (!idParam) return null;
    return `${STORAGE_PREFIX}${idParam}`;
  }, [searchParams]);

  // Define handleApiError with useCallback
  const handleApiError = useCallback((err: unknown) => {
    if (!isMountedRef.current) return;
    const apiError = err as ApiError;
    console.error("API Error:", apiError.response?.data || apiError.message);
    safeStateUpdate(() => {
      if (apiError.response?.status === 401) {
        setError("Session expired. Please log in again.");
        navigate("/login");
      } else if (apiError.response?.data?.detail) {
        setError(apiError.response.data.detail);
      } else {
        setError("An API error occurred. Please try again.");
      }
      setPageState('error_page');
      setIsLoading(false);
    });
  }, [navigate]); // Assuming navigate is stable from react-router-dom

  // Define exitFullScreenCallback with useCallback
  const exitFullScreenCallback = useCallback(() => {
    // The original exitFullScreen function is defined at the top level of the component
    // and doesn't depend on props or state, so it's inherently stable.
    // We create a callback reference just for clean dependency management if preferred.
    exitFullScreen(); 
  }, []); // exitFullScreen itself doesn't change

  // Now define handleSubmit with useCallback, using the memoized helpers
  const handleSubmit = useCallback(async () => {
    if (isSubmittingRef.current || !quizSessionId || pageState !== 'quiz_active') return;

    const unansweredQuestions = selectedAnswers.filter(answer => answer === -1).length;
    if (unansweredQuestions > 0 && !isTimeExpired.current) {
      const confirmSubmit = window.confirm(
        `You have ${unansweredQuestions} unanswered question(s). Are you sure you want to submit?`
      );
      if (!confirmSubmit) return;
    }

    isSubmittingRef.current = true;

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    if (isFullScreen) {
      exitFullScreenCallback();
    }

    try {
      const answersPayload = questions.map((question, index) => {
        const selectedOption =
          selectedAnswers[index] === -1
            ? ""
            : String.fromCharCode(97 + selectedAnswers[index]);
        return {
          question_id: question.id,
          selected_option: selectedOption,
        };
      });

      if (isHostedSession) {
        await quiz.submitHostedAnswers({
          quiz_session_id: quizSessionId!,
          answers: answersPayload,
        });
      } else {
        await quiz.submitAnswers({
          quiz_session_id: quizSessionId!,
          answers: answersPayload,
        });
      }

      const storageKey = getStorageKey(); // Call the memoized version
      if (storageKey) {
        localStorage.removeItem(storageKey);
      }

      localStorage.removeItem(`hosted_quiz_state_${quizSessionId}`);

      navigate(`/quiz-result/${quizSessionId}`);
    } catch (err: unknown) {
      const apiError = err as ApiError; // Type assertion
      if (apiError.name === "CanceledError" || apiError.name === "AbortError") return;
      handleApiError(err); // Call the memoized version
    } finally {
      safeStateUpdate(() => {
        isSubmittingRef.current = false;
      });
    }
  }, [
    quizSessionId, 
    pageState, 
    selectedAnswers, 
    isFullScreen, 
    questions, 
    isHostedSession, 
    getStorageKey, // Memoized 
    navigate, 
    handleApiError, // Memoized
    exitFullScreenCallback // Memoized
    // isTimeExpired.current is a ref, accessing .current doesn't require it in deps for useCallback usually,
    // but if its change should re-memoize handleSubmit, then it (or a derived state) might be needed.
    // For now, assuming its direct usage in the logic is fine without re-memoizing handleSubmit on its change.
  ]);

  useEffect(() => {
    if (pageState !== 'quiz_active' || timeRemaining === null) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    if (timeRemaining <= 0) {
      if (!isSubmittingRef.current) {
        isTimeExpired.current = true;
        handleSubmit(); // This should now be the memoized version
      }
      return;
    }

    timerRef.current = setInterval(() => {
      safeStateUpdate(() => {
        setTimeRemaining((prev) => {
          if (prev === null || prev <= 0) {
            if (timerRef.current) clearInterval(timerRef.current);
            if (!isSubmittingRef.current && prev === 0) {
              isTimeExpired.current = true;
              handleSubmit(); // This should now be the memoized version
            }
            return 0;
          }
          return prev - 1;
        });
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timeRemaining, pageState, handleSubmit]); // handleSubmit is now memoized

  const formatTimeRemaining = () => {
    if (timeRemaining === null) return "--:--";
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  const saveStateToStorage = () => {
    const storageKey = getStorageKey()
    if (!storageKey || !quizSessionId || pageState !== 'quiz_active') return;

    const stateToSave = {
      quizSessionId,
      parentHostedSessionId: parentHostedSessionIdFromUrl,
      currentQuestionIndex,
      selectedAnswers,
      timeRemaining,
      timestamp: Date.now(),
      questions,
    }
    localStorage.setItem(storageKey, JSON.stringify(stateToSave))
  }

  const loadStateFromStorage = () => {
    const storageKey = getStorageKey()
    if (!storageKey || pageState !== 'quiz_active') return null;

    const savedStateString = localStorage.getItem(storageKey)
    if (!savedStateString) return null

    try {
      const parsedState = JSON.parse(savedStateString)
      const now = Date.now()
      const savedTime = parsedState.timestamp || 0
      const MAX_AGE = 24 * 60 * 60 * 1000 // 24 hours

      if (now - savedTime > MAX_AGE) {
        localStorage.removeItem(storageKey)
        return null
      }
      return parsedState
    } catch (err) {
      console.error("Error parsing saved quiz state:", err)
      localStorage.removeItem(storageKey)
      return null
    }
  }

  useEffect(() => {
    if (pageState !== 'quiz_active') return;
    const adjustFontSize = () => {
      const questionContent = questionContentRef.current;
      if (!questionContent) return;
      const question = questions[currentQuestionIndex]?.question || '';
      questionContent.style.fontSize = '1rem';
      if (question.length > 200) questionContent.style.fontSize = '0.9rem';
      if (question.length > 300) questionContent.style.fontSize = '0.85rem';
      if (question.length > 400) questionContent.style.fontSize = '0.8rem';
    };
    adjustFontSize();
  }, [currentQuestionIndex, questions, pageState]);

  useEffect(() => {
    if (pageState !== 'quiz_active') return;
    if (quizSessionId && questions.length > 0) {
      saveStateToStorage()
    }
  }, [quizSessionId, currentQuestionIndex, selectedAnswers, timeRemaining, questions, pageState])

  const fetchQuizData = async (signal: AbortSignal) => {
    const sessionIdForFetch = participantQuizSessionIdFromUrl;
    const questionIdsFromUrl = searchParams.get("ids")?.split(",");
    const preloadedSessionData = location.state?.preloadedSession;

    if (!isMountedRef.current) return;
    setIsLoading(true);

    if (!sessionIdForFetch && !questionIdsFromUrl && !preloadedSessionData && !parentHostedSessionIdFromUrl) {
      safeStateUpdate(() => {
        setError("No questions or session found to load.");
        setPageState('error_page');
        setIsLoading(false);
      });
      return;
    }

    const token = localStorage.getItem("access_token");
    if (!token) {
      safeStateUpdate(() => {
        setError("Authentication required. Please log in.");
        setPageState('error_page');
        navigate("/login");
        setIsLoading(false);
      });
      return;
    }

    if (!isHostedSession || (isHostedSession && participantHasClickedStart)) {
        const savedState = loadStateFromStorage();
        if (savedState && savedState.quizSessionId === sessionIdForFetch && savedState.parentHostedSessionId === parentHostedSessionIdFromUrl) {
            safeStateUpdate(() => {
                setQuestions(savedState.questions);
                setCurrentQuestionIndex(savedState.currentQuestionIndex);
                setSelectedAnswers(savedState.selectedAnswers);
                setTimeRemaining(savedState.timeRemaining);
                setPageState('quiz_active');
                setIsLoading(false);
            });
            return;
        }
    }

    try {
      let questionsResponse;
      let sessionResponse;

      if (preloadedSessionData) {
        console.log("Using preloaded session data:", preloadedSessionData);
        sessionResponse = { data: preloadedSessionData };
        const questionIdsForPreloaded = sessionResponse.data.questions.map((q: { question_id: string }) => q.question_id);
        questionsResponse = await quiz.getQuestions(questionIdsForPreloaded.join(","));
      } else if (isHostedSession && quizSessionId) {
        sessionResponse = await quiz.getSession(quizSessionId);
        const questionIds = sessionResponse.data.questions.map((q: { question_id: string }) => q.question_id);
        if (Array.isArray(questionIds) && questionIds.length > 0) {
          questionsResponse = await quiz.getQuestions(questionIds.join(","));
        } else {
          throw new Error("No question IDs found for participant's quiz session.");
        }
      } else if (sessionIdForFetch) {
        sessionResponse = await quiz.getSession(sessionIdForFetch);
        if (!isHostedSession && !sessionResponse.data.started_at && !isReadonly) {
           safeStateUpdate(() => {
            setError("Session not started. Please start the session from My Sessions.");
            setPageState('error_page');
            setIsLoading(false);
          });
          return;
        }
        const questionIds = sessionResponse.data.questions.map((q: { question_id: string }) => q.question_id);
        questionsResponse = await quiz.getQuestions(questionIds.join(","));
      } else if (questionIdsFromUrl) {
        questionsResponse = await quiz.getQuestions(questionIdsFromUrl.join(","));
        sessionResponse = await quiz.createSession({
          question_ids: questionIdsFromUrl,
          prompt: searchParams.get("prompt") || "",
          topic: searchParams.get("topic") || "",
          difficulty: searchParams.get("difficulty") || "",
          company: searchParams.get("company") || "",
        });
      } else {
        throw new Error("Insufficient parameters to load or create quiz.");
      }

      if (signal.aborted || !isMountedRef.current) return;

      const startedAt = sessionResponse.data.started_at ? new Date(sessionResponse.data.started_at) : null;
      const totalDuration = sessionResponse.data.total_duration ? sessionResponse.data.total_duration * 60 : null;
      let timeLeft = null;
      if (startedAt && totalDuration) {
        const now = new Date();
        const elapsed = Math.floor((now.getTime() - startedAt.getTime()) / 1000);
        timeLeft = Math.max(totalDuration - elapsed, 0);
      }

      safeStateUpdate(() => {
        setQuestions(questionsResponse.data);
        setSelectedAnswers(new Array(questionsResponse.data.length).fill(-1));
        setTimeRemaining(timeLeft);
        setPageState('quiz_active');
        setIsLoading(false);
      });
    } catch (err: unknown) {
      const apiError = err as ApiError;
      if (signal.aborted || apiError.name === 'AbortError' || apiError.name === 'CanceledError') {
        console.log("Request to fetch quiz data canceled");
        return;
      }
      if (isMountedRef.current) {
        console.error("Error fetching quiz data:", apiError);
        setError(apiError.response?.data?.detail || apiError.message || "Failed to load quiz data.");
        setPageState('error_page');
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    isMountedRef.current = true;
    if (isHostedSession && participantQuizSessionIdFromUrl && parentHostedSessionIdFromUrl) {
      const key = getParticipantStartedKey(participantQuizSessionIdFromUrl);
      const alreadyClicked = key ? !!localStorage.getItem(key) : false;
      setParticipantHasClickedStart(alreadyClicked);

      if (alreadyClicked && currentHostedSessionIsLive) {
        setPageState('loading_questions');
      } else if (currentHostedSessionIsLive) {
        setPageState('prompt_participant_start');
      } else {
        setPageState('waiting_for_host');
      }
      setIsLoading(false);
    } else if (!isHostedSession) {
      setPageState('loading_questions');
    } else {
      setPageState('error_page');
      setError("Required session information is missing from URL for hosted session.");
      setIsLoading(false);
    }
    return () => { isMountedRef.current = false; }
  }, [isHostedSession, participantQuizSessionIdFromUrl, parentHostedSessionIdFromUrl, currentHostedSessionIsLive]);


  useEffect(() => {
    let pollInterval: NodeJS.Timeout | null = null;
    if (isHostedSession && pageState === 'waiting_for_host' && parentHostedSessionIdFromUrl) {
      pollInterval = setInterval(async () => {
        if (!isMountedRef.current) {
          if (pollInterval) clearInterval(pollInterval);
          return;
        }
        try {
          const res = await quiz.getHostedSession(parentHostedSessionIdFromUrl);
          if (res.data.started_at && isMountedRef.current) {
            setCurrentHostedSessionIsLive(true);
            setPageState('prompt_participant_start');
            if (pollInterval) clearInterval(pollInterval);
          }
        } catch (err: unknown) {
          const apiError = err as ApiError;
          console.error("Polling error for session live status:", apiError);
          if (apiError.response?.status === 404) {
            if (isMountedRef.current) {
              setError("The session is no longer available.");
              setPageState('error_page');
            }
          }
          if (pollInterval) clearInterval(pollInterval);
        }
      }, 5000);
    }
    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [isHostedSession, pageState, parentHostedSessionIdFromUrl]);

  useEffect(() => {
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    if (pageState === 'loading_questions') {
      // Always attempt to fetch data if in loading_questions state.
      // fetchQuizData has internal logic to handle resuming or fetching fresh.
      fetchQuizData(abortController.signal);
    }
    return () => {
      abortController.abort();
    };
  }, [pageState, quizSessionId]); // Added quizSessionId as fetchQuizData depends on it for hosted sessions

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

  const handleQuestionNavigation = (index: number) => {
    if (pageState !== 'quiz_active') return;
    setCurrentQuestionIndex(index)
  }

  const getDynamicGridCols = () => {
    const count = questions.length;
    if (count <= 9) return 'grid-cols-3';
    if (count <= 16) return 'grid-cols-4';
    if (count <= 25) return 'grid-cols-5';
    if (count <= 36) return 'grid-cols-6';
    if (count <= 49) return 'grid-cols-7';
    if (count <= 64) return 'grid-cols-8';
    if (count <= 81) return 'grid-cols-9';
    return 'grid-cols-10';
  };

  const getButtonSizeClass = () => {
    const count = questions.length;
    if (count <= 9) return 'text-lg h-12';
    if (count <= 25) return 'text-base h-10';
    if (count <= 49) return 'text-sm h-8';
    if (count <= 81) return 'text-xs h-7';
    return 'text-xs h-6';
  };

  useEffect(() => {
    if (isReadonly || pageState !== 'quiz_active') return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isSubmittingRef.current && !isLoading && questions.length > 0) {
        e.preventDefault();
        e.returnValue = '';
        return 'You are in the middle of a quiz. Are you sure you want to leave?';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isLoading, questions, isReadonly, pageState]);

  useEffect(() => {
    if (isReadonly || pageState !== 'quiz_active') return;
    const handlePopState = () => {
      if (!isSubmittingRef.current && !isLoading && questions.length > 0) {
        window.history.pushState(null, '', window.location.pathname + window.location.search);
        const leaveConfirmed = window.confirm('You are in the middle of a quiz. Are you sure you want to leave this page?');
        if (leaveConfirmed) {
          if (isFullScreen) {
            exitFullScreen();
          }
          navigate('/dashboard');
        }
      }
    };
    window.history.pushState(null, '', window.location.pathname + window.location.search);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isLoading, questions, navigate, isFullScreen, isReadonly, pageState]);

  useEffect(() => {
    const checkMobileView = () => setIsMobileView(window.innerWidth < 768)
    checkMobileView()
    window.addEventListener('resize', checkMobileView)
    return () => window.removeEventListener('resize', checkMobileView)
  }, [])

  const [showMobileGrid, setShowMobileGrid] = useState(false);
  const mobileNavContainerRef = useRef<HTMLDivElement>(null);
  const currentQuestionBtnRef = useRef<HTMLButtonElement>(null);
  
  const MobileQuestionNavigation = () => {
    if (pageState !== 'quiz_active') return null;
    let visibleQuestionsCount = 7;
    if (questions.length < 7) {
      visibleQuestionsCount = questions.length;
      if (visibleQuestionsCount % 2 === 0) visibleQuestionsCount -= 1;
      if (visibleQuestionsCount < 1) visibleQuestionsCount = 1;
    }
    const halfVisible = Math.floor(visibleQuestionsCount / 2);
    
    const calculateVisibleRange = () => {
      let start = currentQuestionIndex - halfVisible;
      let end = currentQuestionIndex + halfVisible;
      
      if (start < 0) {
        start = 0;
        end = Math.min(visibleQuestionsCount - 1, questions.length - 1);
      }
      
      if (end >= questions.length) {
        end = questions.length - 1;
        start = Math.max(0, end - (visibleQuestionsCount - 1));
      }
      
      return { start, end };
    };

    const { start, end } = calculateVisibleRange();
    
    return (
      <Fragment>
        <div className="w-full bg-gray-200 py-3 flex items-center md:hidden">
          <button 
            onClick={handlePrevious}
            disabled={isFirstQuestion}
            className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-white text-gray-600 disabled:opacity-50 disabled:bg-gray-100"
            aria-label="Previous question"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          
          <div
            className="flex-1 overflow-x-auto scrollbar-hide-mobile px-2"
            ref={mobileNavContainerRef}
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            <div className="flex gap-3 min-w-fit">
              {questions.map((_, index) => {
                const isVisible = index >= start && index <= end;
                if (!isVisible) return null;
                const isCurrent = currentQuestionIndex === index;
                return (
                  <button
                    key={index}
                    ref={isCurrent ? currentQuestionBtnRef : undefined}
                    onClick={() => {
                      if (isCurrent) setShowMobileGrid(true);
                      else handleQuestionNavigation(index);
                    }}
                    className={`
                      flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full text-base font-semibold
                      transition-all duration-200
                      ${
                        isCurrent
                          ? "bg-yellow-500 text-black transform scale-110 shadow-md ring-2 ring-yellow-500"
                          : selectedAnswers[index] !== -1
                            ? "bg-green-500 text-white"
                            : "bg-white text-black border-2 border-gray-300"
                      }
                    `}
                    aria-label={`Go to question ${index + 1}${isCurrent ? ' (current)' : ''}`}
                  >
                    {index + 1}
                  </button>
                );
              })}
            </div>
          </div>
          
          <button 
            onClick={handleNext}
            disabled={isLastQuestion}
            className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-white text-gray-600 disabled:opacity-50 disabled:bg-gray-100"
            aria-label="Next question"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </div>

        {showMobileGrid && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] flex flex-col">
              <div className="flex justify-between items-center p-4 border-b">
                <span className="font-semibold text-lg">All Questions</span>
                <button onClick={() => setShowMobileGrid(false)} className="text-gray-500 hover:text-black text-2xl leading-none">&times;</button>
              </div>
              <div className="p-4 overflow-y-auto scrollbar-thin max-h-[70vh]">
                <div className={`grid gap-2 ${getDynamicGridCols()}`}>
                  {questions.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        handleQuestionNavigation(index);
                        setShowMobileGrid(false);
                      }}
                      className={`
                        aspect-square flex items-center justify-center rounded-md font-medium text-sm
                        ${
                          currentQuestionIndex === index
                            ? "bg-yellow-500 text-black"
                            : selectedAnswers[index] !== -1
                              ? "bg-green-500 text-white"
                              : "bg-white text-black border border-gray-300"
                        }
                        hover:opacity-90 transition-colors
                      `}
                    >
                      {index + 1}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </Fragment>
    );
  };

  useEffect(() => {
    if (isMobileView && currentQuestionBtnRef.current && mobileNavContainerRef.current) {
      currentQuestionBtnRef.current.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
    }
  }, [currentQuestionIndex, isMobileView]);

  const isFirstQuestion = currentQuestionIndex === 0;
  const isLastQuestion = currentQuestionIndex === questions.length - 1;

  const handleParticipantClickStartQuiz = () => {
    if (!participantQuizSessionIdFromUrl) {
      setError("Cannot start quiz: Quiz Session ID is missing from URL.");
      setPageState('error_page');
      return;
    }
    const key = getParticipantStartedKey(participantQuizSessionIdFromUrl);
    if (key) localStorage.setItem(key, "true");
    setParticipantHasClickedStart(true);
    setIsLoading(true);
    setPageState('loading_questions');
  };

  // --- Refresh Logic: Save and Restore State ---
  // Save state to localStorage whenever relevant state changes
  useEffect(() => {
    if (!quizSessionId || questions.length === 0) return;
    const stateToSave = {
      quizSessionId,
      parentHostedSessionId: parentHostedSessionIdFromUrl,
      currentQuestionIndex,
      selectedAnswers,
      timeRemaining,
      questions,
      timestamp: Date.now(),
    };
    localStorage.setItem(`hosted_quiz_state_${quizSessionId}`, JSON.stringify(stateToSave));
  }, [quizSessionId, parentHostedSessionIdFromUrl, currentQuestionIndex, selectedAnswers, timeRemaining, questions]);

  // Restore state from localStorage on mount
  useEffect(() => {
    if (participantQuizSessionIdFromUrl) {
      const saved = localStorage.getItem(`hosted_quiz_state_${participantQuizSessionIdFromUrl}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.quizSessionId === participantQuizSessionIdFromUrl && 
              parsed.parentHostedSessionId === parentHostedSessionIdFromUrl && 
              parsed.questions && parsed.selectedAnswers) {
            
            setQuizSessionId(parsed.quizSessionId);
            setQuestions(parsed.questions);
            setCurrentQuestionIndex(parsed.currentQuestionIndex);
            setSelectedAnswers(parsed.selectedAnswers);
            setTimeRemaining(parsed.timeRemaining);
          } else {
            localStorage.removeItem(`hosted_quiz_state_${participantQuizSessionIdFromUrl}`);
          }
        } catch (e) {
            localStorage.removeItem(`hosted_quiz_state_${participantQuizSessionIdFromUrl}`);
        }
      }
    }
  }, [participantQuizSessionIdFromUrl, parentHostedSessionIdFromUrl]);

  if (pageState === 'initial_load' || pageState === 'loading_questions') {
    if (isLoading && questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
        <p className="text-lg text-gray-700">Loading quiz...</p>
        </div>
      );
    } else if (pageState === 'loading_questions' && (questions.length > 0 || !isLoading)) {
      // Fallback or transition, should quickly move to quiz_active or error
    } else if (pageState === 'initial_load') {
         return (
            <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
              <p className="text-lg text-gray-700">Initializing session...</p>
      </div>
    );
    }
  }

  if (pageState === 'error_page' || (error && pageState !== 'quiz_active')) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-red-50 p-4">
        <h2 className="text-2xl font-semibold text-red-700 mb-4">Oops! Something went wrong.</h2>
        <p className="text-red-600 text-center">{error || "An unknown error occurred."}</p>
        <button 
          onClick={() => navigate('/dashboard')} 
          className="mt-6 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
        >
          Go to Dashboard
        </button>
      </div>
    );
  }

  if (isHostedSession) {
    if (pageState === 'waiting_for_host') {
      return (
        <div className="flex flex-col items-center justify-center h-screen bg-gray-100 p-4 text-center">
          <Clock className="w-16 h-16 text-indigo-500 mb-6 animate-pulse" />
          <p className="text-2xl font-medium text-gray-800 mb-2">Waiting for the host to start the session...</p>
          <p className="text-gray-600">Please keep this page open. The quiz will begin shortly.</p>
        </div>
      );
    }
    if (pageState === 'prompt_participant_start') {
      return (
        <div className="flex flex-col items-center justify-center h-screen bg-gray-100 p-4 text-center">
          <Play className="w-16 h-16 text-green-500 mb-6" />
          <p className="text-2xl font-medium text-gray-800 mb-4">The session is live!</p>
          <p className="text-gray-600 mb-8">Are you ready to begin the quiz?</p>
          <button 
            onClick={handleParticipantClickStartQuiz} 
            className="px-8 py-3 bg-green-500 text-white text-lg font-semibold rounded-lg hover:bg-green-600 transition-colors shadow-md hover:shadow-lg"
          >
            Start Quiz
          </button>
        </div>
      );
    }
  }

  if (pageState === 'quiz_active' && questions.length > 0 && quizSessionId) {
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
                      if (index === currentQuestionIndex) {
                        bgColor = 'bg-amber-400 hover:bg-amber-500';
                        textColor = 'text-white';
                      } else if (selectedAnswers[index] !== -1) {
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
                        disabled={currentQuestionIndex === 0}
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
                              onClick={() => handleQuestionNavigation(index)}
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
                        disabled={currentQuestionIndex === questions.length - 1}
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
                      disabled={currentQuestionIndex === 0}
                      className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold py-2.5 px-6 rounded-lg transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="mr-1 h-5 w-5" />
                      Previous
                    </button>
                    {currentQuestionIndex === questions.length - 1 ? (
                      <button
                        onClick={handleSubmit}
                        className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2.5 px-6 rounded-lg transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Submit
                      </button>
                    ) : (
                      <button
                        onClick={handleNext}
                        className="bg-sky-600 hover:bg-sky-700 text-white font-semibold py-2.5 px-6 rounded-lg transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                        <ChevronRight className="ml-1 h-5 w-5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>
        {/* Mobile floating timer */}
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
            {timerDisplay}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
      <p className="text-lg text-gray-700">Preparing your quiz...</p>
    </div>
  );
}