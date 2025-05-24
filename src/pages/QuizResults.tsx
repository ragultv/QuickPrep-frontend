import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle } from 'lucide-react';
import type { Question } from '../types';
import { useEffect } from 'react'
import { auth } from '../utils/api';

interface QuizResultsState {
  questions: Question[];
  userAnswers: number[];
  score: number;
  totalQuestions: number;
}

export default function QuizResults() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as QuizResultsState;

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

  // If user tries to hit Back, force them to Dashboard (or Create)
  useEffect(() => {
    // push a dummy entry so that Back stays on this page
    window.history.pushState(null, '', window.location.href)

    const onPop = () => {
      navigate('/', { replace: true })  // send them home
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [navigate])

  if (!state) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-500">No quiz results found</p>
          <button
            onClick={() => navigate('/quiz/create')}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Create New Quiz
          </button>
        </div>
      </div>
    );
  }

  const { questions, userAnswers, score, totalQuestions } = state;
  const percentage = Math.round((score / totalQuestions) * 100);

  // Debugging: Log the entire state
  console.log("QuizResults State:", state);

  return (
    <div className="max-w-3xl mx-auto p-4">
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <h1 className="text-2xl font-bold mb-4">Quiz Results</h1>
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg mb-6">
          <div>
            <p className="text-lg font-semibold">Your Score</p>
            <p className="text-gray-600">
              {score} out of {totalQuestions} questions correct
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-indigo-600">{percentage}%</p>
          </div>
        </div>

        <div className="space-y-6">
          {questions.map((question, index) => {
            const userAnswer = userAnswers[index];
            const userAnswerLetter = String.fromCharCode(97 + userAnswer).toUpperCase();

            // Debugging: Log the question and correct answer
            console.log(`Question ${index + 1}:`, question);
            console.log(`Correct Answer:`, question.correctAnswer);

            // Ensure correctAnswer is a string before calling toUpperCase
            const correctAnswer = typeof question.correctAnswer === 'string'
              ? question.correctAnswer.toUpperCase()
              : String.fromCharCode(question.correctAnswer);

            const isCorrect = userAnswerLetter === correctAnswer;

            console.log(`User Answer: ${userAnswerLetter}, Is Correct: ${isCorrect}`);

            return (
              <div
                key={question.id}
                className={`p-4 rounded-lg border ${
                  isCorrect ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                }`}
              >
                <div className="flex items-start gap-3">
                  {isCorrect ? (
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0" />
                      <span className="text-green-700 font-medium">Correct</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <XCircle className="h-6 w-6 text-red-600 flex-shrink-0" />
                      <span className="text-red-700 font-medium">Incorrect</span>
                    </div>
                  )}
                </div>

                <div className="mt-3">
                  <p className="font-medium mb-2">
                    Question {index + 1}: {question.question}
                  </p>
                  <div className="space-y-2">
                    {question.options.map((option, optionIndex) => {
                      const isUserAnswer = optionIndex === userAnswer;
                      const correctAnswerIndex = typeof question.correctAnswer === 'string'
                        ? question.correctAnswer.charCodeAt(0) - 65
                        : question.correctAnswer; // Handle case where correctAnswer is not a string
                      const isCorrectAnswer = optionIndex === correctAnswerIndex;

                      return (
                        <div
                          key={optionIndex}
                          className={`p-3 rounded ${
                            isCorrectAnswer
                              ? 'bg-green-100 border border-green-200'
                              : isUserAnswer && !isCorrect
                              ? 'bg-red-100 border border-red-200'
                              : 'bg-white border border-gray-200'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span
                              className={
                                isCorrectAnswer
                                  ? 'text-green-700'
                                  : isUserAnswer && !isCorrect
                                  ? 'text-red-700'
                                  : 'text-gray-700'
                              }
                            >
                              {option}
                            </span>
                            {isCorrectAnswer && (
                              <span className="text-sm text-green-600 font-medium">
                                Correct Answer
                              </span>
                            )}
                            {isUserAnswer && !isCorrect && (
                              <span className="text-sm text-red-600 font-medium">
                                Your Answer
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {!isCorrect && question.explanation && (
                    <div className="mt-3 p-3 bg-white border border-gray-200 rounded">
                      <p className="text-sm font-medium text-gray-900">Explanation:</p>
                      <p className="text-sm text-gray-700">
                        {question.explanation}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-8 flex justify-between gap-4">
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Back to Dashboard
          </button>
          <button
            onClick={() => navigate('/quiz/create')}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Create New Quiz
          </button>
        </div>
      </div>
    </div>
  );
}
