import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import api from '../api';

const TASK_TYPE_COLORS = {
  assignment: '#3b82f6',
  exam: '#ef4444',
  project: '#8b5cf6',
  reading: '#10b981',
  other: '#6b7280',
};

const TASK_TYPE_ICONS = {
  assignment: '📝',
  exam: '🎯',
  project: '💡',
  reading: '📚',
  other: '📌',
};

// Simple horizontal progress bar
function ProgressBar({ value, color, height = 8 }) {
  const pct = Math.min(100, Math.max(0, value || 0));
  return (
    <View style={{ height, backgroundColor: '#e5e7eb', borderRadius: height / 2, overflow: 'hidden' }}>
      <View style={{ height, width: `${pct}%`, backgroundColor: color, borderRadius: height / 2 }} />
    </View>
  );
}

// Large stat card in the grid
function StatTile({ icon, label, value, color, note }) {
  return (
    <View style={[styles.statTile, { borderTopColor: color }]}>
      <Text style={styles.statTileIcon}>{icon}</Text>
      <Text style={[styles.statTileValue, { color }]}>{value}</Text>
      <Text style={styles.statTileLabel}>{label}</Text>
      {note ? <Text style={styles.statTileNote}>{note}</Text> : null}
    </View>
  );
}

// One bar in the weekly chart
function WeekBar({ day, count, maxCount }) {
  const heightPct = maxCount > 0 ? count / maxCount : 0;
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      {count > 0 ? <Text style={styles.weekCount}>{count}</Text> : <Text style={styles.weekCount}> </Text>}
      <View style={styles.weekBarTrack}>
        <View style={[styles.weekBarFill, { flex: heightPct }]} />
        <View style={{ flex: 1 - heightPct }} />
      </View>
      <Text style={styles.weekDay}>{day}</Text>
    </View>
  );
}

