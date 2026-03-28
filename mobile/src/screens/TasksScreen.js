import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Modal, TextInput,
  Alert, ScrollView, RefreshControl,
} from 'react-native';
import api from '../api';
import TaskCard from '../components/TaskCard';

const TASK_TYPES = ['assignment', 'exam', 'project', 'reading', 'other'];
const FILTER_TABS = ['All', 'Pending', 'Completed'];

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

  const fetchTasks = useCallback(async () => {
    try {
      const res = await api.get('/tasks');
      setTasks(res.data || []);
      setError('');
    } catch {
      setError('Failed to load tasks');
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
    if (!form.title) { Alert.alert('Error', 'Title is required'); return; }
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
      Alert.alert('Error', e.response?.data?.detail || 'Failed to save task');
    } finally {
      setSaving(false);
    }
  }

  async function handleComplete(task) {
    try {
      await api.patch(`/tasks/${task.id}/complete`);
      await fetchTasks();
    } catch {
      Alert.alert('Error', 'Failed to complete task');
    }
  }

  async function handleDelete(task) {
    Alert.alert('Delete Task', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await api.delete(`/tasks/${task.id}`);
            await fetchTasks();
          } catch {
            Alert.alert('Error', 'Failed to delete task');
          }
        }
      },
    ]);
  }

  function handleLongPress(task) {
    Alert.alert(task.title, 'Choose action', [
      { text: 'Edit', onPress: () => openEdit(task) },
      !task.completed ? { text: 'Complete', onPress: () => handleComplete(task) } : null,
      { text: 'Delete', style: 'destructive', onPress: () => handleDelete(task) },
      { text: 'Cancel', style: 'cancel' },
    ].filter(Boolean));
  }

  if (loading) return <View style={styles.loader}><ActivityIndicator size="large" color="#3b82f6" /></View>;

  return (
    <View style={styles.container}>
      {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}

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
          <TaskCard task={item} onLongPress={() => handleLongPress(item)} onComplete={() => handleComplete(item)} />
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={<View style={styles.emptyBox}><Text style={styles.emptyText}>No tasks found</Text></View>}
        contentContainerStyle={{ paddingBottom: 80 }}
      />

      <TouchableOpacity style={styles.fab} onPress={openAdd}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editing ? 'Edit Task' : 'New Task'}</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody}>
            <Text style={styles.label}>Title *</Text>
            <TextInput style={styles.input} value={form.title} onChangeText={v => setForm(p => ({ ...p, title: v }))} placeholder="Task title" placeholderTextColor="#9ca3af" />

            <Text style={styles.label}>Description</Text>
            <TextInput style={[styles.input, { height: 80 }]} value={form.description} onChangeText={v => setForm(p => ({ ...p, description: v }))} placeholder="Description" multiline placeholderTextColor="#9ca3af" />

            <Text style={styles.label}>Task Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              {TASK_TYPES.map(t => (
                <TouchableOpacity key={t} style={[styles.typePill, form.task_type === t && styles.typePillActive]} onPress={() => setForm(p => ({ ...p, task_type: t }))}>
                  <Text style={[styles.typePillText, form.task_type === t && styles.typePillTextActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.label}>Deadline (YYYY-MM-DD)</Text>
            <TextInput style={styles.input} value={form.deadline} onChangeText={v => setForm(p => ({ ...p, deadline: v }))} placeholder="2024-12-31" placeholderTextColor="#9ca3af" />

            <Text style={styles.label}>Difficulty: {form.difficulty}/5</Text>
            <View style={styles.diffRow}>
              {[1,2,3,4,5].map(n => (
                <TouchableOpacity key={n} onPress={() => setForm(p => ({ ...p, difficulty: n }))}>
                  <Text style={{ fontSize: 24, color: n <= form.difficulty ? '#f59e0b' : '#d1d5db' }}>●</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Estimated Hours</Text>
            <TextInput style={styles.input} value={String(form.estimated_hours)} onChangeText={v => setForm(p => ({ ...p, estimated_hours: v }))} keyboardType="numeric" placeholderTextColor="#9ca3af" />

            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>{editing ? 'Update Task' : 'Add Task'}</Text>}
            </TouchableOpacity>
            <View style={{ height: 32 }} />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorBox: { backgroundColor: '#fee2e2', margin: 16, borderRadius: 8, padding: 12 },
  errorText: { color: '#dc2626', fontSize: 13 },
  filterRow: { flexDirection: 'row', padding: 12, gap: 8 },
  filterTab: { flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: '#e5e7eb', alignItems: 'center' },
  filterTabActive: { backgroundColor: '#3b82f6' },
  filterTabText: { color: '#6b7280', fontWeight: '600', fontSize: 13 },
  filterTabTextActive: { color: '#fff' },
  emptyBox: { alignItems: 'center', padding: 40 },
  emptyText: { color: '#6b7280', fontSize: 15 },
  fab: { position: 'absolute', right: 20, bottom: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: '#3b82f6', justifyContent: 'center', alignItems: 'center', elevation: 6, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8 },
  fabText: { color: '#fff', fontSize: 28, lineHeight: 32 },
  modal: { flex: 1, backgroundColor: '#fff' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
  modalClose: { fontSize: 20, color: '#6b7280' },
  modalBody: { padding: 20 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12, fontSize: 15, color: '#111827', marginBottom: 16 },
  typePill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#e5e7eb', marginRight: 8 },
  typePillActive: { backgroundColor: '#3b82f6' },
  typePillText: { color: '#6b7280', fontWeight: '600', fontSize: 13 },
  typePillTextActive: { color: '#fff' },
  diffRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  saveBtn: { backgroundColor: '#3b82f6', borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 8 },
  saveBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
