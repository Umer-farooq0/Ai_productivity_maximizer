import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const TYPE_COLORS = {
  assignment: '#3b82f6',
  exam: '#ef4444',
  project: '#8b5cf6',
  reading: '#10b981',
  other: '#6b7280',
};

export default function TaskCard({ task, onLongPress, onComplete }) {
  const color = TYPE_COLORS[task.task_type] || TYPE_COLORS.other;
  const diffDots = Array.from({ length: 5 }, (_, i) => i < (task.difficulty || 0));

  return (
    <TouchableOpacity
      style={[styles.card, task.completed && styles.cardCompleted]}
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
          <TouchableOpacity style={styles.completeBtn} onPress={onComplete}>
            <Text style={styles.completeBtnText}>✓ Complete</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 8, borderRadius: 12, flexDirection: 'row', overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4 },
  cardCompleted: { opacity: 0.6 },
  typeBar: { width: 4 },
  body: { flex: 1, padding: 14 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title: { fontSize: 15, fontWeight: '600', color: '#111827', flex: 1, marginRight: 8 },
  titleCompleted: { textDecorationLine: 'line-through', color: '#9ca3af' },
  typeBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  typeBadgeText: { fontSize: 11, fontWeight: '700' },
  bottomRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dotsRow: { flexDirection: 'row', gap: 2 },
  dot: { fontSize: 10 },
  deadline: { fontSize: 12, color: '#6b7280', flex: 1 },
  priorityBadge: { backgroundColor: '#fef3c7', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  priorityText: { fontSize: 11, fontWeight: 'bold', color: '#d97706' },
  completeBtn: { marginTop: 10, backgroundColor: '#f0fdf4', borderRadius: 6, padding: 6, alignSelf: 'flex-start' },
  completeBtnText: { color: '#16a34a', fontSize: 12, fontWeight: '600' },
});
