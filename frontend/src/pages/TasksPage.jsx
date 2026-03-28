import React, { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Plus, X, Search, CheckSquare } from 'lucide-react'
import api from '../api'
import TaskCard from '../components/TaskCard'

const TYPES = ['assignment', 'quiz', 'midterm', 'final', 'project', 'reading']
const SORT_OPTIONS = ['priority', 'deadline', 'difficulty']

const INITIAL_FORM = {
  title: '', description: '', task_type: 'assignment', deadline: '',
  difficulty: 3, estimated_hours: 1,
}

export default function TasksPage() {
  const qc = useQueryClient()
  const [filter, setFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('')
  const [sort, setSort] = useState('priority')
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editTask, setEditTask] = useState(null)
  const [form, setForm] = useState(INITIAL_FORM)
  const [deleteId, setDeleteId] = useState(null)

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => api.get('/tasks').then(r => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (data) => api.post('/tasks', data),
    onSuccess: () => { qc.invalidateQueries(['tasks']); qc.invalidateQueries(['dashboard']); toast.success('Task created!'); closeModal() },
    onError: (e) => toast.error(e.response?.data?.detail || 'Failed to create task'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.put(`/tasks/${id}`, data),
    onSuccess: () => { qc.invalidateQueries(['tasks']); toast.success('Task updated!'); closeModal() },
    onError: (e) => toast.error(e.response?.data?.detail || 'Failed to update task'),
  })

  const completeMutation = useMutation({
    mutationFn: (id) => api.post(`/tasks/${id}/complete`),
    onSuccess: () => { qc.invalidateQueries(['tasks']); qc.invalidateQueries(['dashboard']); toast.success('Task completed! 🎉') },
    onError: () => toast.error('Failed to complete task'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/tasks/${id}`),
    onSuccess: () => { qc.invalidateQueries(['tasks']); qc.invalidateQueries(['dashboard']); toast.success('Task deleted'); setDeleteId(null) },
    onError: () => toast.error('Failed to delete task'),
  })

  const openAdd = () => { setEditTask(null); setForm(INITIAL_FORM); setModalOpen(true) }
  const openEdit = (task) => {
    setEditTask(task)
    setForm({
      title: task.title || '',
      description: task.description || '',
      task_type: task.task_type || 'assignment',
      deadline: task.deadline ? task.deadline.slice(0, 16) : '',
      difficulty: task.difficulty || 3,
      estimated_hours: task.estimated_hours || 1,
    })
    setModalOpen(true)
  }
  const closeModal = () => { setModalOpen(false); setEditTask(null) }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.title) { toast.error('Title required'); return }
    const data = { ...form, deadline: form.deadline ? new Date(form.deadline).toISOString() : null }
    if (editTask) updateMutation.mutate({ id: editTask.id, data })
    else createMutation.mutate(data)
  }

  const filtered = useMemo(() => {
    let list = [...tasks]
    if (filter === 'pending') list = list.filter(t => !t.is_completed)
    else if (filter === 'completed') list = list.filter(t => t.is_completed)
    if (typeFilter) list = list.filter(t => t.task_type === typeFilter)
    if (search) list = list.filter(t => t.title.toLowerCase().includes(search.toLowerCase()))
    if (sort === 'priority') list.sort((a, b) => (b.priority_score || 0) - (a.priority_score || 0))
    else if (sort === 'deadline') list.sort((a, b) => new Date(a.deadline || '9999') - new Date(b.deadline || '9999'))
    else if (sort === 'difficulty') list.sort((a, b) => (b.difficulty || 0) - (a.difficulty || 0))
    return list
  }, [tasks, filter, typeFilter, search, sort])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-gray-900">Tasks</h2>
        <button onClick={openAdd} className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors">
          <Plus className="w-4 h-4" /> Add Task
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search tasks..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          {['all', 'pending', 'completed'].map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize ${filter === f ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {f}
            </button>
          ))}
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-600 focus:ring-2 focus:ring-primary-500 outline-none">
          <option value="">All Types</option>
          {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={sort} onChange={e => setSort(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-600 focus:ring-2 focus:ring-primary-500 outline-none">
          {SORT_OPTIONS.map(s => <option key={s} value={s}>Sort: {s}</option>)}
        </select>
      </div>

      {/* Task list */}
      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="bg-white rounded-xl p-5 shadow-sm animate-pulse h-40" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <CheckSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">No tasks found</p>
          <p className="text-sm">Add a task to get started</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              onComplete={completeMutation.mutate}
              onEdit={openEdit}
              onDelete={setDeleteId}
            />
          ))}
        </div>
      )}

      {/* Task Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold">{editTask ? 'Edit Task' : 'New Task'}</h3>
              <button onClick={closeModal}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none" placeholder="Task title" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                  rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none resize-none" placeholder="Optional description" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select value={form.task_type} onChange={e => setForm({ ...form, task_type: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none">
                    {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Est. Hours</label>
                  <input type="number" min="0.5" max="50" step="0.5" value={form.estimated_hours}
                    onChange={e => setForm({ ...form, estimated_hours: Number(e.target.value) })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Deadline</label>
                <input type="datetime-local" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <label className="font-medium text-gray-700">Difficulty</label>
                  <span className="text-primary-600 font-medium">{form.difficulty}/5</span>
                </div>
                <input type="range" min="1" max="5" value={form.difficulty}
                  onChange={e => setForm({ ...form, difficulty: Number(e.target.value) })}
                  className="w-full accent-primary-600" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeModal} className="flex-1 border border-gray-300 text-gray-700 font-medium py-2.5 rounded-lg text-sm hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" disabled={createMutation.isPending || updateMutation.isPending}
                  className="flex-1 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors">
                  {editTask ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Task?</h3>
            <p className="text-gray-500 text-sm mb-6">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 border border-gray-300 text-gray-700 font-medium py-2.5 rounded-lg text-sm">Cancel</button>
              <button onClick={() => deleteMutation.mutate(deleteId)} disabled={deleteMutation.isPending}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 rounded-lg text-sm">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
