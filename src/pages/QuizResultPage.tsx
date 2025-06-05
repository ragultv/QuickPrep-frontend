import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { CheckCircle, XCircle, Trophy, ArrowLeft, PlusCircle, Brain } from "lucide-react";
import { auth, quiz } from "../utils/api";

interface QuestionResult {
  question_id: string;
  question: string;
  options: string[];
  selected_option: string;
  correct_answer: string;
  is_correct: boolean;
  explanation?: string;
}

interface QuizResultResponse {
  questions: QuestionResult[];
  score: number;
  total_questions: number;
}

export default function QuizResultPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [result, setResult] = useState<QuizResultResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
          if (sessionId) {
            navigate('/dashboard', { replace: true });
          } else {
            navigate('/login');
          }
        }
      }
    };
    checkToken();
  }, [navigate, sessionId]);

  useEffect(() => {
    const fetchResults = async () => {
      if (!sessionId) return;

      try {
        const resp = await quiz.getResults(sessionId);
        setResult(resp.data);
      } catch (e: any) {
        setError(e.response?.data?.detail || "Failed to load results.");
      } finally {
        setLoading(false);
      }
    };
    fetchResults();
  }, [sessionId]);

  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      navigate('/', { replace: true });
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <p className="text-lg text-gray-600">Loading results...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Brain className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <p className="text-red-500">{error}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="mt-4 px-6 py-3 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-colors duration-200 flex items-center gap-2 mx-auto"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!result) return null;

  const { questions, score, total_questions } = result;
  const percent = Math.round((score / total_questions) * 100);

  const getScoreMessage = (percent: number) => {
    if (percent >= 80) return 'Excellent!';
    if (percent >= 60) return 'Good job!';
    if (percent >= 40) return 'Keep practicing!';
    return 'Need improvement';
  };

  return (
    <div className="min-h-screen bg-gray-50 py-4 sm:py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Score Header */}
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6 sm:p-8 text-white">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl sm:text-3xl font-bold">Quiz Results</h1>
              <Trophy className="w-6 h-6 sm:w-8 sm:h-8" />
            </div>
            <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 sm:gap-0">
              <div>
                <p className="text-base sm:text-lg opacity-90">Your Score</p>
                <p className="text-4xl sm:text-5xl font-bold mt-1 sm:mt-2">{percent}%</p>
                <p className="mt-1 sm:mt-2 text-base sm:text-lg opacity-90">
                  {score} out of {total_questions} correct
                </p>
              </div>
              <p className="text-xl sm:text-2xl font-semibold">{getScoreMessage(percent)}</p>
            </div>
          </div>

          {/* Questions Review */}
          <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
            {questions.map((q, i) => (
              <div
                key={q.question_id}
                className="bg-white rounded-xl border shadow-sm overflow-hidden"
              >
                <div className={`p-3 sm:p-4 ${q.is_correct ? 'bg-emerald-50' : 'bg-red-50'}`}>
                  <div className="flex items-center gap-2 sm:gap-3">
                    {q.is_correct ? (
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-700" />
                        <span className="font-medium text-emerald-700">Correct</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <XCircle className="h-5 w-5 sm:h-6 sm:w-6 text-red-700" />
                        <span className="font-medium text-red-700">Incorrect</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-3 sm:p-4">
                  <p className="text-base sm:text-lg font-medium text-gray-900 mb-3 sm:mb-4">
                    Question {i + 1}: {q.question}
                  </p>
                  <div className="space-y-2 sm:space-y-3">
                    {q.options.map((opt, idx) => {
                      const letter = String.fromCharCode(65 + idx);
                      const isUserAnswer = letter === q.selected_option;
                      const isCorrectAnswer = letter === q.correct_answer;

                      return (
                        <div
                          key={idx}
                          className={`p-2 sm:p-3 rounded-lg transition-colors duration-200 ${
                            isCorrectAnswer
                              ? 'bg-emerald-50 border border-emerald-200'
                              : isUserAnswer && !q.is_correct
                              ? 'bg-red-50 border border-red-200'
                              : 'hover:bg-gray-50 border border-gray-200'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className={`text-sm sm:text-base ${
                              isCorrectAnswer
                                ? 'text-emerald-700'
                                : isUserAnswer && !q.is_correct
                                ? 'text-red-700'
                                : 'text-gray-700'
                            }`}>
                              {letter}. {opt}
                            </span>
                            {(isCorrectAnswer || (isUserAnswer && !q.is_correct)) && (
                              <span className={`text-xs sm:text-sm font-medium ${
                                isCorrectAnswer ? 'text-emerald-600' : 'text-red-600'
                              }`}>
                                {isCorrectAnswer ? 'Correct Answer' : 'Your Answer'}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {!q.is_correct && q.explanation && (
                    <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-xs sm:text-sm font-medium text-amber-900 mb-1">Explanation:</p>
                      <p className="text-xs sm:text-sm text-amber-800">{q.explanation}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="p-4 sm:p-6 bg-gray-50 border-t">
            <div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="px-4 sm:px-6 py-2.5 sm:py-3 flex items-center justify-center gap-2 text-gray-700 bg-white border border-gray-300 rounded-full hover:bg-gray-50 transition-colors duration-200 w-full sm:w-auto"
              >
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                Back to Dashboard
              </button>
              <button
                onClick={() => navigate('/quiz/create')}
                className="px-4 sm:px-6 py-2.5 sm:py-3 flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full hover:from-indigo-700 hover:to-purple-700 transition-colors duration-200 w-full sm:w-auto"
              >
                <PlusCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                Create New Quiz
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}