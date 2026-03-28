import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CheckSquare, TrendingUp, Flame, Clock, Calendar } from 'lucide-react'
import { format, parseISO, differenceInDays } from 'date-fns'
import toast from 'react-hot-toast'
import api from '../api'
import StatsCard from '../components/StatsCard'
import { useAuth } from '../contexts/AuthContext'

export default function DashboardPage() {
  const { user } = useAuth()
  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/analytics/dashboard').then(r => r.data),
    retry: 1,
  })

  const [predForm, setPredForm] = useState({ study_hours: 6, sleep_hours: 7, social_media_hours: 2 })
  const [prediction, setPrediction] = useState(null)
  const [predLoading, setPredLoading] = useState(false)

  const runPrediction = async () => {
    setPredLoading(true)
    try {
      const res = await api.get('/analytics/performance-prediction', { params: predForm })
      setPrediction(res.data)
    } catch {
      toast.error('Prediction failed')
    } finally {
      setPredLoading(false)
    }
  }

  const generateSchedule = async () => {
    try {
      await api.post('/schedule/generate')
      toast.success('Schedule generated!')
    } catch {
      toast.error('Failed to generate schedule')
    }
  }

  const getUrgencyColor = (deadline) => {
    if (!deadline) return 'text-gray-500'
    const days = differenceInDays(parseISO(deadline), new Date())
    if (days < 2) return 'text-red-600'
    if (days < 5) return 'text-orange-500'
    return 'text-green-600'
  }

  const stats = dashboard?.stats || {}
  const upcomingTasks = dashboard?.upcoming_tasks || []

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-2xl p-6 text-white">
        <h2 className="text-2xl font-bold mb-1">
          Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, {user?.full_name?.split(' ')[0] || user?.username}! 👋
        </h2>
        <p className="text-primary-100">Let&apos;s make today productive. You&apos;ve got this!</p>
        <button
          onClick={generateSchedule}
          className="mt-4 bg-white text-primary-700 font-semibold px-5 py-2 rounded-lg hover:bg-primary-50 transition-colors text-sm"
        >
          🗓 Generate Today&apos;s Schedule
        </button>
      </div>

      {/* Stats */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-6 shadow-sm animate-pulse h-32" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard icon={CheckSquare} value={stats.total_tasks ?? 0} label="Total Tasks" color="primary" />
          <StatsCard icon={TrendingUp} value={stats.completed_today ?? 0} label="Completed Today" color="green" />
          <StatsCard icon={Clock} value={`${Math.round(stats.completion_rate ?? 0)}%`} label="Completion Rate" color="orange" />
          <StatsCard icon={Flame} value={stats.current_streak ?? 0} label="Day Streak 🔥" color="purple" />
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Upcoming Deadlines */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-primary-600" />
            <h3 className="font-semibold text-gray-900">Upcoming Deadlines</h3>
          </div>
          {upcomingTasks.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">No upcoming tasks 🎉</p>
          ) : (
            <ul className="space-y-3">
              {upcomingTasks.slice(0, 5).map(task => (
                <li key={task.id} className="flex items-center justify-between gap-3 py-2 border-b border-gray-50 last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{task.title}</p>
                    <p className="text-xs text-gray-400">{task.task_type}</p>
                  </div>
                  {task.deadline && (
                    <span className={`text-xs font-semibold whitespace-nowrap ${getUrgencyColor(task.deadline)}`}>
                      {format(parseISO(task.deadline), 'MMM d')}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Performance Prediction */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">⚡ Quick Performance Check</h3>
          <div className="space-y-4">
            {[
              { key: 'study_hours', label: 'Study Hours', min: 0, max: 12 },
              { key: 'sleep_hours', label: 'Sleep Hours', min: 4, max: 12 },
              { key: 'social_media_hours', label: 'Social Media Hours', min: 0, max: 8 },
            ].map(({ key, label, min, max }) => (
              <div key={key}>
                <div className="flex justify-between text-sm mb-1">
                  <label className="text-gray-600">{label}</label>
                  <span className="font-medium text-primary-600">{predForm[key]}h</span>
                </div>
                <input
                  type="range"
                  min={min}
                  max={max}
                  value={predForm[key]}
                  onChange={e => setPredForm({ ...predForm, [key]: Number(e.target.value) })}
                  className="w-full accent-primary-600"
                />
              </div>
            ))}
            <button
              onClick={runPrediction}
              disabled={predLoading}
              className="w-full bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white font-semibold py-2 rounded-lg text-sm transition-colors"
            >
              {predLoading ? 'Predicting...' : 'Predict Performance'}
            </button>
            {prediction && (
              <div className={`p-4 rounded-lg text-center ${prediction.prediction === 'High Performance' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <p className={`font-bold text-lg ${prediction.prediction === 'High Performance' ? 'text-green-700' : 'text-red-700'}`}>
                  {prediction.prediction}
                </p>
                {prediction.probability && (
                  <p className="text-sm text-gray-600 mt-1">Confidence: {(prediction.probability * 100).toFixed(0)}%</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
