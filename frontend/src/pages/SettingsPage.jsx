import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Save, Bell, BookOpen, User } from 'lucide-react'
import api from '../api'
import { useAuth } from '../contexts/AuthContext'

const PRAYER_TIMES = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']

export default function SettingsPage() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    namaz_breaks_enabled: false,
    prayer_times: { fajr: '05:00', dhuhr: '12:30', asr: '15:45', maghrib: '18:15', isha: '20:00' },
    study_mode_enabled: false,
  })

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get('/settings').then(r => r.data),
    retry: 1,
  })

  useEffect(() => {
    if (settings) {
      setForm({
        full_name: settings.full_name || user?.full_name || '',
        email: settings.email || user?.email || '',
        namaz_breaks_enabled: settings.namaz_breaks_enabled ?? false,
        prayer_times: settings.prayer_times || form.prayer_times,
        study_mode_enabled: settings.study_mode_enabled ?? false,
      })
    } else if (user) {
      setForm(f => ({ ...f, full_name: user.full_name || '', email: user.email || '' }))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings, user])

  const saveMutation = useMutation({
    mutationFn: (data) => api.put('/settings', data),
    onSuccess: () => { qc.invalidateQueries(['settings']); toast.success('Settings saved!') },
    onError: (e) => toast.error(e.response?.data?.detail || 'Failed to save settings'),
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    saveMutation.mutate(form)
  }

  if (isLoading) {
    return <div className="flex items-center justify-center h-40"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Settings</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Profile */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-5">
            <User className="w-5 h-5 text-primary-600" />
            <h3 className="font-semibold text-gray-900">Profile</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
            </div>
          </div>
        </div>

        {/* Preferences */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-5">
            <BookOpen className="w-5 h-5 text-primary-600" />
            <h3 className="font-semibold text-gray-900">Study Preferences</h3>
          </div>
          <div className="space-y-4">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="text-sm font-medium text-gray-700">Study Mode</p>
                <p className="text-xs text-gray-400">Minimize distractions during study sessions</p>
              </div>
              <div className="relative">
                <input type="checkbox" checked={form.study_mode_enabled} onChange={e => setForm({ ...form, study_mode_enabled: e.target.checked })} className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 peer-checked:bg-primary-600 rounded-full transition-colors peer-focus:ring-2 peer-focus:ring-primary-500"></div>
                <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5"></div>
              </div>
            </label>
          </div>
        </div>

        {/* Namaz */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-5">
            <Bell className="w-5 h-5 text-primary-600" />
            <h3 className="font-semibold text-gray-900">Namaz Breaks</h3>
          </div>
          <label className="flex items-center justify-between cursor-pointer mb-5">
            <div>
              <p className="text-sm font-medium text-gray-700">Enable Namaz Breaks</p>
              <p className="text-xs text-gray-400">Include prayer times in your daily schedule</p>
            </div>
            <div className="relative">
              <input type="checkbox" checked={form.namaz_breaks_enabled} onChange={e => setForm({ ...form, namaz_breaks_enabled: e.target.checked })} className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-checked:bg-primary-600 rounded-full transition-colors peer-focus:ring-2 peer-focus:ring-primary-500"></div>
              <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5"></div>
            </div>
          </label>

          {form.namaz_breaks_enabled && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t border-gray-100">
              {PRAYER_TIMES.map(prayer => (
                <div key={prayer}>
                  <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">{prayer}</label>
                  <input type="time" value={form.prayer_times[prayer] || ''}
                    onChange={e => setForm({ ...form, prayer_times: { ...form.prayer_times, [prayer]: e.target.value } })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
                </div>
              ))}
            </div>
          )}
        </div>

        <button type="submit" disabled={saveMutation.isPending}
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white font-semibold px-6 py-2.5 rounded-lg text-sm transition-colors">
          <Save className="w-4 h-4" />
          {saveMutation.isPending ? 'Saving...' : 'Save Settings'}
        </button>
      </form>
    </div>
  )
}
