"use client"

import { useState, useEffect, useRef, Fragment } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { ChevronLeft, ChevronRight } from "lucide-react"
import type { Question } from "../types"
import { quiz } from "../utils/api"

export default function Quiz() {
  const navigate = useNavigate()
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
    const idParam = searchParams.get("ids")
    if (!idParam) return null
    return `${STORAGE_PREFIX}${idParam}`
  }

  // Save state to localStorage
  const saveStateToStorage = () => {
    const storageKey = getStorageKey()
    if (!storageKey || !quizSessionId) return

    const stateToSave = {
      quizSessionId,
      currentQuestionIndex,
      selectedAnswers,
      timeRemaining,
      timestamp: Date.now(),
      questions,
    }

    localStorage.setItem(storageKey, JSON.stringify(stateToSave))
  }

  // Load state from localStorage
  const loadStateFromStorage = () => {
    const storageKey = getStorageKey()
    if (!storageKey) return null

    const savedState = localStorage.getItem(storageKey)
    if (!savedState) return null

    try {
      const parsedState = JSON.parse(savedState)

      // Verify the saved state isn't too old (e.g., more than 24 hours)
      const now = Date.now()
      const savedTime = parsedState.timestamp || 0
      const MAX_AGE = 24 * 60 * 60 * 1000 // 24 hours in milliseconds

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

  // Enhanced enterFullScreen with error recovery
  const enterFullScreen = () => {
    const element = quizContainerRef.current
    if (!element) return

    try {
      if (element.requestFullscreen) {
        element.requestFullscreen().catch(error => {
          console.error("Fullscreen request failed:", error)
          // Try again after a small delay
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
      console.error("Error entering fullscreen:", error)
      // Try again after a short delay
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
      console.error("Error exiting fullscreen:", error)
    }
  }

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
            console.log("User exited fullscreen. Re-entering fullscreen mode...");
            enterFullScreen();
            
            // Additional notification to user
            const notification = document.createElement('div');
            notification.textContent = "Fullscreen mode is required for this quiz";
            notification.style.position = 'fixed';
            notification.style.top = '20px';
            notification.style.left = '50%';
            notification.style.transform = 'translateX(-50%)';
            notification.style.backgroundColor = 'rgba(255, 193, 7, 0.9)';
            notification.style.color = '#000';
            notification.style.padding = '10px 20px';
            notification.style.borderRadius = '5px';
            notification.style.zIndex = '9999';
            notification.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.2)';
            
            document.body.appendChild(notification);
            setTimeout(() => {
              if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
              }
            }, 3000);
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
    if (!isLoading && questions.length > 0 && !isFullScreen) {
      // Small delay to ensure component is fully rendered
      const timer = setTimeout(() => {
        enterFullScreen()
      }, 500)
      
      return () => clearTimeout(timer)
    }
  }, [isLoading, questions, isFullScreen])

  // Adjust font size based on content length
  useEffect(() => {
    const adjustFontSize = () => {
      const questionContent = questionContentRef.current;
      if (!questionContent) return;
      
      // Get current question content
      const question = questions[currentQuestionIndex]?.question || '';
      
      // Reset font size first
      questionContent.style.fontSize = '1rem';
      
      // Simple heuristic - reduce font size for longer content
      if (question.length > 200) {
        questionContent.style.fontSize = '0.9rem';
      }
      if (question.length > 300) {
        questionContent.style.fontSize = '0.85rem';
      }
      if (question.length > 400) {
        questionContent.style.fontSize = '0.8rem';
      }
    };
    
    adjustFontSize();
  }, [currentQuestionIndex, questions]);

  // Save state whenever relevant parts change
  useEffect(() => {
    if (quizSessionId && questions.length > 0) {
      saveStateToStorage()
    }
  }, [quizSessionId, currentQuestionIndex, selectedAnswers, timeRemaining, questions])

  useEffect(() => {
    const abortController = new AbortController()
    abortControllerRef.current = abortController
    isMountedRef.current = true

    const fetchQuestionsAndCreateSession = async () => {
      const questionIds = searchParams.get("ids")?.split(",")
      if (!questionIds) {
        safeStateUpdate(() => setError("No questions found"))
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

      // Try to load saved state first
      const savedState = loadStateFromStorage()
      if (savedState) {
        safeStateUpdate(() => {
          setQuizSessionId(savedState.quizSessionId)
          setQuestions(savedState.questions)
          setCurrentQuestionIndex(savedState.currentQuestionIndex)
          setSelectedAnswers(savedState.selectedAnswers)
          setTimeRemaining(savedState.timeRemaining)
          setIsLoading(false)
        })
        return
      }

      try {
        // Get Questions
        const questionsResponse = await quiz.getQuestions(questionIds.join(","))

        if (!isMountedRef.current) return

        // Create Quiz Session
        const sessionResponse = await quiz.createSession({
          question_ids: questionIds,
          prompt: searchParams.get("prompt") || "",
          topic: searchParams.get("topic") || "",
          difficulty: searchParams.get("difficulty") || "",
          company: searchParams.get("company") || "",
        })

        safeStateUpdate(() => {
          setQuizSessionId(sessionResponse.data.id)
          setQuestions(questionsResponse.data)
          // Initialize selectedAnswers array with a default value of -1 for each question
          setSelectedAnswers(new Array(questionsResponse.data.length).fill(-1))

          // Set up timer with 90 seconds per question
          const durationInSeconds = questionsResponse.data.length * 90
          setTimeRemaining(durationInSeconds)
        })
      } catch (err: any) {
        if (abortController.signal.aborted) {
          console.log("Request canceled")
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
  }, [searchParams, navigate])

  // Timer effect
  useEffect(() => {
    if (timeRemaining === null) return

    // Start the countdown timer
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
    console.error("Error:", err.response?.data)
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

  // Determine grid columns based on number of questions
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

  // Determine button size based on number of questions
  const getButtonSizeClass = () => {
    const count = questions.length;
    if (count <= 9) return 'text-lg h-12';
    if (count <= 25) return 'text-base h-10';
    if (count <= 49) return 'text-sm h-8';
    if (count <= 81) return 'text-xs h-7';
    return 'text-xs h-6';
  };

  // Add navigation prevention
  useEffect(() => {
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
  }, [isLoading, questions]);

  // Handle back button
  useEffect(() => {
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
          navigate('/');
        }
      }
    };

    // Push current state to prevent initial back
    window.history.pushState(null, '', window.location.pathname + window.location.search);
    
    window.addEventListener('popstate', handlePopState);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isLoading, questions, navigate, isFullScreen]);

  // Check for mobile view
  useEffect(() => {
    const checkMobileView = () => {
      setIsMobileView(window.innerWidth < 768)
    }
    
    checkMobileView()
    window.addEventListener('resize', checkMobileView)
    
    return () => {
      window.removeEventListener('resize', checkMobileView)
    }
  }, [])

  // Mobile Question Navigation Component
  const [showMobileGrid, setShowMobileGrid] = useState(false);
  const mobileNavContainerRef = useRef<HTMLDivElement>(null);
  const currentQuestionBtnRef = useRef<HTMLButtonElement>(null);

  const MobileQuestionNavigation = () => {
    const visibleQuestionsCount = 7; // Show 7 questions at a time
    const halfVisible = Math.floor(visibleQuestionsCount / 2);
    
    // Calculate which questions should be visible
    const calculateVisibleRange = () => {
      let start = currentQuestionIndex - halfVisible;
      let end = currentQuestionIndex + halfVisible;
      
      // Adjust range if at the beginning
      if (start < 0) {
        start = 0;
        end = Math.min(visibleQuestionsCount - 1, questions.length - 1);
      }
      
      // Adjust range if at the end
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

        {/* Modal for full question grid in mobile view */}
        {showMobileGrid && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] flex flex-col">
              <div className="flex justify-between items-center p-4 border-b">
                <span className="font-semibold text-lg">All Questions</span>
                <button onClick={() => setShowMobileGrid(false)} className="text-gray-500 hover:text-black text-2xl leading-none">&times;</button>
              </div>
              {/* Scrollable Grid Container */}
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

  // Scroll current question into view in mobile nav
  useEffect(() => {
    if (isMobileView && currentQuestionBtnRef.current && mobileNavContainerRef.current) {
      currentQuestionBtnRef.current.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
    }
  }, [currentQuestionIndex, isMobileView]);

  if (isLoading) {
    return <div>Loading...</div>
  }

  if (error) {
    return <div className="error">{error}</div>
  }

  return (
    <div 
      ref={quizContainerRef} 
      className="h-screen bg-gray-50 flex flex-col overflow-hidden"
    >
      {/* Mobile Question Navigation */}
      <MobileQuestionNavigation />

      {/* Timer Header - Fixed at top */}
      <div className="sticky top-0 z-10 bg-white shadow-sm p-2 flex justify-between items-center">
        
        <div className="bg-white rounded-lg shadow-sm p-2 flex items-center gap-2">
          <span className="text-sm font-medium">Time Remaining:</span>
          <span className="font-mono font-bold text-lg">{formatTimeRemaining()}</span>
        </div>
      </div>

      {/* Main Content Area - Fixed height with proper spacing */}
      <div className="flex-1 overflow-hidden">
        <div className="flex flex-col md:flex-row w-full max-w-7xl mx-auto p-4 gap-4 h-full">
          {/* Left side - Question navigation grid (desktop only) */}
          <div className="hidden md:block w-full md:w-1/3 bg-white rounded-xl shadow-lg overflow-hidden h-full">
            <div className="p-4 bg-gray-50 border-b">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="text-sm">Answered</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                  <span className="text-sm">Current</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-white border border-gray-300"></div>
                  <span className="text-sm">Not Answered</span>
                </div>
              </div>
            </div>
            
            {/* Scrollable grid container */}
            <div className="p-4 overflow-y-auto scrollbar-thin h-full" style={{ maxHeight: "calc(100% - 60px)" }}>
              <div className={`grid gap-2 ${getDynamicGridCols()}`}>
                {questions.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => handleQuestionNavigation(index)}
                    className={`
                      aspect-square flex items-center justify-center rounded-md font-medium
                      ${
                        currentQuestionIndex === index
                          ? "bg-yellow-400 text-black"
                          : selectedAnswers[index] !== -1
                            ? "bg-green-500 text-white"
                            : "bg-white text-black border border-gray-300"
                      }
                      hover:opacity-90 transition-colors
                      ${getButtonSizeClass()}
                    `}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right side - Question and answers with fixed height */}
          <div className="w-full md:w-2/3 bg-white rounded-xl shadow-lg flex flex-col h-full">
            {/* Question content - Scrollable */}
            <div className="flex-1 p-6 overflow-y-auto" style={{ maxHeight: "calc(100% - 80px)" }}>
              <div ref={questionContentRef} className="mb-6 question-text">
                <p className="text-xl font-medium">{questions[currentQuestionIndex]?.question}</p>
              </div>

              <div className="space-y-4 options-container">
                {questions[currentQuestionIndex]?.options.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => handleAnswerSelect(index)}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                      selectedAnswers[currentQuestionIndex] === index
                        ? "border-green-500 bg-green-50"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            {/* Navigation buttons - Fixed at bottom */}
            <div className="p-4 border-t bg-white">
              <div className="flex justify-between gap-4">
                <button
                  onClick={handlePrevious}
                  disabled={isFirstQuestion}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                
                {isLastQuestion ? (
                  <button
                    onClick={handleSubmit}
                    className="px-6 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600"
                  >
                    Submit Quiz
                  </button>
                ) : (
                  <button
                    onClick={handleNext}
                    disabled={selectedAnswers[currentQuestionIndex] === -1}
                    className="px-6 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CSS for scrollbar styling */}
      <style>{`
        /* Custom scrollbar */
        .scrollbar-thin::-webkit-scrollbar {
          width: 6px;
        }
        
        .scrollbar-thin::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }
        
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: #c1c1c1;
          border-radius: 10px;
        }
        
        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: #a8a8a8;
        }
        
        /* Hide horizontal scrollbar in mobile for question nav */
        @media (max-width: 768px) {
          .scrollbar-hide-mobile::-webkit-scrollbar {
            display: none;
          }
          .scrollbar-hide-mobile {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
        }
        
        /* Auto-adjust font size for question based on container */
        .question-text {
          transition: font-size 0.2s ease;
        }
        
        /* Option text styling for better readability */
        .options-container button {
          transition: all 0.2s ease;
          line-height: 1.5;
        }
        
        .options-container button:hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        }
        
        .options-container button:active {
          transform: translateY(0);
        }
        
        /* Mobile optimizations */
        @media (max-width: 768px) {
          .question-text {
            font-size: 1rem;
          }
          
          .options-container button {
            padding: 0.75rem;
          }
        }
      `}</style>
    </div>
  );
}
