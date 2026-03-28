import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, RefreshControl, ActivityIndicator,
} from 'react-native';
import { AuthContext } from '../context/AuthContext';
import StatsCard from '../components/StatsCard';
import api from '../api';

export default function DashboardScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await api.get('/analytics/dashboard');
      setData(res.data);
      setError('');
    } catch (e) {
      setError('Failed to load dashboard data');
    }
  }, []);

  useEffect(() => {
    fetchDashboard().finally(() => setLoading(false));
  }, [fetchDashboard]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchDashboard();
    setRefreshing(false);
  }, [fetchDashboard]);

  const name = user?.full_name || user?.username || 'Student';

  if (loading) {
    return <View style={styles.loader}><ActivityIndicator size="large" color="#3b82f6" /></View>;
  }

  const stats = data?.stats || {};
  const deadlines = data?.upcoming_deadlines || [];

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <Text style={styles.greeting}>Hello, {name}! 👋</Text>
        <Text style={styles.subGreeting}>Let's make today productive!</Text>
      </View>

      {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}

      <Text style={styles.sectionTitle}>Overview</Text>
      <View style={styles.grid}>
        <StatsCard label="Total Tasks" value={stats.total_tasks ?? '—'} icon="📋" color="#3b82f6" />
        <StatsCard label="Completed" value={stats.completed_tasks ?? '—'} icon="✅" color="#10b981" />
        <StatsCard label="Completion Rate" value={stats.completion_rate != null ? `${Math.round(stats.completion_rate)}%` : '—'} icon="📊" color="#f59e0b" />
        <StatsCard label="Streak" value={stats.current_streak != null ? `${stats.current_streak}d` : '—'} icon="🔥" color="#ef4444" />
      </View>

      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>Upcoming Deadlines</Text>
      </View>

      {deadlines.length === 0 ? (
        <View style={styles.emptyBox}><Text style={styles.emptyText}>No upcoming deadlines 🎉</Text></View>
      ) : (
        deadlines.map((task, i) => (
          <View key={task.id || i} style={styles.taskItem}>
            <View style={styles.taskLeft}>
              <Text style={styles.taskTitle} numberOfLines={1}>{task.title}</Text>
              <Text style={styles.taskMeta}>{task.task_type} • Due: {task.deadline ? task.deadline.substring(0, 10) : 'N/A'}</Text>
            </View>
            <View style={[styles.priorityBadge, { backgroundColor: task.priority_score > 7 ? '#fee2e2' : '#fef9c3' }]}>
              <Text style={[styles.priorityText, { color: task.priority_score > 7 ? '#dc2626' : '#d97706' }]}>
                P{Math.round(task.priority_score || 0)}
              </Text>
            </View>
          </View>
        ))
      )}

      <TouchableOpacity style={styles.predictBtn} onPress={() => navigation.navigate('Analytics')}>
        <Text style={styles.predictBtnText}>⚡ Quick Predict Performance</Text>
      </TouchableOpacity>

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: '#3b82f6', padding: 24, paddingTop: 32 },
  greeting: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  subGreeting: { fontSize: 14, color: '#bfdbfe', marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', margin: 16, marginBottom: 8 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 8 },
  taskItem: { backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 8, borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4 },
  taskLeft: { flex: 1 },
  taskTitle: { fontSize: 15, fontWeight: '600', color: '#111827' },
  taskMeta: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  priorityBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  priorityText: { fontSize: 12, fontWeight: 'bold' },
  emptyBox: { alignItems: 'center', padding: 24 },
  emptyText: { color: '#6b7280', fontSize: 15 },
  predictBtn: { backgroundColor: '#3b82f6', marginHorizontal: 16, marginTop: 8, borderRadius: 12, padding: 16, alignItems: 'center' },
  predictBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  errorBox: { backgroundColor: '#fee2e2', margin: 16, borderRadius: 8, padding: 12 },
  errorText: { color: '#dc2626', fontSize: 13 },
});
