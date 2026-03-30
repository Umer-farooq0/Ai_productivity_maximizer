import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import api from '../api';
import { scheduleSessionNotifications } from '../services/NotificationService';

const TYPE_COLORS = {
  study: '#3b82f6',
  break: '#10b981',
  namaz: '#8b5cf6',
  free: '#f59e0b',
  default: '#6b7280',
};

const TYPE_ICONS = {
  study: '📖',
  break: '☕',
  namaz: '🕌',
  free: '✅',
};

const DEFAULT_SCHEDULE_DAYS = 7;
const BADGE_OPACITY = '22';

function getWeekDayLabels() {
  const labels = ['Today', 'Tomorrow'];
  const now = new Date();
  for (let i = 2; i < 7; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    labels.push(d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }));
  }
  return labels;
}

function getTargetDateStr(dayOffset) {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  return d.toISOString().split('T')[0];
}

function formatTime(isoStr) {
  if (!isoStr) return '--:--';
  // ISO datetime "2026-03-30T09:00:00" → "09:00"
  if (isoStr.length >= 16 && isoStr.includes('T')) return isoStr.substring(11, 16);
  return isoStr.substring(0, 5);
}

const DAYS = getWeekDayLabels();

export default function ScheduleScreen() {
  const [weekData, setWeekData] = useState([]);
  const [selectedDay, setSelectedDay] = useState(0);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  const fetchSchedule = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/schedule/week');
      const days = res.data?.schedule || [];
      setWeekData(days);
      setError('');
      if (days.length > 0) {
        scheduleSessionNotifications(days).catch(() => {});
      }
    } catch {
      setError('No schedule found. Generate one below.');
      setWeekData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  // Derive current day's time slots from weekData based on selected day tab
  const currentSlots = useMemo(() => {
    if (!weekData.length) return [];
    const dateStr = getTargetDateStr(selectedDay);
    const dayObj = weekData.find(d => d.date === dateStr);
    return dayObj?.time_slots || [];
  }, [weekData, selectedDay]);

  async function handleGenerate() {
    Alert.alert(
      'Generate Schedule',
      'This will create an AI-optimized study schedule for your tasks.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Generate', onPress: async () => {
            setGenerating(true);
            try {
              await api.post('/schedule/generate', { days: DEFAULT_SCHEDULE_DAYS });
              await fetchSchedule();
            } catch (e) {
              Alert.alert('Error', e.response?.data?.detail || 'Failed to generate schedule');
            } finally {
              setGenerating(false);
            }
          }
        }
      ]
    );
  }

  function getTypeColor(type) {
    if (!type) return TYPE_COLORS.default;
    return TYPE_COLORS[type.toLowerCase()] || TYPE_COLORS.default;
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.generateBtn} onPress={handleGenerate} disabled={generating}>
        {generating
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.generateBtnText}>🤖 Generate AI Schedule</Text>
        }
      </TouchableOpacity>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayScroll} contentContainerStyle={{ paddingHorizontal: 16 }}>
        {DAYS.map((day, i) => (
          <TouchableOpacity
            key={i}
            style={[styles.dayChip, selectedDay === i && styles.dayChipActive]}
            onPress={() => setSelectedDay(i)}
          >
            <Text style={[styles.dayChipText, selectedDay === i && styles.dayChipTextActive]}>{day}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.loader}><ActivityIndicator size="large" color="#3b82f6" /></View>
      ) : weekData.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyIcon}>📅</Text>
          <Text style={styles.emptyText}>{error || 'No schedule yet. Tap "Generate" to create one!'}</Text>
        </View>
      ) : currentSlots.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyIcon}>🎉</Text>
          <Text style={styles.emptyText}>No sessions scheduled for this day.</Text>
        </View>
      ) : (
        <ScrollView style={styles.timeline} contentContainerStyle={{ padding: 16 }}>
          {currentSlots.map((item, i) => {
            const color = getTypeColor(item.type);
            const startTime = formatTime(item.start);
            const endTime = formatTime(item.end);
            const icon = TYPE_ICONS[item.type?.toLowerCase()] || '📌';
            const label = item.label || `${icon} Session`;
            return (
              <View key={i} style={styles.timelineItem}>
                <View style={styles.timeCol}>
                  <Text style={styles.timeText}>{startTime}</Text>
                  <View style={[styles.timeDot, { backgroundColor: color }]} />
                  <View style={styles.timeLine} />
                  <Text style={styles.timeText}>{endTime}</Text>
                </View>
                <View style={[styles.itemCard, { borderLeftColor: color, borderLeftWidth: 4 }]}>
                  <View style={[styles.typeBadge, { backgroundColor: color + BADGE_OPACITY }]}>
                    <Text style={[styles.typeBadgeText, { color }]}>
                      {item.type || 'session'}
                    </Text>
                  </View>
                  <Text style={styles.itemTitle}>{label}</Text>
                  <Text style={styles.itemDuration}>{startTime} – {endTime}</Text>
                </View>
              </View>
            );
          })}
          <View style={{ height: 24 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  generateBtn: { backgroundColor: '#3b82f6', margin: 16, borderRadius: 12, padding: 14, alignItems: 'center' },
  generateBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  dayScroll: { maxHeight: 56 },
  dayChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#e5e7eb', marginRight: 8, height: 36, justifyContent: 'center' },
  dayChipActive: { backgroundColor: '#3b82f6' },
  dayChipText: { color: '#6b7280', fontWeight: '600', fontSize: 13 },
  dayChipTextActive: { color: '#fff' },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyText: { color: '#6b7280', fontSize: 15, textAlign: 'center' },
  timeline: { flex: 1 },
  timelineItem: { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-start' },
  timeCol: { width: 52, alignItems: 'center', paddingTop: 6 },
  timeText: { fontSize: 11, color: '#6b7280', fontWeight: '600' },
  timeDot: { width: 10, height: 10, borderRadius: 5, marginVertical: 4 },
  timeLine: { width: 2, flex: 1, backgroundColor: '#e5e7eb', marginBottom: 4, minHeight: 16 },
  itemCard: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 12, marginLeft: 10, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4 },
  typeBadge: { alignSelf: 'flex-start', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 2, marginBottom: 6 },
  typeBadgeText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  itemTitle: { fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 4 },
  itemDuration: { fontSize: 12, color: '#9ca3af' },
});
