import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Calendar, RefreshCw, Clock } from 'lucide-react'
import api from '../api'

const slotColors = {
  study: 'bg-blue-50 border-blue-200 text-blue-800',
  break: 'bg-green-50 border-green-200 text-green-800',
  namaz: 'bg-purple-50 border-purple-200 text-purple-800',
  prayer: 'bg-purple-50 border-purple-200 text-purple-800',
}

const slotDot = {
  study: 'bg-blue-400',
  break: 'bg-green-400',
  namaz: 'bg-purple-400',
  prayer: 'bg-purple-400',
}

export default function SchedulePage() {
  const qc = useQueryClient()
  const [view, setView] = useState('today')

  const { data: schedule, isLoading } = useQuery({
    queryKey: ['schedule', view],
    queryFn: () => api.get(`/schedule/${view === 'today' ? 'today' : 'week'}`).then(r => r.data),
    retry: 1,
  })

  const generateMutation = useMutation({
    mutationFn: () => api.post('/schedule/generate', { days: 7 }),
    onSuccess: () => { qc.invalidateQueries(['schedule']); toast.success('Schedule generated!') },
    onError: (e) => {
      const detail = e.response?.data?.detail
      const message = Array.isArray(detail) && detail.length > 0 ? detail[0].msg : detail
      toast.error(message || 'Failed to generate schedule')
    },
  })

  const slots = view === 'today'
    ? (schedule?.slots || schedule?.schedule || [])
    : (schedule?.days || schedule || [])

  const renderSlot = (slot, i) => {
    const type = (slot.slot_type || slot.type || 'study').toLowerCase()
    return (
      <div key={i} className={`flex gap-4 p-4 rounded-xl border ${slotColors[type] || slotColors.study}`}>
        <div className="flex flex-col items-center gap-1 min-w-16 text-xs font-medium opacity-70">
          <Clock className="w-3.5 h-3.5" />
          <span>{slot.start_time || slot.start}</span>
          <span>—</span>
          <span>{slot.end_time || slot.end}</span>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <div className={`w-2 h-2 rounded-full ${slotDot[type] || slotDot.study}`} />
            <span className="font-semibold text-sm capitalize">{type}</span>
          </div>
          <p className="text-sm">{slot.task_title || slot.title || slot.description || ''}</p>
          {slot.notes && <p className="text-xs mt-1 opacity-70">{slot.notes}</p>}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-gray-900">Schedule</h2>
        <div className="flex items-center gap-3">
          <div className="flex bg-gray-100 rounded-lg p-1">
            {['today', 'week'].map(v => (
              <button key={v} onClick={() => setView(v)} className={`px-4 py-1.5 rounded-md text-sm font-medium capitalize transition-colors ${view === v ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
                {v === 'today' ? 'Today' : 'This Week'}
              </button>
            ))}
          </div>
          <button
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${generateMutation.isPending ? 'animate-spin' : ''}`} />
            Generate
          </button>
        </div>
      </div>

      {isLoading || generateMutation.isPending ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-gray-400">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
          <p className="text-sm">{generateMutation.isPending ? 'Generating schedule...' : 'Loading...'}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {view === 'today' ? (
            slots.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-lg font-medium">No schedule yet</p>
                <p className="text-sm">Click &quot;Generate&quot; to create your daily schedule</p>
              </div>
            ) : (
              <div className="space-y-3">{slots.map((s, i) => renderSlot(s, i))}</div>
            )
          ) : (
            Array.isArray(slots) ? slots.map((day, di) => (
              <div key={di} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="bg-gray-50 px-5 py-3 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-800">{day.date || day.day || `Day ${di + 1}`}</h3>
                </div>
                <div className="p-4 space-y-3">
                  {(day.slots || day.schedule || []).map((s, i) => renderSlot(s, i))}
                </div>
              </div>
            )) : (
              <div className="text-center py-16 text-gray-400">
                <p className="text-sm">No weekly schedule available</p>
              </div>
            )
          )}
        </div>
      )}
    </div>
  )
}
