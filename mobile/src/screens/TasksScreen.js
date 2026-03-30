import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Modal, TextInput,
  Alert, ScrollView, RefreshControl,
} from 'react-native';
import api from '../api';
import TaskCard from '../components/TaskCard';
import { scheduleBreakReminder, cancelBreakReminder } from '../services/NotificationService';

const TASK_TYPES = ['assignment', 'exam', 'project', 'reading', 'other'];
const FILTER_TABS = ['All', 'Pending', 'Completed'];
const BREAK_REMINDER_MINUTES = 25; // remind user to take a break after this many minutes

const EMPTY_FORM = {
  title: '', description: '', task_type: 'assignment',
  deadline: '', difficulty: 3, estimated_hours: 2,
};

export default function TasksScreen() {
  const [tasks, setTasks] = useState([]);
  const [filter, setFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // --- Task timer state ---
  const [activeTaskId, setActiveTaskId] = useState(null);
  const [elapsed, setElapsed] = useState(0); // seconds
  const intervalRef = useRef(null);
  const breakNotifIdRef = useRef(null);

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  function startTimer(task) {
    // Stop any currently running timer first
    stopTimer(false);

    setActiveTaskId(task.id);
    setElapsed(0);
    intervalRef.current = setInterval(() => {
      setElapsed(prev => prev + 1);
    }, 1000);

    // Schedule a break reminder notification
    scheduleBreakReminder(task.title, BREAK_REMINDER_MINUTES)
      .then(id => { breakNotifIdRef.current = id; })
      .catch(() => {});
  }

  function stopTimer(showAlert = true) {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    // Cancel any pending break notification
    if (breakNotifIdRef.current) {
      cancelBreakReminder(breakNotifIdRef.current);
      breakNotifIdRef.current = null;
    }
    if (showAlert && activeTaskId !== null) {
      const secs = elapsed;
      const mins = Math.floor(secs / 60);
      Alert.alert(
        '⏹ Task Stopped',
        mins > 0
          ? `Good work! You spent ${mins} minute${mins !== 1 ? 's' : ''} on this task.`
          : 'Timer stopped.',
      );
    }
    setActiveTaskId(null);
    setElapsed(0);
  }

  // ---

  const fetchTasks = useCallback(async () => {
    try {
      const res = await api.get('/tasks');
      setTasks(res.data || []);
      setError('');
    } catch {
      setError('Could not load tasks. Pull down to retry.');
    }
  }, []);

  useEffect(() => {
    fetchTasks().finally(() => setLoading(false));
  }, [fetchTasks]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchTasks();
    setRefreshing(false);
  }, [fetchTasks]);

  const filtered = tasks.filter(t => {
    if (filter === 'Pending') return !t.completed;
    if (filter === 'Completed') return t.completed;
    return true;
  });

  function openAdd() { setEditing(null); setForm(EMPTY_FORM); setModalVisible(true); }
  function openEdit(task) {
    setEditing(task);
    setForm({
      title: task.title || '',
      description: task.description || '',
      task_type: task.task_type || 'assignment',
      deadline: task.deadline ? task.deadline.substring(0, 10) : '',
      difficulty: task.difficulty || 3,
      estimated_hours: task.estimated_hours || 2,
    });
    setModalVisible(true);
  }

  async function handleSave() {
    if (!form.title) { Alert.alert('Missing Title', 'Please enter a title for your task.'); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        difficulty: Number(form.difficulty),
        estimated_hours: Number(form.estimated_hours),
        deadline: form.deadline || null,
      };
      if (editing) {
        await api.put(`/tasks/${editing.id}`, payload);
      } else {
        await api.post('/tasks', payload);
      }
      await fetchTasks();
      setModalVisible(false);
    } catch (e) {
      Alert.alert('Oops!', e.response?.data?.detail || 'Could not save task. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleComplete(task) {
    // If this task's timer is running, stop it first
    if (activeTaskId === task.id) stopTimer(false);
    try {
      await api.patch(`/tasks/${task.id}/complete`);
      await fetchTasks();
    } catch {
      Alert.alert('Error', 'Could not mark task as done. Please try again.');
    }
  }

  async function handleDelete(task) {
    Alert.alert('Delete Task', `Are you sure you want to delete "${task.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          if (activeTaskId === task.id) stopTimer(false);
          try {
            await api.delete(`/tasks/${task.id}`);
            await fetchTasks();
          } catch {
            Alert.alert('Error', 'Could not delete task. Please try again.');
          }
        }
      },
    ]);
  }

  function handleLongPress(task) {
    Alert.alert(task.title, 'What would you like to do?', [
      { text: 'Edit', onPress: () => openEdit(task) },
      !task.completed ? { text: 'Mark as Done', onPress: () => handleComplete(task) } : null,
      { text: 'Delete', style: 'destructive', onPress: () => handleDelete(task) },
      { text: 'Cancel', style: 'cancel' },
    ].filter(Boolean));
  }

  if (loading) return <View style={styles.loader}><ActivityIndicator size="large" color="#3b82f6" /></View>;

  return (
    <View style={styles.container}>
      {error ? <View style={styles.errorBox}><Text style={styles.errorText}>⚠️ {error}</Text></View> : null}

      {/* Active task banner */}
      {activeTaskId !== null && (
        <View style={styles.activeBanner}>
          <Text style={styles.activeBannerText}>
            ⏱️ Timer running — take a break after {BREAK_REMINDER_MINUTES} min!
          </Text>
        </View>
      )}

      <View style={styles.filterRow}>
        {FILTER_TABS.map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.filterTab, filter === tab && styles.filterTabActive]}
            onPress={() => setFilter(tab)}
          >
            <Text style={[styles.filterTabText, filter === tab && styles.filterTabTextActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => String(item.id)}
        renderItem={({ item }) => (
          <TaskCard
            task={item}
            onLongPress={() => handleLongPress(item)}
            onComplete={() => handleComplete(item)}
            isTimerActive={activeTaskId === item.id}
            elapsed={activeTaskId === item.id ? elapsed : 0}
            onStartTimer={() => startTimer(item)}
            onStopTimer={() => stopTimer(true)}
          />
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>No tasks here!</Text>
            <Text style={styles.emptyText}>
              {filter === 'All'
                ? 'Tap the + button below to add your first task.'
                : `No ${filter.toLowerCase()} tasks yet.`}
            </Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 90 }}
      />

      <TouchableOpacity style={styles.fab} onPress={openAdd}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editing ? '✏️ Edit Task' : '➕ New Task'}</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody}>
            <Text style={styles.label}>Task Title *</Text>
            <TextInput
              style={styles.input}
              value={form.title}
              onChangeText={v => setForm(p => ({ ...p, title: v }))}
              placeholder="e.g. Complete Chapter 5 assignment"
              placeholderTextColor="#9ca3af"
            />

            <Text style={styles.label}>Description (optional)</Text>
            <TextInput
              style={[styles.input, { height: 80 }]}
              value={form.description}
              onChangeText={v => setForm(p => ({ ...p, description: v }))}
              placeholder="Add any extra details here…"
              multiline
              placeholderTextColor="#9ca3af"
            />

            <Text style={styles.label}>Task Type — what kind of task is this?</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              {TASK_TYPES.map(t => (
                <TouchableOpacity
                  key={t}
                  style={[styles.typePill, form.task_type === t && styles.typePillActive]}
                  onPress={() => setForm(p => ({ ...p, task_type: t }))}
                >
                  <Text style={[styles.typePillText, form.task_type === t && styles.typePillTextActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.label}>Deadline (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              value={form.deadline}
              onChangeText={v => setForm(p => ({ ...p, deadline: v }))}
              placeholder="e.g. 2025-12-31"
              placeholderTextColor="#9ca3af"
              maxLength={10}
              keyboardType="numbers-and-punctuation"
            />
            {form.deadline !== '' && !/^\d{4}-\d{2}-\d{2}$/.test(form.deadline) && (
              <Text style={styles.fieldHint}>⚠️ Format must be YYYY-MM-DD (e.g. 2025-12-31)</Text>
            )}

            <Text style={styles.label}>Difficulty: {form.difficulty}/5 — how hard is this?</Text>
            <View style={styles.diffRow}>
              {[1,2,3,4,5].map(n => (
                <TouchableOpacity key={n} onPress={() => setForm(p => ({ ...p, difficulty: n }))}>
                  <Text style={{ fontSize: 28, color: n <= form.difficulty ? '#f59e0b' : '#d1d5db' }}>●</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>How many hours will this take?</Text>
            <TextInput
              style={styles.input}
              value={String(form.estimated_hours)}
              onChangeText={v => setForm(p => ({ ...p, estimated_hours: v }))}
              keyboardType="numeric"
              placeholderTextColor="#9ca3af"
              placeholder="2"
            />

            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
              {saving
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.saveBtnText}>{editing ? '💾 Update Task' : '✅ Add Task'}</Text>
              }
            </TouchableOpacity>
            <View style={{ height: 32 }} />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorBox: { backgroundColor: '#fee2e2', margin: 16, borderRadius: 10, padding: 12 },
  errorText: { color: '#dc2626', fontSize: 13 },

  activeBanner: { backgroundColor: '#eff6ff', borderBottomWidth: 1, borderBottomColor: '#bfdbfe', paddingHorizontal: 16, paddingVertical: 8 },
  activeBannerText: { color: '#1d4ed8', fontSize: 13, fontWeight: '600', textAlign: 'center' },

  filterRow: { flexDirection: 'row', padding: 12, gap: 8 },
  filterTab: { flex: 1, paddingVertical: 9, borderRadius: 10, backgroundColor: '#e5e7eb', alignItems: 'center' },
  filterTabActive: { backgroundColor: '#3b82f6' },
  filterTabText: { color: '#6b7280', fontWeight: '600', fontSize: 13 },
  filterTabTextActive: { color: '#fff' },

  emptyBox: { alignItems: 'center', padding: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 6 },
  emptyText: { color: '#6b7280', fontSize: 14, textAlign: 'center', lineHeight: 20 },

  fab: {
    position: 'absolute', right: 20, bottom: 20,
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: '#3b82f6', justifyContent: 'center', alignItems: 'center',
    elevation: 6, shadowColor: '#3b82f6', shadowOpacity: 0.4, shadowRadius: 8,
  },
  fabText: { color: '#fff', fontSize: 32, lineHeight: 36 },

  modal: { flex: 1, backgroundColor: '#fff' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
  modalClose: { fontSize: 22, color: '#6b7280', padding: 4 },
  modalBody: { padding: 20 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, padding: 13, fontSize: 15, color: '#111827', marginBottom: 16, backgroundColor: '#fafafa' },
  typePill: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20, backgroundColor: '#e5e7eb', marginRight: 8 },
  typePillActive: { backgroundColor: '#3b82f6' },
  typePillText: { color: '#6b7280', fontWeight: '600', fontSize: 13 },
  typePillTextActive: { color: '#fff' },
  diffRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  fieldHint: { fontSize: 12, color: '#f59e0b', marginTop: -12, marginBottom: 12 },
  saveBtn: { backgroundColor: '#3b82f6', borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 8 },
  saveBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
