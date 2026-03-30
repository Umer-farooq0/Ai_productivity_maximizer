import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const TYPE_COLORS = {
  assignment: '#3b82f6',
  exam: '#ef4444',
  project: '#8b5cf6',
  reading: '#10b981',
  other: '#6b7280',
};

/** Format seconds → "MM:SS" or "Hh MMm" for longer durations */
function formatElapsed(seconds) {
  if (seconds < 3600) {
    const m = String(Math.floor(seconds / 60)).padStart(2, '0');
    const s = String(seconds % 60).padStart(2, '0');
    return `${m}:${s}`;
  }
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

export default function TaskCard({ task, onLongPress, onComplete, isTimerActive, elapsed, onStartTimer, onStopTimer }) {
  const color = TYPE_COLORS[task.task_type] || TYPE_COLORS.other;
  const diffDots = Array.from({ length: 5 }, (_, i) => i < (task.difficulty || 0));

  return (
    <TouchableOpacity
      style={[styles.card, task.completed && styles.cardCompleted, isTimerActive && styles.cardActive]}
      onLongPress={onLongPress}
      activeOpacity={0.7}
    >
      <View style={[styles.typeBar, { backgroundColor: color }]} />
      <View style={styles.body}>
        <View style={styles.topRow}>
          <Text style={[styles.title, task.completed && styles.titleCompleted]} numberOfLines={1}>
            {task.title}
          </Text>
          <View style={[styles.typeBadge, { backgroundColor: color + '20' }]}>
            <Text style={[styles.typeBadgeText, { color }]}>{task.task_type}</Text>
          </View>
        </View>

        {/* Active timer display */}
        {isTimerActive && (
          <View style={styles.timerRow}>
            <Text style={styles.timerIcon}>⏱️</Text>
            <Text style={styles.timerText}>{formatElapsed(elapsed || 0)}</Text>
            <Text style={styles.timerLabel}> — working now</Text>
          </View>
        )}

        <View style={styles.bottomRow}>
          <View style={styles.dotsRow}>
            {diffDots.map((filled, i) => (
              <Text key={i} style={[styles.dot, { color: filled ? '#f59e0b' : '#e5e7eb' }]}>●</Text>
            ))}
          </View>
          {task.deadline && (
            <Text style={styles.deadline}>📅 {task.deadline.substring(0, 10)}</Text>
          )}
          {task.priority_score != null && (
            <View style={styles.priorityBadge}>
              <Text style={styles.priorityText}>P{Math.round(task.priority_score)}</Text>
            </View>
          )}
        </View>

        {!task.completed && (
          <View style={styles.actionRow}>
            {isTimerActive ? (
              <TouchableOpacity style={styles.stopBtn} onPress={onStopTimer}>
                <Text style={styles.stopBtnText}>⏹ Stop Task</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={[styles.startBtn, { borderColor: color }]} onPress={onStartTimer}>
                <Text style={[styles.startBtnText, { color }]}>▶ Start Task</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.completeBtn} onPress={onComplete}>
              <Text style={styles.completeBtnText}>✓ Done</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 10,
    borderRadius: 14, flexDirection: 'row', overflow: 'hidden',
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 5,
  },
  cardCompleted: { opacity: 0.6 },
  cardActive: { borderWidth: 1.5, borderColor: '#3b82f6', elevation: 4 },
  typeBar: { width: 5 },
  body: { flex: 1, padding: 14 },

  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  title: { fontSize: 15, fontWeight: '700', color: '#111827', flex: 1, marginRight: 8 },
  titleCompleted: { textDecorationLine: 'line-through', color: '#9ca3af' },
  typeBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  typeBadgeText: { fontSize: 11, fontWeight: '700' },

  timerRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#eff6ff', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, marginBottom: 8, alignSelf: 'flex-start' },
  timerIcon: { fontSize: 14, marginRight: 4 },
  timerText: { fontSize: 15, fontWeight: 'bold', color: '#1d4ed8' },
  timerLabel: { fontSize: 12, color: '#3b82f6' },

  bottomRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  dotsRow: { flexDirection: 'row', gap: 2 },
  dot: { fontSize: 10 },
  deadline: { fontSize: 12, color: '#6b7280', flex: 1 },
  priorityBadge: { backgroundColor: '#fef3c7', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  priorityText: { fontSize: 11, fontWeight: 'bold', color: '#d97706' },

  actionRow: { flexDirection: 'row', gap: 8 },
  startBtn: { borderWidth: 1.5, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6 },
  startBtnText: { fontSize: 13, fontWeight: '700' },
  stopBtn: { backgroundColor: '#fee2e2', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6 },
  stopBtnText: { color: '#dc2626', fontSize: 13, fontWeight: '700' },
  completeBtn: { backgroundColor: '#f0fdf4', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6 },
  completeBtnText: { color: '#16a34a', fontSize: 13, fontWeight: '600' },
});
