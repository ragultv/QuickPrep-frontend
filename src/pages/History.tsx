import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { userStats } from "../utils/api";

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

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const token = localStorage.getItem("access_token");
        if (!token) {
          setError("You must be logged in to view your history.");
          setLoading(false);
          return;
        }

        const response = await userStats.getHistory();
        setSessions(response.data);
      } catch (err: any) {
        if (err.response?.status === 401) {
          setError("Unauthorized. Please log in again.");
          navigate("/login");
        } else {
          setError("Failed to fetch quiz session history.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [navigate]);

  if (loading) {
    return <div className="text-center mt-10">Loading...</div>;
  }

  if (error) {
    return <div className="text-center mt-10 text-red-500">{error}</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold">Quiz Session History</h1>
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Quizzes</h2>
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
                    <h3 className="font-medium text-gray-900 capitalize">
                      {session.topic || "Untitled"} {session.difficulty} Test
                    </h3>
                    <p className="text-sm text-gray-500">
                      Company: {session.company || "N/A"}
                    </p>
                    <p className="text-sm text-gray-500">
                      Questions: {session.num_questions}
                    </p>
                    <p className="text-sm text-gray-500">
                      Time Taken: {session.time_taken}
                    </p>
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
            <p className="text-gray-500">No recent sessions available.</p>
          )}
        </div>
      </div>
    </div>
  );
}
