import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {auth, userStats } from "../utils/api";


interface RecentSession {
  session_id: string;
  score: number;
  topic: string;
  difficulty: string;
  company: string;
  num_questions: number;
  time_taken: string;
}

export default function History() {
  const [sessions, setSessions] = useState<RecentSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem("access_token");
      const refresh_token=localStorage.getItem("refresh_token");
      if (!token) {
        if(refresh_token){
        const response=await auth.refreshToken(refresh_token);
        localStorage.setItem("access_token",response.data.access_token);
        localStorage.setItem("refresh_token",response.data.refresh_token);
        }
        
        return;
      }

      const response = await userStats.getHistory();
      
      // Check if response.data exists and is an array
      if (Array.isArray(response.data)) {
        setSessions(response.data);
      } else {
        // If the API returns something other than an array, use an empty array
        console.warn("API did not return an array for session history:", response.data);
        setSessions([]);
      }
    } catch (err: any) {
      console.error("Error fetching history:", err);
      
      if (err.response?.status === 401) {
        localStorage.removeItem("access_token");
        navigate("/login", { replace: true });
      } else {
        // Don't set error - we'll handle it as an empty state instead
        setSessions([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [navigate]);

  const handleGenerateQuiz = () => {
    navigate("/quiz/create");
  };

  const handleRetry = () => {
    fetchHistory();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  // Show the login error if user is not authenticated
  if (error && error.includes("logged in")) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-red-500">{error}</p>
        <button 
          onClick={() => navigate("/login")} 
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Go to Login
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold"></h1>
        
      </div>
      
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Sessions</h2>
        <div className="space-y-4">
          {sessions.length > 0 ? (
            sessions.map((session) => (
              <Link
                to={`/quiz-result/${session.session_id}`}
                key={session.session_id}
                className="block"
              >
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:shadow transition-shadow">
                  <div>
                    <h3 className="font-medium items-center text-gray-900 capitalize">
                      {session.topic || "Untitled"} {session.difficulty} Test
                    </h3>
                    <p className="text-sm text-gray-500">
                      Company: {session.company || "N/A"}
                    </p>
                    <p className="text-sm text-gray-500">
                      Questions: {session.num_questions}
                    </p>
                    {/* <p className="text-sm text-gray-500">
                      Time Taken: {session.time_taken}
                    </p> */}
                  </div>
                  <div className="flex items-center">
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
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center p-8 bg-gray-50 rounded-lg">
              <p className="text-gray-500 text-center mb-4">You haven't taken any quizzes yet. Generate your first quiz to see your history here!</p>
              <div className="flex gap-4">
                <button
                  onClick={handleGenerateQuiz}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Generate Your First Quiz
                </button>
                {error && (
                  <button
                    onClick={handleRetry}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Retry Loading
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}