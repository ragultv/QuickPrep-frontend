"use client"

import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { auth, quiz } from "../utils/api"
import { Trophy, Users, Calendar, User } from "lucide-react"

interface Participant {
  id: string
  name: string
  score: number
  position: number
  started_at: string | null
  submitted_at: string | null
  avatar: string
}

interface SessionDetails {
  id: string
  title: string
  host: {
    id: string
    name: string
  }
  total_spots: number
  current_participants: number
  is_active: boolean
  participants: Participant[]
}

export default function SessionDetails() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const [session, setSession] = useState<SessionDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"leaderboard" | "participants">("leaderboard")

  useEffect(() => {
    const checkToken = async () => {
      const token = localStorage.getItem("access_token")
      const refreshToken = localStorage.getItem("refresh_token")

      if (!token && refreshToken) {
        try {
          const response = await auth.refreshToken(refreshToken)
          localStorage.setItem("access_token", response.data.access_token)
          localStorage.setItem("refresh_token", response.data.refresh_token)
          console.log("✅ Token refreshed")
        } catch (err) {
          console.error("❌ Failed to refresh token", err)
          console.log("❌ Token expired, clearing localStorage")
          localStorage.clear()
          navigate("/login")
        }
      }
    }
    checkToken()
  }, [navigate])

  useEffect(() => {
    const fetchSessionDetails = async () => {
      try {
        const response = await quiz.getSessionDetails(sessionId!)
        setSession(response.data)
      } catch (err: any) {
        setError("Failed to load session details.")
      } finally {
        setLoading(false)
      }
    }

    fetchSessionDetails()
  }, [sessionId])

  const handleViewProfile = (userId: string) => {
    navigate(`/profile/${userId}`)
  }

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return "Not started"
    return new Date(dateString).toLocaleString()
  }

  const getMedalEmoji = (position: number) => {
    // Handle both 0-indexed and 1-indexed positions
    const rank = position === 0 ? 1 : position
    switch (rank) {
      case 1:
        return "🥇"
      case 2:
        return "🥈"
      case 3:
        return "🥉"
      default:
        return null
    }
  }

  const getDisplayPosition = (position: number) => {
    // Ensure position is always 1-indexed for display
    return position === 0 ? 1 : position
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    )
  }

  if (error || !session) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="text-red-600">{error || "Session not found"}</div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6 sm:mb-8">{session.title}</h1>

      {/* Session Details - Mobile Card Layout / Desktop Table */}
      <div className="bg-white rounded-lg shadow-sm border mb-6 sm:mb-8 overflow-hidden">
        <div className="px-4 sm:px-6 py-4 bg-gray-50 border-b">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Session Details</h2>
        </div>
        
        {/* Mobile Card Layout */}
        <div className="block sm:hidden divide-y divide-gray-200">
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-900">Host</span>
              </div>
              <span className="text-sm text-gray-700">{session.host.name}</span>
            </div>
          </div>
          
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-900">Participants</span>
              </div>
              <span className="text-sm text-gray-700">
                {session.current_participants} / {session.total_spots}
              </span>
            </div>
          </div>
          
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-900">Status</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${session.is_active ? "bg-green-500" : "bg-gray-500"}`} />
                <span className={`text-sm ${session.is_active ? "text-green-700" : "text-gray-700"}`}>
                  {session.is_active ? "Active" : "Completed"}
                </span>
              </div>
            </div>
          </div>
          
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-900">Completed</span>
              </div>
              <span className="text-sm text-gray-700">
                {session.participants.filter((p) => p.submitted_at).length} participants
              </span>
            </div>
          </div>
        </div>

        {/* Desktop Table Layout */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full">
            <tbody className="divide-y divide-gray-200">
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 bg-gray-50 w-1/4">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-500" />
                    Host
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{session.host.name}</td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 bg-gray-50">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-gray-500" />
                    Participants
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  {session.current_participants} / {session.total_spots}
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 bg-gray-50">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    Status
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${session.is_active ? "bg-green-500" : "bg-gray-500"}`} />
                    <span className={session.is_active ? "text-green-700" : "text-gray-700"}>
                      {session.is_active ? "Active" : "Completed"}
                    </span>
                  </div>
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 bg-gray-50">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-gray-500" />
                    Completed
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  {session.participants.filter((p) => p.submitted_at).length} participants
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Tab Navigation - Responsive */}
      <div className="flex justify-center mb-6 sm:mb-8">
        <div className="flex gap-2 sm:gap-4 w-full sm:w-auto">
          <button
            className={`flex-1 sm:flex-none px-4 sm:px-6 py-2 rounded-lg font-medium transition-colors text-sm sm:text-base ${
              activeTab === "leaderboard" ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
            onClick={() => setActiveTab("leaderboard")}
          >
            <div className="flex items-center justify-center gap-2">
              <Trophy className="w-4 h-4" />
              <span className="hidden sm:inline">Leaderboard</span>
              <span className="sm:hidden">Ranks</span>
            </div>
          </button>
          <button
            className={`flex-1 sm:flex-none px-4 sm:px-6 py-2 rounded-lg font-medium transition-colors text-sm sm:text-base ${
              activeTab === "participants" ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
            onClick={() => setActiveTab("participants")}
          >
            <div className="flex items-center justify-center gap-2">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Participants</span>
              <span className="sm:hidden">All</span>
            </div>
          </button>
        </div>
      </div>

      {/* Leaderboard Tab */}
      {activeTab === "leaderboard" && (
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="px-4 sm:px-6 py-4 bg-gray-50 border-b">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              Leaderboard
            </h2>
          </div>

          {/* Mobile Card Layout for Leaderboard */}
          <div className="block sm:hidden divide-y divide-gray-200">
            {session.participants
              .filter((p) => p.submitted_at)
              .sort((a, b) => b.score - a.score) // Sort by score descending
              .map((participant, index) => (
                <div key={participant.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        {getMedalEmoji(index + 1) ? (
                          <span className="text-lg">{getMedalEmoji(index + 1)}</span>
                        ) : (
                          <span className="w-6 h-6 flex items-center justify-center bg-gray-100 rounded-full text-xs font-bold">
                            {index + 1}
                          </span>
                        )}
                      </div>
                      <img
                        src={participant.avatar || "/placeholder.svg"}
                        alt={participant.name}
                        className="w-8 h-8 rounded-full"
                      />
                      <span className="text-sm font-medium text-gray-900">{participant.name}</span>
                    </div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      {participant.score}%
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 space-y-1">
                    <div>Completed: {formatDateTime(participant.submitted_at)}</div>
                  </div>
                </div>
              ))}
          </div>

          {/* Desktop Table Layout for Leaderboard */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rank
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Participant
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Completed
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Score
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {session.participants
                  .filter((p) => p.submitted_at)
                  .sort((a, b) => b.score - a.score) // Sort by score descending
                  .map((participant, index) => (
                    <tr key={participant.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        <div className="flex items-center gap-2">
                          {getMedalEmoji(index + 1) ? (
                            <span className="text-lg">{getMedalEmoji(index + 1)}</span>
                          ) : (
                            <span className="w-6 h-6 flex items-center justify-center bg-gray-100 rounded-full text-xs font-bold">
                              {index + 1}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <img
                            src={participant.avatar || "/placeholder.svg"}
                            alt={participant.name}
                            className="w-8 h-8 rounded-full"
                          />
                          <span className="text-sm font-medium text-gray-900">{participant.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDateTime(participant.submitted_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {participant.score}%
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {/* Empty State */}
          {session.participants.filter((p) => p.submitted_at).length === 0 && (
            <div className="text-center py-12">
              <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No completed submissions yet</h3>
              <p className="text-gray-500 text-sm sm:text-base px-4">Participants haven{"'"}t finished the quiz yet.</p>
            </div>
          )}
        </div>
      )}

      {/* Participants Tab */}
      {activeTab === "participants" && (
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="px-4 sm:px-6 py-4 bg-gray-50 border-b">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-500" />
              All Participants
            </h2>
          </div>

          {/* Mobile Card Layout for Participants */}
          <div className="block sm:hidden divide-y divide-gray-200">
            {session.participants.map((participant) => (
              <div
                key={participant.id}
                className="p-4 hover:bg-gray-50 cursor-pointer"
                onClick={() => handleViewProfile(participant.id)}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={participant.avatar || "/placeholder.svg"}
                      alt={participant.name}
                      className="w-8 h-8 rounded-full"
                    />
                    <span className="text-sm font-medium text-gray-900">{participant.name}</span>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {participant.submitted_at ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Completed
                      </span>
                    ) : participant.started_at ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        In Progress
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        Not Started
                      </span>
                    )}
                    {/* {participant.submitted_at ? (
                      <span className="text-sm font-medium">{participant.score}%</span>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )} */}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table Layout for Participants */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Participant
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Score
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {session.participants.map((participant) => (
                  <tr
                    key={participant.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleViewProfile(participant.id)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <img
                          src={participant.avatar || "/placeholder.svg"}
                          alt={participant.name}
                          className="w-8 h-8 rounded-full"
                        />
                        <span className="text-sm font-medium text-gray-900">{participant.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {participant.submitted_at ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Completed
                        </span>
                      ) : participant.started_at ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          In Progress
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          Not Started
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {participant.submitted_at ? (
                        <span className="font-medium">{participant.score}%</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Empty State */}
          {session.participants.length === 0 && (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No participants yet</h3>
              <p className="text-gray-500 text-sm sm:text-base px-4">Share the session link to get participants.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}