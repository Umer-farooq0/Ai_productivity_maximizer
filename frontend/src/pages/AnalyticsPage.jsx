import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import toast from 'react-hot-toast'
import { TrendingUp, CheckSquare, Clock, Brain } from 'lucide-react'
import api from '../api'
import StatsCard from '../components/StatsCard'

const DIET_OPTIONS = ['Poor', 'Fair', 'Good']
const PARENTAL_EDU = ['None', 'High School', 'Bachelor', 'Master']
const INTERNET = ['Poor', 'Average', 'Good']

const INITIAL_PRED = {
  age: 20, study_hours_per_day: 5, social_media_hours: 2, netflix_hours: 1,
  part_time_job: false, attendance_percentage: 80, sleep_hours: 7,
  diet_quality: 'Good', exercise_frequency: 3, parental_education_level: 'Bachelor',
  internet_quality: 'Good', mental_health_rating: 7, extracurricular_participation: false,
}

export default function AnalyticsPage() {
  const { data: dashboard } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/analytics/dashboard').then(r => r.data),
    retry: 1,
  })

  const [predForm, setPredForm] = useState(INITIAL_PRED)
  const [prediction, setPrediction] = useState(null)
  const [loading, setLoading] = useState(false)

  const runPrediction = async () => {
    setLoading(true)
    try {
      const params = { ...predForm }
      const res = await api.get('/analytics/performance-prediction', { params })
      setPrediction(res.data)
    } catch {
      toast.error('Prediction failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const stats = dashboard?.stats || {}
  const chartData = dashboard?.weekly_completions || []

  const sliderField = (key, label, min, max, step = 1) => (
    <div key={key}>
      <div className="flex justify-between text-sm mb-1">
        <label className="text-gray-600">{label}</label>
        <span className="font-medium text-primary-600">{predForm[key]}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={predForm[key]}
        onChange={e => setPredForm({ ...predForm, [key]: Number(e.target.value) })}
        className="w-full accent-primary-600" />
    </div>
  )

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Analytics</h2>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard icon={CheckSquare} value={stats.completed_this_week ?? 0} label="Completed This Week" color="green" />
        <StatsCard icon={Clock} value={`${stats.total_study_hours ?? 0}h`} label="Study Hours Logged" color="primary" />
        <StatsCard icon={TrendingUp} value={`${Math.round(stats.completion_rate ?? 0)}%`} label="Completion Rate" color="orange" />
        <StatsCard icon={Brain} value={stats.current_streak ?? 0} label="Day Streak" color="purple" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Bar chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Tasks Completed (Last 7 Days)</h3>
          {chartData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-gray-300">
              <p className="text-sm">No data available</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData}>
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={`hsl(${210 + i * 10}, 70%, ${55 + i * 3}%)`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Completion rate visual */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Overall Progress</h3>
          <div className="flex flex-col items-center justify-center h-48 gap-4">
            <div className="relative w-36 h-36">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="50" fill="none" stroke="#e5e7eb" strokeWidth="12" />
                <circle cx="60" cy="60" r="50" fill="none" stroke="#3b82f6" strokeWidth="12"
                  strokeDasharray={`${2 * Math.PI * 50}`}
                  strokeDashoffset={`${2 * Math.PI * 50 * (1 - (stats.completion_rate || 0) / 100)}`}
                  strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold text-gray-900">{Math.round(stats.completion_rate ?? 0)}%</span>
              </div>
            </div>
            <p className="text-gray-500 text-sm text-center">
              {stats.completed_tasks ?? 0} of {stats.total_tasks ?? 0} tasks completed
            </p>
          </div>
        </div>
      </div>

      {/* Performance Prediction form */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="font-semibold text-gray-900 mb-6 flex items-center gap-2">
          <Brain className="w-5 h-5 text-primary-600" />
          Performance Prediction
        </h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            {sliderField('age', 'Age', 15, 35)}
            {sliderField('study_hours_per_day', 'Study Hours/Day', 0, 12, 0.5)}
            {sliderField('social_media_hours', 'Social Media Hours', 0, 8, 0.5)}
            {sliderField('netflix_hours', 'Netflix Hours', 0, 6, 0.5)}
            {sliderField('sleep_hours', 'Sleep Hours', 4, 12, 0.5)}
            {sliderField('attendance_percentage', 'Attendance %', 0, 100)}
            {sliderField('exercise_frequency', 'Exercise Days/Week', 0, 7)}
            {sliderField('mental_health_rating', 'Mental Health (1-10)', 1, 10)}
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Diet Quality</label>
              <select value={predForm.diet_quality} onChange={e => setPredForm({ ...predForm, diet_quality: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none">
                {DIET_OPTIONS.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Parental Education</label>
              <select value={predForm.parental_education_level} onChange={e => setPredForm({ ...predForm, parental_education_level: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none">
                {PARENTAL_EDU.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Internet Quality</label>
              <select value={predForm.internet_quality} onChange={e => setPredForm({ ...predForm, internet_quality: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none">
                {INTERNET.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" id="part_time" checked={predForm.part_time_job}
                onChange={e => setPredForm({ ...predForm, part_time_job: e.target.checked })}
                className="w-4 h-4 accent-primary-600" />
              <label htmlFor="part_time" className="text-sm text-gray-600">Part-time job</label>
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" id="extracurricular" checked={predForm.extracurricular_participation}
                onChange={e => setPredForm({ ...predForm, extracurricular_participation: e.target.checked })}
                className="w-4 h-4 accent-primary-600" />
              <label htmlFor="extracurricular" className="text-sm text-gray-600">Extracurricular participation</label>
            </div>

            <button onClick={runPrediction} disabled={loading}
              className="w-full bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors mt-4">
              {loading ? 'Predicting...' : 'Predict My Performance'}
            </button>

            {prediction && (
              <div className={`p-5 rounded-xl border-2 text-center ${prediction.prediction === 'High Performance' || prediction.predicted_performance === 'High Performance'
                ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}`}>
                <div className={`text-2xl font-bold mb-2 ${prediction.prediction === 'High Performance' || prediction.predicted_performance === 'High Performance'
                  ? 'text-green-700' : 'text-red-700'}`}>
                  {prediction.prediction || prediction.predicted_performance || 'Result'}
                </div>
                {(prediction.probability || prediction.confidence) && (
                  <p className="text-sm text-gray-600 mb-3">
                    Confidence: {((prediction.probability || prediction.confidence) * 100).toFixed(0)}%
                  </p>
                )}
                {prediction.tips && prediction.tips.length > 0 && (
                  <div className="text-left mt-3">
                    <p className="text-sm font-semibold text-gray-700 mb-2">Improvement Tips:</p>
                    <ul className="space-y-1">
                      {prediction.tips.map((tip, i) => (
                        <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                          <span className="text-primary-500 mt-0.5">•</span>{tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
