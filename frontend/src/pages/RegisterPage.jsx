import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'
import { Brain, User, Mail, Lock, AtSign } from 'lucide-react'

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ full_name: '', username: '', email: '', password: '' })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.full_name || !form.username || !form.email || !form.password) {
      toast.error('Please fill in all fields')
      return
    }
    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    setLoading(true)
    try {
      await register(form)
      toast.success('Account created!')
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const field = (key, label, type, placeholder, Icon) => (
    <div key={key}>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type={type}
          value={form[key]}
          onChange={e => setForm({ ...form, [key]: e.target.value })}
          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-sm"
          placeholder={placeholder}
        />
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-blue-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-primary-600 p-3 rounded-2xl mb-4">
            <Brain className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Create account</h1>
          <p className="text-gray-500 text-sm mt-1">Start maximizing your productivity</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {field('full_name', 'Full Name', 'text', 'John Doe', User)}
          {field('username', 'Username', 'text', 'johndoe', AtSign)}
          {field('email', 'Email', 'email', 'you@example.com', Mail)}
          {field('password', 'Password', 'password', '••••••••', Lock)}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white font-semibold py-2.5 rounded-lg transition-colors mt-2"
          >
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>
        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-primary-600 hover:underline font-medium">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
