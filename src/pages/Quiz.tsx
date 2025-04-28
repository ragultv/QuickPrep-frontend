"use client"

import { useState, useEffect, useRef } from "react"
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
  
  // Refs for the full screen element
  const quizContainerRef = useRef<HTMLDivElement>(null)

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
    if (count <= 49) return 'grid-cols-6'; // Adjust as needed for larger numbers
    if (count <=60) return 'grid-cols-7';
    if (count <= 72) return 'grid-cols-8'; // Adjust as needed for larger numbers
    if (count <= 100) return 'grid-cols-9'; // Adjust as needed for larger numbers
    return 'grid-cols-6'; // Maximum number of columns
  };

  // Determine button size based on number of questions
  const getButtonSizeClass = () => {
    const count = questions.length;
    if (count <= 9) return 'text-2xl h-16';
    if (count <= 16) return 'text-xl h-14';
    if (count <= 25) return 'text-lg h-12';
    if (count <= 36) return 'text-base h-10';
    if (count <= 49) return 'text-sm h-9';
    return 'text-xs h-9'; // Smallest size for many questions
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

  if (isLoading) {
    return <div>Loading...</div>
  }

  if (error) {
    return <div className="error">{error}</div>
  }

  return (
    <div 
      ref={quizContainerRef} 
      className={`flex justify-center items-start min-h-screen bg-gray-50 p-4 ${isFullScreen ? 'fullscreen-mode' : ''}`}
    >
      <div className="w-full max-w-6xl">
        {/* Top section with timer only */}
        <div className="flex justify-end items-center mb-4">          
          <div className="bg-white rounded-lg shadow-sm p-2 flex items-center gap-2">
            <span className="text-sm font-medium">Time Remaining:</span>
            <span className="font-mono font-bold text-lg">{formatTimeRemaining()}</span>
          </div>
        </div>

        {isFullScreen && (
          <div className="mb-4 bg-yellow-100 border-l-4 border-yellow-500 p-3 rounded-md">
            <p className="text-yellow-700">
              <strong>Interview Mode:</strong> This quiz requires fullscreen mode for optimal experience.
            </p>
          </div>
        )}

        <div className="flex flex-col md:flex-row gap-6">
          {/* Left side - Question navigation grid with dynamic sizing */}
          <div className="w-full md:w-1/3 bg-white rounded-xl shadow-lg p-6 self-start sticky top-4">
            <div className="mb-4">
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-green-500"></div>
                  <span>Answered</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-yellow-400"></div>
                  <span>Current</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-white border border-gray-300"></div>
                  <span>Not Answered</span>
                </div>
              </div>

              {/* Dynamic Question Number Grid */}
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

          {/* Right side - Question and answers with fixed height container */}
          <div className="w-full md:w-2/3 bg-white rounded-xl shadow-lg p-6 flex flex-col min-h-[500px]">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium">
                Question {currentQuestionIndex + 1} of {questions.length}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrevious}
                  disabled={isFirstQuestion}
                  className="p-1 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Previous question"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={handleNext}
                  disabled={isLastQuestion}
                  className="p-1 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Next question"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>

            {questions.length > 0 && (
              <>
                <div className="mb-6 max-h-[150px] overflow-y-auto">
                  <p className="text-xl font-medium">{questions[currentQuestionIndex].question}</p>
                </div>
                <div className="space-y-3 flex-grow overflow-y-auto">
                  {questions[currentQuestionIndex].options.map((option, index) => (
                    <button
                      key={index}
                      onClick={() => handleAnswerSelect(index)}
                      className={`w-full text-left p-4 rounded-lg border ${
                        selectedAnswers[currentQuestionIndex] === index
                          ? "border-green-500 bg-green-50"
                          : "border-gray-300 hover:border-gray-400"
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </>
            )}

            <div className="mt-6 flex justify-between gap-4">
              <button
                onClick={handlePrevious}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
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
      
      {/* CSS for fullscreen mode */}
      <style>{`
        .fullscreen-mode {
          background-color: #f9fafb;
          width: 100%;
          height: 100%;
          overflow-y: auto;
          padding: 1rem;
        }
        
        @media (max-width: 768px) {
          .fullscreen-mode {
            padding: 0.5rem;
          }
        }
      `}</style>
    </div>
  )
}