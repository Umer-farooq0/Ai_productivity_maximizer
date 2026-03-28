import React from 'react'
import { CheckCircle, Edit2, Trash2, Clock, Zap, Star } from 'lucide-react'
import { format, parseISO, differenceInDays } from 'date-fns'

const typeColors = {
  assignment: 'bg-blue-100 text-blue-700',
  quiz: 'bg-yellow-100 text-yellow-700',
  midterm: 'bg-orange-100 text-orange-700',
  final: 'bg-red-100 text-red-700',
  project: 'bg-purple-100 text-purple-700',
  reading: 'bg-green-100 text-green-700',
}

export default function TaskCard({ task, onComplete, onEdit, onDelete }) {
  const deadline = task.deadline ? parseISO(task.deadline) : null
  const daysLeft = deadline ? differenceInDays(deadline, new Date()) : null
  const urgencyColor = daysLeft === null ? 'text-gray-500' : daysLeft < 2 ? 'text-red-600' : daysLeft < 5 ? 'text-orange-500' : 'text-green-600'

  return (
    <div className={`bg-white rounded-xl p-5 shadow-sm border border-gray-100 transition-all hover:shadow-md ${task.is_completed ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${typeColors[task.task_type] || 'bg-gray-100 text-gray-700'}`}>
              {task.task_type}
            </span>
            {task.is_completed && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">Completed</span>
            )}
          </div>
          <h3 className={`font-semibold text-gray-900 mb-1 ${task.is_completed ? 'line-through text-gray-400' : ''}`}>
            {task.title}
          </h3>
          {task.description && (
            <p className="text-sm text-gray-500 mb-2 line-clamp-2">{task.description}</p>
          )}
          <div className="flex flex-wrap gap-3 text-xs text-gray-500">
            {deadline && (
              <span className={`flex items-center gap-1 font-medium ${urgencyColor}`}>
                <Clock className="w-3 h-3" />
                {format(deadline, 'MMM d, yyyy')}
                {daysLeft !== null && ` (${daysLeft < 0 ? 'overdue' : daysLeft === 0 ? 'today' : `${daysLeft}d left`})`}
              </span>
            )}
            {task.estimated_hours && (
              <span className="flex items-center gap-1">
                <Zap className="w-3 h-3" />
                {task.estimated_hours}h
              </span>
            )}
            {task.priority_score != null && (
              <span className="flex items-center gap-1 text-primary-600">
                <Star className="w-3 h-3" />
                Priority: {typeof task.priority_score === 'number' ? task.priority_score.toFixed(1) : task.priority_score}
              </span>
            )}
          </div>
          {task.difficulty && (
            <div className="flex gap-0.5 mt-2">
              {[1,2,3,4,5].map(i => (
                <div key={i} className={`w-3 h-3 rounded-full ${i <= task.difficulty ? 'bg-primary-400' : 'bg-gray-200'}`} />
              ))}
              <span className="text-xs text-gray-400 ml-1">difficulty</span>
            </div>
          )}
        </div>
        <div className="flex flex-col gap-1 ml-2">
          {!task.is_completed && (
            <button onClick={() => onComplete(task.id)} title="Mark complete" className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors">
              <CheckCircle className="w-4 h-4" />
            </button>
          )}
          <button onClick={() => onEdit(task)} title="Edit" className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
            <Edit2 className="w-4 h-4" />
          </button>
          <button onClick={() => onDelete(task.id)} title="Delete" className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