export default function AnalyticsScreen() {
  const [stats, setStats] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [weeklyData, setWeeklyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const [dashRes, tasksRes] = await Promise.all([
        api.get('/analytics/dashboard'),
        api.get('/tasks'),
      ]);
      setStats(dashRes.data.stats || {});
      setWeeklyData(dashRes.data.weekly_completions || []);
      setTasks(tasksRes.data || []);
      setError('');
    } catch {
      setError('Could not load your stats. Pull down to refresh.');
    }
  }, []);

  useEffect(() => {
    fetchData().finally(() => setLoading(false));
  }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  // Compute task-type distribution from the full task list
  const typeCounts = tasks.reduce((acc, t) => {
    const type = t.task_type || 'other';
    acc[type] = (acc[type] || { total: 0, done: 0 });
    acc[type].total += 1;
    if (t.completed || t.is_completed) acc[type].done += 1;
    return acc;
  }, {});

  const completionRate = stats?.completion_rate || 0;
  const totalTasks = stats?.total_tasks || 0;
  const maxWeeklyCount = Math.max(...weeklyData.map(w => w.count), 1);

  // Pick a motivational message based on progress
  function getMotivation() {
    if (totalTasks === 0) return { emoji: '🚀', text: "You haven't added any tasks yet. Go to Tasks and add your first one!" };
    if (completionRate >= 80) return { emoji: '🌟', text: "Amazing! You're crushing it! Keep up the great work!" };
    if (completionRate >= 50) return { emoji: '💪', text: "Good job! You're more than halfway there. Keep going!" };
    return { emoji: '📖', text: "Every big journey starts with one step. Complete one task at a time!" };
  }

  const motivation = getMotivation();

  if (loading) {
    return <View style={styles.loader}><ActivityIndicator size="large" color="#3b82f6" /></View>;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header banner */}
      <View style={styles.header}>
        <Text style={styles.heading}>📊 My Progress</Text>
        <Text style={styles.subheading}>See how well you're doing! Pull down to refresh.</Text>
      </View>

      {error ? (
        <View style={styles.errorBox}><Text style={styles.errorText}>⚠️ {error}</Text></View>
      ) : null}

      {/* Completion rate spotlight */}
      <View style={styles.completionCard}>
        <View style={styles.completionCircle}>
          <Text style={styles.completionPct}>{Math.round(completionRate)}%</Text>
          <Text style={styles.completionPctLabel}>Complete</Text>
        </View>
        <View style={styles.completionDetails}>
          <Text style={styles.completionTitle}>Overall Progress</Text>
          <View style={styles.completionLegendRow}>
            <View style={[styles.legendDot, { backgroundColor: '#10b981' }]} />
            <Text style={styles.legendText}>{stats?.completed_tasks || 0} tasks completed ✅</Text>
          </View>
          <View style={styles.completionLegendRow}>
            <View style={[styles.legendDot, { backgroundColor: '#e5e7eb' }]} />
            <Text style={styles.legendText}>{stats?.pending_tasks || 0} tasks remaining 🕐</Text>
          </View>
          <ProgressBar value={completionRate} color="#10b981" height={10} />
        </View>
      </View>

      {/* Quick stats tiles */}
      <Text style={styles.sectionTitle}>📈 Quick Stats</Text>
      <View style={styles.tilesGrid}>
        <StatTile icon="🔥" label="Day Streak" value={stats?.current_streak ?? 0} color="#ef4444" note="days in a row" />
        <StatTile icon="📚" label="Study Hours" value={`${stats?.total_study_hours ?? 0}h`} color="#3b82f6" note="recorded total" />
        <StatTile icon="✅" label="Done Today" value={stats?.completed_today ?? 0} color="#10b981" note="tasks" />
        <StatTile icon="🗓️" label="This Week" value={stats?.completed_this_week ?? 0} color="#8b5cf6" note="tasks done" />
      </View>

      {/* Weekly activity chart */}
      {weeklyData.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>📅 This Week's Activity</Text>
          <View style={styles.card}>
            <View style={styles.weekChart}>
              {weeklyData.map((w, i) => (
                <WeekBar key={i} day={w.day} count={w.count} maxCount={maxWeeklyCount} />
              ))}
            </View>
            <Text style={styles.chartHint}>📌 Number of tasks completed each day</Text>
          </View>
        </>
      )}

      {/* Task-type breakdown */}
      {Object.keys(typeCounts).length > 0 && (
        <>
          <Text style={styles.sectionTitle}>🗂️ Task Type Breakdown</Text>
          <View style={styles.card}>
            {Object.entries(typeCounts).map(([type, { total, done }]) => {
              const pct = total > 0 ? Math.round((done / total) * 100) : 0;
              const color = TASK_TYPE_COLORS[type] || '#6b7280';
              return (
                <View key={type} style={styles.typeRow}>
                  <Text style={styles.typeIcon}>{TASK_TYPE_ICONS[type] || '📌'}</Text>
                  <View style={styles.typeBody}>
                    <View style={styles.typeHeaderRow}>
                      <Text style={styles.typeName}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </Text>
                      <Text style={[styles.typePct, { color }]}>{pct}%</Text>
                    </View>
                    <ProgressBar value={pct} color={color} height={6} />
                    <Text style={styles.typeSubtext}>{done} of {total} done</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </>
      )}

      {/* Motivational banner */}
      <View style={styles.motiveBanner}>
        <Text style={styles.motiveEmoji}>{motivation.emoji}</Text>
        <Text style={styles.motiveText}>{motivation.text}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Header
  header: { backgroundColor: '#3b82f6', padding: 24, paddingTop: 28, paddingBottom: 28 },
  heading: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  subheading: { fontSize: 13, color: '#bfdbfe', marginTop: 4 },

  errorBox: { backgroundColor: '#fee2e2', margin: 16, borderRadius: 10, padding: 12 },
  errorText: { color: '#dc2626', fontSize: 14 },

  // Completion card
  completionCard: {
    backgroundColor: '#fff', margin: 16, borderRadius: 16,
    padding: 20, flexDirection: 'row', alignItems: 'center',
    elevation: 3, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6,
  },
  completionCircle: {
    width: 96, height: 96, borderRadius: 48,
    borderWidth: 8, borderColor: '#10b981',
    justifyContent: 'center', alignItems: 'center',
    marginRight: 20, backgroundColor: '#f0fdf4',
  },
  completionPct: { fontSize: 22, fontWeight: 'bold', color: '#059669' },
  completionPctLabel: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  completionDetails: { flex: 1 },
  completionTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 8 },
  completionLegendRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 6 },
  legendText: { fontSize: 13, color: '#374151' },

  // Section title
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#374151', marginHorizontal: 16, marginTop: 8, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },

  // Stat tiles grid
  tilesGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 8 },
  statTile: {
    width: '46%', backgroundColor: '#fff', margin: '2%', borderRadius: 14,
    padding: 16, borderTopWidth: 4, elevation: 2,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4,
    alignItems: 'center',
  },
  statTileIcon: { fontSize: 28, marginBottom: 6 },
  statTileValue: { fontSize: 26, fontWeight: 'bold', marginBottom: 2 },
  statTileLabel: { fontSize: 12, color: '#374151', fontWeight: '600', textAlign: 'center' },
  statTileNote: { fontSize: 11, color: '#9ca3af', marginTop: 2, textAlign: 'center' },

  // Card
  card: {
    backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 8,
    borderRadius: 14, padding: 16,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4,
  },

  // Weekly chart
  weekChart: { flexDirection: 'row', height: 100, alignItems: 'flex-end', marginBottom: 8 },
  weekBarTrack: { width: 18, flex: 1, backgroundColor: '#e5e7eb', borderRadius: 4, overflow: 'hidden', flexDirection: 'column' },
  weekBarFill: { backgroundColor: '#3b82f6', borderRadius: 4, width: '100%' },
  weekCount: { fontSize: 11, color: '#3b82f6', fontWeight: '700', marginBottom: 2 },
  weekDay: { fontSize: 11, color: '#6b7280', marginTop: 4, fontWeight: '600' },
  chartHint: { fontSize: 12, color: '#9ca3af', textAlign: 'center', marginTop: 4 },

  // Type breakdown
  typeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  typeIcon: { fontSize: 22, marginRight: 12 },
  typeBody: { flex: 1 },
  typeHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  typeName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  typePct: { fontSize: 14, fontWeight: 'bold' },
  typeSubtext: { fontSize: 11, color: '#9ca3af', marginTop: 3 },

  // Motivational banner
  motiveBanner: {
    backgroundColor: '#fffbeb', marginHorizontal: 16, marginTop: 8,
    borderRadius: 14, padding: 20, alignItems: 'center',
    borderWidth: 1, borderColor: '#fde68a',
  },
  motiveEmoji: { fontSize: 36, marginBottom: 8 },
  motiveText: { fontSize: 15, color: '#92400e', textAlign: 'center', fontWeight: '500', lineHeight: 22 },
});
