import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { CheckCircle, XCircle } from "lucide-react";
import { quiz } from "../utils/api";

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

  if (loading) return <p className="text-center p-6">Loading results…</p>;
  if (error)   return <p className="text-center text-red-500">{error}</p>;
  if (!result) return null;

  const { questions, score, total_questions } = result;
  const percent = Math.round((score / total_questions) * 100);

  return (
    <div className="max-w-3xl mx-auto p-4">
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <h1 className="text-2xl font-bold mb-4">Quiz Results</h1>
        <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg mb-6">
          <div>
            <p className="text-lg font-semibold">Your Score</p>
            <p className="text-gray-600">
              {score} of {total_questions} correct
            </p>
          </div>
          <p className="text-3xl font-bold text-indigo-600">{percent}%</p>
        </div>

        <div className="space-y-6">
          {questions.map((q, i) => {
            const isCorrect = q.is_correct;
            return (
              <div
                key={q.question_id}
                className={`p-4 rounded-lg border ${
                  isCorrect ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  {isCorrect ? (
                    <>
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="text-green-700 font-medium">Correct</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-5 w-5 text-red-600" />
                      <span className="text-red-700 font-medium">Incorrect</span>
                    </>
                  )}
                </div>

                <p className="text-gray-800 font-medium mb-2">
                  Question {i + 1}: {q.question}
                </p>

                <div className="space-y-1 text-sm">
                  {q.options.map((opt, idx) => {
                    const letter = String.fromCharCode(65 + idx);
                    const isUser  = letter === q.selected_option;
                    const isCorrectAnswer = letter === q.correct_answer;
                    return (
                      <div
                        key={idx}
                        className={`p-2 rounded flex justify-between ${
                          isCorrectAnswer
                            ? "bg-green-100 border border-green-200"
                            : isUser && !isCorrect
                            ? "bg-red-100 border border-red-200"
                            : "bg-white border border-gray-200"
                        }`}
                      >
                        <span
                          className={
                            isCorrectAnswer
                              ? "text-green-700"
                              : isUser && !isCorrect
                              ? "text-red-700"
                              : "text-gray-700"
                          }
                        >
                          {letter}. {opt}
                        </span>
                        {isCorrectAnswer && (
                          <span className="text-sm text-green-600 font-medium">
                            Correct Answer
                          </span>
                        )}
                        {isUser && !isCorrect && (
                          <span className="text-sm text-red-600 font-medium">
                            Your Answer
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {!isCorrect && q.explanation && (
                  <div className="mt-3 p-3 bg-white border border-gray-200 rounded">
                    <p className="text-sm font-medium text-gray-900">Explanation:</p>
                    <p className="text-sm text-gray-700">{q.explanation}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
