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

// Quick-pick sprint options shown in the Sprint Setup sheet
const SPRINT_PRESETS = [
  { label: '15 min', minutes: 15 },
  { label: '25 min', minutes: 25 },
  { label: '45 min', minutes: 45 },
  { label: '1 hour', minutes: 60 },
  { label: '90 min', minutes: 90 },
  { label: '2 hours', minutes: 120 },
];

// How close (in minutes) the AI suggestion must be to a preset for it to be auto-selected
const AUTO_SELECT_THRESHOLD_MINUTES = 10;

const EMPTY_FORM = {
  title: '', description: '', task_type: 'assignment',
  deadline: '', difficulty: 3, estimated_hours: 2,
};

/** Format minutes into a human-readable label like "45 min" or "1 h 30 min" */
function fmtMinutes(m) {
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem > 0 ? `${h} h ${rem} min` : `${h} h`;
}

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

  // ── Task timer state ──────────────────────────────────────────────────────
  const [activeTaskId, setActiveTaskId] = useState(null);
  const [elapsed, setElapsed] = useState(0);          // seconds ticked
  const [sprintMinutes, setSprintMinutes] = useState(null); // chosen sprint length
  const intervalRef = useRef(null);
  const breakNotifIdRef = useRef(null);

  // ── Sprint Setup sheet state ───────────────────────────────────────────────
  const [sprintSheetTask, setSprintSheetTask] = useState(null); // task awaiting sprint choice
  const [aiSuggestion, setAiSuggestion] = useState(null);        // { suggested_minutes, rationale }
  const [aiLoading, setAiLoading] = useState(false);
  const [customMinutes, setCustomMinutes] = useState('');
  const [selectedPreset, setSelectedPreset] = useState(null);   // chosen preset index or 'custom'

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  /** Open the Sprint Setup bottom-sheet for `task` and load the AI suggestion */
  function openSprintSheet(task) {
    setSprintSheetTask(task);
    setAiSuggestion(null);
    setCustomMinutes('');
    setSelectedPreset(null);
    setAiLoading(true);

    api.post('/analytics/suggest-break', {
      task_id: task.id,
      difficulty: task.difficulty || 3,
      estimated_hours: task.estimated_hours || 1,
      task_type: task.task_type || 'assignment',
    })
      .then(res => {
        setAiSuggestion(res.data);
        // Pre-select the closest preset to the suggestion
        const sug = res.data.suggested_minutes;
        const best = SPRINT_PRESETS.reduce((prev, cur) =>
          Math.abs(cur.minutes - sug) < Math.abs(prev.minutes - sug) ? cur : prev
        );
        const idx = SPRINT_PRESETS.indexOf(best);
        // Only auto-select a preset if it's within the threshold of the suggestion
        setSelectedPreset(Math.abs(best.minutes - sug) <= AUTO_SELECT_THRESHOLD_MINUTES ? idx : 'ai');
      })
      .catch(() => {
        // Network/auth failure: fall back to local heuristic
        const fallback = localSprintSuggestion(task);
        setAiSuggestion({ suggested_minutes: fallback, rationale: null });
        const best = SPRINT_PRESETS.reduce((prev, cur) =>
          Math.abs(cur.minutes - fallback) < Math.abs(prev.minutes - fallback) ? cur : prev
        );
        setSelectedPreset(SPRINT_PRESETS.indexOf(best));
      })
      .finally(() => setAiLoading(false));
  }

  /** Simple local fallback when the backend is unreachable */
  function localSprintSuggestion(task) {
    const diff = task.difficulty || 3;
    const hrs = task.estimated_hours || 1;
    const diffMap = { 1: 90, 2: 60, 3: 45, 4: 30, 5: 25 };
    const base = diffMap[diff] || 45;
    const hoursBonus = hrs >= 3 ? 15 : hrs >= 1.5 ? 0 : -10;
    return Math.max(15, Math.min(120, Math.round((base + hoursBonus) / 5) * 5));
  }

  /** Resolve the user's chosen sprint length from sheet state */
  function resolveChosenMinutes() {
    if (selectedPreset === 'custom') {
      const n = parseInt(customMinutes, 10);
      return Number.isFinite(n) && n >= 5 && n <= 480 ? n : null;
    }
    if (selectedPreset === 'ai') {
      return aiSuggestion?.suggested_minutes ?? null;
    }
    if (typeof selectedPreset === 'number' && SPRINT_PRESETS[selectedPreset]) {
      return SPRINT_PRESETS[selectedPreset].minutes;
    }
    return null;
  }

  function confirmSprintAndStart() {
    const mins = resolveChosenMinutes();
    if (!mins) {
      Alert.alert('Choose a Sprint Time', 'Please pick a sprint duration or enter a custom number of minutes.');
      return;
    }
    const task = sprintSheetTask;
    setSprintSheetTask(null);
    startTimer(task, mins);
  }

  function startTimer(task, mins) {
    stopTimer(false);
    setActiveTaskId(task.id);
    setSprintMinutes(mins);
    setElapsed(0);
    intervalRef.current = setInterval(() => {
      setElapsed(prev => prev + 1);
    }, 1000);

    scheduleBreakReminder(task.title, mins)
      .then(id => { breakNotifIdRef.current = id; })
      .catch(() => {});
  }

  function stopTimer(showAlert = true) {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
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
    setSprintMinutes(null);
    setElapsed(0);
  }

  // ── Data fetching ──────────────────────────────────────────────────────────
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

  // ── Task CRUD ──────────────────────────────────────────────────────────────
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
            ⏱️ Sprint running — break reminder in {sprintMinutes ? fmtMinutes(sprintMinutes) : '…'}!
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
            sprintMinutes={activeTaskId === item.id ? sprintMinutes : null}
            onStartTimer={() => openSprintSheet(item)}
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

      {/* ── Sprint Setup bottom-sheet ────────────────────────────────────── */}
      <Modal
        visible={!!sprintSheetTask}
        animationType="slide"
        transparent
        onRequestClose={() => setSprintSheetTask(null)}
      >
        <TouchableOpacity
          style={styles.sheetOverlay}
          activeOpacity={1}
          onPress={() => setSprintSheetTask(null)}
        />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>⏱️ Set Your Sprint Time</Text>
          <Text style={styles.sheetSubtitle}>
            How long do you want to focus before taking a break?
          </Text>

          {/* AI suggestion */}
          {aiLoading ? (
            <View style={styles.aiRow}>
              <ActivityIndicator color="#3b82f6" size="small" />
              <Text style={styles.aiLoadingText}>  AI is thinking…</Text>
            </View>
          ) : aiSuggestion ? (
            <TouchableOpacity
              style={[styles.aiCard, selectedPreset === 'ai' && styles.aiCardSelected]}
              onPress={() => setSelectedPreset('ai')}
              activeOpacity={0.8}
            >
              <Text style={styles.aiCardLabel}>🤖 AI Recommends</Text>
              <Text style={styles.aiCardValue}>{fmtMinutes(aiSuggestion.suggested_minutes)}</Text>
              {aiSuggestion.rationale ? (
                <Text style={styles.aiCardRationale} numberOfLines={3}>
                  {aiSuggestion.rationale}
                </Text>
              ) : null}
            </TouchableOpacity>
          ) : null}

          {/* Quick-pick presets */}
          <Text style={styles.sheetSectionLabel}>Or pick a time:</Text>
          <View style={styles.presetsGrid}>
            {SPRINT_PRESETS.map((p, idx) => (
              <TouchableOpacity
                key={idx}
                style={[styles.presetChip, selectedPreset === idx && styles.presetChipActive]}
                onPress={() => setSelectedPreset(idx)}
              >
                <Text style={[styles.presetChipText, selectedPreset === idx && styles.presetChipTextActive]}>
                  {p.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Custom input */}
          <Text style={styles.sheetSectionLabel}>Or type a custom duration (minutes):</Text>
          <TextInput
            style={[styles.customInput, selectedPreset === 'custom' && styles.customInputActive]}
            value={customMinutes}
            onChangeText={v => { setCustomMinutes(v); setSelectedPreset('custom'); }}
            keyboardType="number-pad"
            placeholder="e.g. 50"
            placeholderTextColor="#9ca3af"
            maxLength={3}
          />

          <TouchableOpacity style={styles.startSprintBtn} onPress={confirmSprintAndStart}>
            <Text style={styles.startSprintBtnText}>▶ Start Sprint</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelSheetBtn} onPress={() => setSprintSheetTask(null)}>
            <Text style={styles.cancelSheetBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* ── Add / Edit Task modal ─────────────────────────────────────────── */}
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

  // ── Sprint Setup sheet ─────────────────────────────────────────────────────
  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 36,
  },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#d1d5db', alignSelf: 'center', marginBottom: 16 },
  sheetTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827', marginBottom: 6 },
  sheetSubtitle: { fontSize: 14, color: '#6b7280', marginBottom: 16, lineHeight: 20 },

  aiRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  aiLoadingText: { color: '#6b7280', fontSize: 14 },
  aiCard: {
    backgroundColor: '#eff6ff', borderRadius: 14, padding: 14, marginBottom: 16,
    borderWidth: 2, borderColor: '#bfdbfe',
  },
  aiCardSelected: { borderColor: '#3b82f6', backgroundColor: '#dbeafe' },
  aiCardLabel: { fontSize: 11, fontWeight: '700', color: '#3b82f6', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  aiCardValue: { fontSize: 26, fontWeight: 'bold', color: '#1d4ed8', marginBottom: 4 },
  aiCardRationale: { fontSize: 12, color: '#374151', lineHeight: 18 },

  sheetSectionLabel: { fontSize: 12, fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  presetsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  presetChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: '#e5e7eb' },
  presetChipActive: { backgroundColor: '#3b82f6' },
  presetChipText: { color: '#374151', fontWeight: '600', fontSize: 14 },
  presetChipTextActive: { color: '#fff' },

  customInput: {
    borderWidth: 1.5, borderColor: '#d1d5db', borderRadius: 10,
    padding: 12, fontSize: 16, color: '#111827', marginBottom: 16, backgroundColor: '#fafafa',
  },
  customInputActive: { borderColor: '#3b82f6' },

  startSprintBtn: { backgroundColor: '#3b82f6', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 10 },
  startSprintBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  cancelSheetBtn: { alignItems: 'center', padding: 8 },
  cancelSheetBtnText: { color: '#6b7280', fontSize: 15 },

  // ── Add / Edit Task modal ──────────────────────────────────────────────────
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
