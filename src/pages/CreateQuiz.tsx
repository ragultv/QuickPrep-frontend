"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Loader2, Sparkles, BrainCircuit, Check, Home, Users, User } from "lucide-react"
import { auth, quiz, promptEnhancer } from "../utils/api"
import SessionLimitMessage from "../components/SessionLimitMessage"

export default function CreateQuiz() {
  const [prompt, setPrompt] = useState("")
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const [isEnhancing, setIsEnhancing] = useState(false)
  const [error, setError] = useState("")
  const [isCompleted, setIsCompleted] = useState(false)
  const isSubmitting = useRef(false)
  const [sessionType, setSessionType] = useState<"personal" | "host">("personal")
  const [hostSettings, setHostSettings] = useState({
    title: "",
    totalSpots: 10,
    durationMinutes: 30,
  })
  const [processingProgress, setProcessingProgress] = useState(0)
  const [processingStage, setProcessingStage] = useState("")
  const [sessionLimit, setSessionLimit] = useState<{
    limit_reached: boolean;
    reset_time: string;
  } | null>(null)

  useEffect(() => {
    const checkSessionLimit = async () => {
      try {
        const response = await quiz.checkSessionLimit()
        setSessionLimit(response.data)
      } catch (err) {
        console.error("Failed to check session limit:", err)
      }
    }
    checkSessionLimit()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitting.current || !prompt.trim()) return

    isSubmitting.current = true
    setIsLoading(true)
    setError("")
    setProcessingProgress(0)
    setProcessingStage("Initializing...")

    // ── 1) AUTHENTICATION CHECK ─────────────────────────────────────────────
    const checkAuth = async () => {
      const token = localStorage.getItem("access_token")
      if (!token) {
        const refreshToken = localStorage.getItem("refresh_token")
        if (refreshToken) {
          try {
            const response = await auth.refreshToken(refreshToken)
            localStorage.setItem("access_token", response.data.access_token)
            localStorage.setItem("refresh_token", response.data.refresh_token)
          } catch (error) {
            console.error("Failed to refresh token:", error)
            navigate("/login", { replace: true })
            return false
          }
        }
      }
      return true
    }

    // Simulate progress updates
    const updateProgress = (progress: number, stage: string) => {
      setProcessingProgress(progress)
      setProcessingStage(stage)
    }

    try {
      updateProgress(10, "Authenticating...")
      const isAuth = await checkAuth()
      if (!isAuth) return

      updateProgress(25, "Analyzing your prompt...")
      await new Promise((resolve) => setTimeout(resolve, 800))

      updateProgress(50, "Generating questions with AI...")
      const response = await quiz.generateQuestions(prompt)

      updateProgress(75, "Processing questions...")
      await new Promise((resolve) => setTimeout(resolve, 500))

      const { ids, topics, difficulties, companies } = response.data

      if (ids?.length > 0) {
        updateProgress(90, "Creating your quiz session...")

        if (sessionType === "personal") {
          await quiz.createSession({
            question_ids: ids,
            prompt,
            topic: topics[0],
            difficulty: difficulties[0],
            company: companies[0],
          })
        } else {
          await quiz.createHostSession({
            question_ids: ids,
            prompt,
            topic: topics[0],
            difficulty: difficulties[0],
            company: companies[0],
            total_duration: hostSettings.durationMinutes,
            title: hostSettings.title || prompt.slice(0, 50) + "...",
            total_spots: hostSettings.totalSpots,
          })
        }

        updateProgress(100, "Quiz created successfully!")
        await new Promise((resolve) => setTimeout(resolve, 500))
        setIsCompleted(true)
      } else {
        setError("No questions were generated. Please try again with a different prompt.")
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to generate quiz. Please try again.")
    } finally {
      isSubmitting.current = false
      setIsLoading(false)
      setProcessingProgress(0)
      setProcessingStage("")
    }
  }

  const typeEffect = (fullText: string) => {
    let i = 0
    const typingSpeed = 10
    setPrompt("")

    const interval = setInterval(() => {
      setPrompt(fullText.slice(0, i + 1))
      i++
      if (i >= fullText.length) clearInterval(interval)
    }, typingSpeed)
  }

  const enhancePrompt = async () => {
    if (!prompt.trim() || isEnhancing) return

    setIsEnhancing(true)
    setError("")

    try {
      const response = await promptEnhancer.enhance(prompt)
      if (response.data.enhanced_prompt) {
        typeEffect(response.data.enhanced_prompt)
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to enhance prompt. Please try again.")
    } finally {
      setIsEnhancing(false)
    }
  }

  // const navigateHome = () => {
  //   setIsCompleted(false);
  //   setPrompt('');
  //   setSessionType('personal');
  //   setHostSettings({
  //     title: '',
  //     totalSpots: 10,
  //     durationMinutes: 30
  //   });
  // };

  const isFormValid =
    prompt.trim() && (sessionType === "personal" || (sessionType === "host" && hostSettings.title.trim()))

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-3 text-center sm:text-left"></h1>
        <p className="text-gray-600 mb-8 text-center sm:text-left">Design your perfect quiz with AI assistance</p>

        {isCompleted ? (
          <div className="bg-white rounded-xl shadow-lg p-8 text-center animate-slideUp">
            <div className="mb-8">
              <div className="mx-auto w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mb-6">
                <Check className="w-10 h-10 text-green-500" strokeWidth={3} />
              </div>

              <h2 className="text-2xl font-bold text-gray-900 mb-3">Quiz Created Successfully!</h2>

              <div className="flex justify-center space-x-1 mb-6">
                <Sparkles className="h-5 w-5 text-amber-400" />
                <Sparkles className="h-4 w-4 text-amber-400 animate-pulse" />
                <Sparkles className="h-5 w-5 text-amber-400" />
              </div>

              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                Your quiz has been generated and saved. You can find it in your session dashboard.
              </p>

              <button
                onClick={() => navigate("/")}
                className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
              >
                <Home className="w-5 h-5 mr-2" />
                Back to Dashboard
              </button>
            </div>

            <div className="text-xs text-gray-400 italic mt-6">You can edit or share your quiz from the dashboard</div>
          </div>
        ) : (
          <div
            className={`bg-white rounded-xl shadow-lg p-8 transition-all duration-300 transform hover:shadow-xl ${isLoading ? "relative" : ""}`}
          >
            {sessionLimit?.limit_reached && (
              <SessionLimitMessage resetTime={sessionLimit.reset_time} type="general" />
            )}

            {/* Processing Overlay */}
            {isLoading && (
              <div className="absolute inset-0 bg-white/90 backdrop-blur-sm rounded-xl z-10 flex flex-col items-center justify-center">
                <div className="text-center space-y-6">
                  {/* Animated Logo */}
                  <div className="relative">
                    <div className="w-20 h-20 mx-auto bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center animate-pulse">
                      <BrainCircuit className="w-10 h-10 text-white" />
                    </div>
                    <div className="absolute -inset-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full opacity-20 animate-ping"></div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-80 max-w-full">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">{processingStage}</span>
                      <span className="text-sm font-medium text-indigo-600">{processingProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full transition-all duration-500 ease-out relative"
                        style={{ width: `${processingProgress}%` }}
                      >
                        <div className="absolute inset-0 bg-white/30 animate-pulse"></div>
                      </div>
                    </div>
                  </div>

                  {/* Processing Message */}
                  <div className="space-y-2">
                    <p className="text-lg font-semibold text-gray-800">Creating Your Quiz</p>
                    <p className="text-sm text-gray-600 max-w-md">
                      Our AI is working hard to generate the perfect questions for you. This may take a few moments.
                    </p>
                  </div>

                  {/* Animated Dots */}
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce"></div>
                    <div
                      className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce"
                      style={{ animationDelay: "0.1s" }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    ></div>
                  </div>
                </div>
              </div>
            )}

            {/* Form Content - Blurred when loading or limit reached */}
            <div className={`transition-all duration-300 ${isLoading || sessionLimit?.limit_reached ? "blur-sm pointer-events-none" : ""}`}>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label htmlFor="prompt" className="block text-base font-medium text-gray-800">
                      What kind of quiz would you like to create?
                    </label>
                    <div className="text-xs text-gray-500">{prompt.length} chars</div>
                  </div>

                  <div className="relative group">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg blur opacity-0 group-hover:opacity-20 transition duration-300"></div>

                    <div className="relative">
                      <textarea
                        id="prompt"
                        rows={5}
                        className={`w-full rounded-lg border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-300 pr-12 resize-none ${
                          isEnhancing ? "bg-indigo-50 animate-pulse" : ""
                        }`}
                        placeholder="e.g., '20 advanced Python MCQs' or 'Create a quiz about JavaScript promises'"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        disabled={isEnhancing || isLoading}
                        required
                      />

                      <div className="absolute right-3 bottom-3">
                        <button
                          type="button"
                          onClick={enhancePrompt}
                          disabled={isEnhancing || !prompt.trim() || isLoading}
                          className={`flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-md
                  border border-indigo-100 hover:bg-indigo-100 transition-all duration-200
                  ${isEnhancing || !prompt.trim() || isLoading ? "opacity-50 cursor-not-allowed" : "shadow-sm hover:shadow"}`}
                          title="Enhance prompt with AI"
                        >
                          {isEnhancing ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span className="text-xs font-medium">Enhancing...</span>
                            </>
                          ) : (
                            <>
                              <BrainCircuit className="h-4 w-4" />
                              <span className="text-xs font-medium">Enhance</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-gray-500 italic">
                    Provide a clear description of the quiz you want to create. Use our AI enhancement to improve your
                    prompt.
                  </p>
                </div>

                {error && (
                  <div className="p-4 text-sm text-red-700 bg-red-50 rounded-lg border border-red-100 animate-appear">
                    <div className="flex items-center">
                      <svg className="w-5 h-5 mr-2 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                        />
                      </svg>
                      {error}
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <label className="block text-base font-medium text-gray-800">
                    How would you like to use this quiz?
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div
                      onClick={() => !isLoading && prompt.trim() && setSessionType("personal")}
                      className={`relative cursor-pointer rounded-lg border p-4 transition-all duration-200 hover:shadow-md ${
                        !prompt.trim() || isLoading ? "opacity-50 cursor-not-allowed" : ""
                      } ${
                        sessionType === "personal"
                          ? "border-indigo-300 bg-indigo-50 ring-2 ring-indigo-500 ring-opacity-30"
                          : "border-gray-200 bg-white hover:border-indigo-200"
                      }`}
                    >
                      <div className="flex items-center">
                        <div
                          className={`flex-shrink-0 inline-flex p-2 rounded-full ${
                            sessionType === "personal" ? "bg-indigo-100 text-indigo-600" : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          <User className="h-5 w-5" />
                        </div>
                        <div className="ml-3">
                          <h3
                            className={`text-sm font-medium ${
                              sessionType === "personal" ? "text-indigo-800" : "text-gray-700"
                            }`}
                          >
                            Personal Quiz
                          </h3>
                          <p className="text-xs text-gray-500 mt-1">Take the quiz by yourself</p>
                        </div>
                      </div>
                      <div
                        className={`absolute -inset-px rounded-lg border-2 pointer-events-none ${
                          sessionType === "personal" ? "border-indigo-500" : "border-transparent"
                        }`}
                        aria-hidden="true"
                      ></div>
                    </div>

                    <div
                      onClick={() => !isLoading && prompt.trim() && setSessionType("host")}
                      className={`relative cursor-pointer rounded-lg border p-4 transition-all duration-200 hover:shadow-md ${
                        !prompt.trim() || isLoading ? "opacity-50 cursor-not-allowed" : ""
                      } ${
                        sessionType === "host"
                          ? "border-indigo-300 bg-indigo-50 ring-2 ring-indigo-500 ring-opacity-30"
                          : "border-gray-200 bg-white hover:border-indigo-200"
                      }`}
                    >
                      <div className="flex items-center">
                        <div
                          className={`flex-shrink-0 inline-flex p-2 rounded-full ${
                            sessionType === "host" ? "bg-indigo-100 text-indigo-600" : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          <Users className="h-5 w-5" />
                        </div>
                        <div className="ml-3">
                          <h3
                            className={`text-sm font-medium ${
                              sessionType === "host" ? "text-indigo-800" : "text-gray-700"
                            }`}
                          >
                            Host a Quiz
                          </h3>
                          <p className="text-xs text-gray-500 mt-1">Invite others to join</p>
                        </div>
                      </div>
                      <div
                        className={`absolute -inset-px rounded-lg border-2 pointer-events-none ${
                          sessionType === "host" ? "border-indigo-500" : "border-transparent"
                        }`}
                        aria-hidden="true"
                      ></div>
                    </div>
                  </div>
                </div>

                {sessionType === "host" && (
                  <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Session Title</label>
                      <input
                        type="text"
                        value={hostSettings.title}
                        onChange={(e) => setHostSettings((prev) => ({ ...prev, title: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="Enter a title for your quiz session"
                        disabled={isLoading}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Total Spots</label>
                      <input
                        type="number"
                        value={hostSettings.totalSpots}
                        onChange={(e) =>
                          setHostSettings((prev) => ({ ...prev, totalSpots: Number.parseInt(e.target.value) || 10 }))
                        }
                        min="1"
                        max="50"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        disabled={isLoading}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
                      <input
                        type="number"
                        value={hostSettings.durationMinutes}
                        onChange={(e) =>
                          setHostSettings((prev) => ({
                            ...prev,
                            durationMinutes: Number.parseInt(e.target.value) || 30,
                          }))
                        }
                        min="5"
                        max="180"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading || isEnhancing || !isFormValid}
                  className="w-full flex items-center justify-center px-6 py-3 border border-transparent rounded-lg text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow transform hover:-translate-y-0.5"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5" />
                      Generating Quiz...
                    </>
                  ) : (
                    "Generate Quiz"
                  )}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
