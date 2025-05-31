"use client"

import { useEffect, useState } from "react"
import { SettingsIcon } from "lucide-react"
import { useNavigate } from "react-router-dom"
import type { UserProfile } from "../types"
import { auth, users, userStats } from "../utils/api"
import { eachDayOfInterval, format } from "date-fns"

// ← added: define props so Profile can receive onLogout callback
interface ProfileProps {
  onLogout: () => void
}

export default function Profile({ onLogout }: ProfileProps) {
  // ← changed: accept onLogout
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const navigate = useNavigate()
  const [contributions, setContributions] = useState<{ [date: string]: number }>({})

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem("access_token")
        const refreshToken = localStorage.getItem("refresh_token")

        // If no access token but refresh token exists, try to refresh
        if (!token && refreshToken) {
          const response = await auth.refreshToken(refreshToken)
          localStorage.setItem("access_token", response.data.access_token)
          localStorage.setItem("refresh_token", response.data.refresh_token)
        }

        if (!token) {
          navigate("/login")
          return
        }

        // Now we have a valid token, continue fetching
        const res = await users.getMe()
        setProfile({
          name: res.data.name,
          email: res.data.email,
          avatar: "https://mrwallpaper.com/images/high/funny-baby-with-mustache-ls1hyj6cikry3zsx.webp",
          quizzesTaken: 24,
          topSubjects: ["JavaScript", "Python"],
          averageScore: 85,
        })

        // Get sessions data for the heatmap
        const sessionsRes = await userStats.getSessionsByDate()
        setContributions(sessionsRes.data.sessions_by_date)
      } catch (err) {
        console.error(err)
        navigate("/login")
      }
    }

    fetchProfile()
  }, [navigate])

  const handleLogout = () => {
    localStorage.removeItem("access_token")
    localStorage.removeItem("refresh_token")
    onLogout() // ← changed: actually invoke the prop
    navigate("/login", { replace: true })
  } // ← added: close handleLogout

  if (!profile)
    // ← moved out of handleLogout
    return <div className="text-center py-20">Loading profile...</div>

  return (
    <div className="w-full max-w-5xl mx-auto px-4 overflow-x-hidden">
      <div className="bg-white rounded-xl shadow-lg overflow-hidden p-4 sm:p-6 relative w-full">
        <div className="absolute top-6 right-6">
          <button
            onClick={() => navigate("/settings")}
            className="bg-indigo-100 hover:bg-indigo-200 text-indigo-600 rounded-full p-2 shadow transition-colors"
            title="Settings"
          >
            <SettingsIcon className="w-6 h-6" />
          </button>
        </div>
        <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6">
          <img
            src={profile.avatar || "/placeholder.svg"}
            alt={profile.name}
            className="h-20 w-20 sm:h-24 sm:w-24 rounded-full"
          />
          <div className="text-center sm:text-left">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{profile.name}</h1>
            <p className="text-gray-500">{profile.email}</p>
          </div>
        </div>

        {/* Contribution Calendar */}
        <div className="mt-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Session History</h2>
          <ContributionCalendar contributions={contributions} />
        </div>
      </div>
    </div>
  )
}

// --- Contribution Calendar Component ---
function ContributionCalendar({ contributions }: { contributions: { [date: string]: number } }) {
  // Get the current year starting from January 1st
  const year = new Date().getFullYear()
  const start = new Date(year, 0, 1) // January 1st
  const end = new Date(year, 11, 31) // December 31st

  const days = eachDayOfInterval({ start, end })
  const max = Math.max(1, ...Object.values(contributions))

  // Calculate month positions based on where each month's first day appears
  const monthPositions: { month: string; position: number }[] = []

  days.forEach((day, index) => {
    if (day.getDate() === 1) {
      // First day of the month
      const weekIndex = Math.floor(index / 7)
      monthPositions.push({
        month: format(day, "MMM"),
        position: weekIndex * 16, // 16px per week column (12px width + 4px gap)
      })
    }
  })

  // Get color based on contribution count (white theme)
  const getColor = (count: number) => {
    if (count === 0) return "#f8f9fa" // Very light gray for empty cells
    if (count < max * 0.25) return "#404040" // Light gray
    if (count < max * 0.5) return "#808080" // Medium light gray
    if (count < max * 0.75) return "#BFBFBF" // Medium gray
    return "#000000" // Darker gray
  }

  return (
    <div className="bg-white rounded-lg p-4 overflow-x-auto border border-gray-200">
      {/* Month labels */}
      <div className="relative h-6 mb-2 ml-12 text-gray-600">
        {monthPositions.map(({ month, position }, idx) => (
          <span key={idx} className="absolute text-xs font-medium" style={{ left: `${position}px` }}>
            {month}
          </span>
        ))}
      </div>

      <div className="flex">
        {/* Weekday labels */}
        <div className="flex flex-col justify-between mr-2 h-[84px] text-gray-500">
          <div className="text-xs h-4">Mon</div>
          <div className="text-xs h-4">Wed</div>
          <div className="text-xs h-4">Fri</div>
        </div>

        {/* Contribution grid */}
        <div className="grid grid-flow-col gap-1">
          {Array.from({ length: Math.ceil(days.length / 7) }).map((_, weekIndex) => (
            <div key={weekIndex} className="grid grid-rows-7 gap-1">
              {Array.from({ length: 7 }).map((_, dayIndex) => {
                const dayOffset = weekIndex * 7 + dayIndex
                if (dayOffset >= days.length) return <div key={dayIndex} className="w-3 h-3" />

                const date = days[dayOffset]
                const dateStr = format(date, "yyyy-MM-dd")
                const count = contributions[dateStr] || 0

                return (
                  <div
                    key={dayIndex}
                    title={`${format(date, "MMM d, yyyy")}: ${count} session${count !== 1 ? "s" : ""}`}
                    className="w-3 h-3 rounded-sm transition-colors duration-200 border border-gray-300"
                    style={{ backgroundColor: getColor(count) }}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between mt-3 px-12">
        <div className="text-xs text-gray-500">Sessions completed per day</div>
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-500">Less</span>
          <div className="w-3 h-3 rounded-sm border border-gray-300" style={{ backgroundColor: "#f8f9fa" }}></div>
          <div className="w-3 h-3 rounded-sm border border-gray-300" style={{ backgroundColor: "#e9ecef" }}></div>
          <div className="w-3 h-3 rounded-sm border border-gray-300" style={{ backgroundColor: "#dee2e6" }}></div>
          <div className="w-3 h-3 rounded-sm border border-gray-300" style={{ backgroundColor: "#ced4da" }}></div>
          <div className="w-3 h-3 rounded-sm border border-gray-300" style={{ backgroundColor: "#adb5bd" }}></div>
          <span className="text-xs text-gray-500">More</span>
        </div>
      </div>
    </div>
  )
}
