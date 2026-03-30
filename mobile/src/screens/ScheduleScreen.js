import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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

// Refresh the "current time" every 60 seconds so past slots update automatically
const TICK_MS = 60 * 1000;

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
  if (isoStr.length >= 16 && isoStr.includes('T')) return isoStr.substring(11, 16);
  return isoStr.substring(0, 5);
}

/**
 * Returns 'past' | 'current' | 'upcoming'
 * 'current' = slot has started but not yet finished
 */
function getSlotStatus(slot, now) {
  const start = slot.start ? new Date(slot.start) : null;
  const end = slot.end ? new Date(slot.end) : null;
  if (!start || isNaN(start)) return 'upcoming';
  if (end && !isNaN(end) && end <= now) return 'past';
  if (start <= now) return 'current';
  return 'upcoming';
}

const DAYS = getWeekDayLabels();

export default function ScheduleScreen() {
  const [weekData, setWeekData] = useState([]);
  const [selectedDay, setSelectedDay] = useState(0);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [now, setNow] = useState(new Date());
  const tickRef = useRef(null);

  // Keep 'now' up to date so past/current slot highlights refresh automatically
  useEffect(() => {
    tickRef.current = setInterval(() => setNow(new Date()), TICK_MS);
    return () => clearInterval(tickRef.current);
  }, []);

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
      setError('No schedule found yet. Tap "Generate" below to build one!');
      setWeekData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  // Derive current day's time slots from weekData
  const currentSlots = useMemo(() => {
    if (!weekData.length) return [];
    const dateStr = getTargetDateStr(selectedDay);
    const dayObj = weekData.find(d => d.date === dateStr);
    return dayObj?.time_slots || [];
  }, [weekData, selectedDay]);

  // For Today, separate into upcoming/current and past so we can show smart summaries
  const { pastSlots, activeSlots } = useMemo(() => {
    if (selectedDay !== 0) return { pastSlots: [], activeSlots: currentSlots };
    const past = [];
    const active = [];
    currentSlots.forEach(slot => {
      if (getSlotStatus(slot, now) === 'past') past.push(slot);
      else active.push(slot);
    });
    return { pastSlots: past, activeSlots: active };
  }, [currentSlots, selectedDay, now]);

  async function handleGenerate() {
    Alert.alert(
      '🤖 Create My Schedule',
      'The AI will build a smart study plan based on your tasks. This only takes a few seconds!',
      [
        { text: 'Not now', style: 'cancel' },
        {
          text: 'Yes, Generate!', onPress: async () => {
            setGenerating(true);
            try {
              await api.post('/schedule/generate', { days: DEFAULT_SCHEDULE_DAYS });
              await fetchSchedule();
            } catch (e) {
              Alert.alert('Oops!', e.response?.data?.detail || 'Could not generate schedule. Please try again.');
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

  function renderSlot(item, i, forceStatus) {
    const color = getTypeColor(item.type);
    const startTime = formatTime(item.start);
    const endTime = formatTime(item.end);
    const icon = TYPE_ICONS[item.type?.toLowerCase()] || '📌';
    const label = item.label || `${icon} Session`;
    const status = forceStatus || getSlotStatus(item, now);
    const isPast = status === 'past';
    const isCurrent = status === 'current';

    return (
      <View key={i} style={[styles.timelineItem, isPast && styles.timelineItemPast]}>
        <View style={styles.timeCol}>
          <Text style={[styles.timeText, isPast && styles.timeTextPast]}>{startTime}</Text>
          <View style={[styles.timeDot, { backgroundColor: isPast ? '#d1d5db' : color }, isCurrent && styles.timeDotCurrent]} />
          <View style={[styles.timeLine, isPast && styles.timeLinePast]} />
          <Text style={[styles.timeText, isPast && styles.timeTextPast]}>{endTime}</Text>
        </View>
        <View style={[
          styles.itemCard,
          { borderLeftColor: isPast ? '#d1d5db' : color, borderLeftWidth: 4 },
          isCurrent && styles.itemCardCurrent,
        ]}>
          {isCurrent && (
            <View style={styles.nowBadge}>
              <Text style={styles.nowBadgeText}>▶ NOW</Text>
            </View>
          )}
          {isPast && (
            <View style={styles.doneBadge}>
              <Text style={styles.doneBadgeText}>✓ Done</Text>
            </View>
          )}
          <View style={[styles.typeBadge, { backgroundColor: (isPast ? '#9ca3af' : color) + BADGE_OPACITY }]}>
            <Text style={[styles.typeBadgeText, { color: isPast ? '#9ca3af' : color }]}>
              {item.type || 'session'}
            </Text>
          </View>
          <Text style={[styles.itemTitle, isPast && styles.itemTitlePast]}>{label}</Text>
          <Text style={styles.itemDuration}>{startTime} – {endTime}</Text>
        </View>
      </View>
    );
  }

  // Decide the empty-state message for today when all sessions are done
  const allDoneToday = selectedDay === 0 && currentSlots.length > 0 && activeSlots.length === 0;

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.generateBtn} onPress={handleGenerate} disabled={generating}>
        {generating
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.generateBtnText}>🤖 Generate AI Schedule</Text>
        }
      </TouchableOpacity>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.dayScroll}
        contentContainerStyle={{ paddingHorizontal: 16 }}
      >
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
          <Text style={styles.emptyTitle}>No Schedule Yet</Text>
          <Text style={styles.emptyText}>{error || 'Tap "Generate AI Schedule" above to create your personalized study plan!'}</Text>
        </View>
      ) : currentSlots.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyIcon}>🎉</Text>
          <Text style={styles.emptyTitle}>Nothing Scheduled</Text>
          <Text style={styles.emptyText}>No sessions for this day. Enjoy your free time!</Text>
        </View>
      ) : (
        <ScrollView style={styles.timeline} contentContainerStyle={{ padding: 16 }}>

          {/* Today: show upcoming/current slots first */}
          {activeSlots.length > 0 && activeSlots.map((item, i) => renderSlot(item, `a${i}`))}

          {/* "All done" banner when nothing left today */}
          {allDoneToday && (
            <View style={styles.allDoneBox}>
              <Text style={styles.allDoneEmoji}>🌙</Text>
              <Text style={styles.allDoneTitle}>You're all done for today!</Text>
              <Text style={styles.allDoneText}>Great job! Check tomorrow's tab to see what's coming up next.</Text>
            </View>
          )}

          {/* Past sessions collapsible section */}
          {pastSlots.length > 0 && (
            <View style={styles.pastSection}>
              <Text style={styles.pastSectionTitle}>✓ Earlier today ({pastSlots.length} sessions)</Text>
              {pastSlots.map((item, i) => renderSlot(item, `p${i}`, 'past'))}
            </View>
          )}

          {/* Non-today days: show all slots normally */}
          {selectedDay !== 0 && currentSlots.map((item, i) => renderSlot(item, `s${i}`))}

          <View style={{ height: 24 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  generateBtn: { backgroundColor: '#3b82f6', margin: 16, borderRadius: 14, padding: 16, alignItems: 'center', elevation: 3, shadowColor: '#3b82f6', shadowOpacity: 0.3, shadowRadius: 6 },
  generateBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },

  dayScroll: { maxHeight: 56 },
  dayChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#e5e7eb', marginRight: 8, height: 36, justifyContent: 'center' },
  dayChipActive: { backgroundColor: '#3b82f6' },
  dayChipText: { color: '#6b7280', fontWeight: '600', fontSize: 13 },
  dayChipTextActive: { color: '#fff' },

  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  emptyBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyIcon: { fontSize: 56, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 8 },
  emptyText: { color: '#6b7280', fontSize: 14, textAlign: 'center', lineHeight: 20 },

  timeline: { flex: 1 },
  timelineItem: { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-start' },
  timelineItemPast: { opacity: 0.55 },

  timeCol: { width: 52, alignItems: 'center', paddingTop: 6 },
  timeText: { fontSize: 11, color: '#6b7280', fontWeight: '600' },
  timeTextPast: { color: '#9ca3af' },
  timeDot: { width: 10, height: 10, borderRadius: 5, marginVertical: 4 },
  timeDotCurrent: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: '#fff' },
  timeLine: { width: 2, flex: 1, backgroundColor: '#e5e7eb', marginBottom: 4, minHeight: 16 },
  timeLinePast: { backgroundColor: '#d1d5db' },

  itemCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 12,
    marginLeft: 10, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4,
  },
  itemCardCurrent: {
    borderWidth: 1, borderColor: '#3b82f6',
    backgroundColor: '#eff6ff', elevation: 4,
  },

  nowBadge: { backgroundColor: '#3b82f6', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start', marginBottom: 6 },
  nowBadgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  doneBadge: { backgroundColor: '#d1fae5', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start', marginBottom: 6 },
  doneBadgeText: { color: '#059669', fontSize: 11, fontWeight: '700' },

  typeBadge: { alignSelf: 'flex-start', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 2, marginBottom: 6 },
  typeBadgeText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  itemTitle: { fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 4 },
  itemTitlePast: { color: '#9ca3af', textDecorationLine: 'line-through' },
  itemDuration: { fontSize: 12, color: '#9ca3af' },

  allDoneBox: {
    backgroundColor: '#f0fdf4', borderRadius: 14, padding: 20,
    alignItems: 'center', marginBottom: 20,
    borderWidth: 1, borderColor: '#bbf7d0',
  },
  allDoneEmoji: { fontSize: 40, marginBottom: 8 },
  allDoneTitle: { fontSize: 17, fontWeight: '700', color: '#059669', marginBottom: 4 },
  allDoneText: { fontSize: 13, color: '#374151', textAlign: 'center', lineHeight: 20 },

  pastSection: { marginTop: 8, marginBottom: 8 },
  pastSectionTitle: { fontSize: 12, fontWeight: '700', color: '#9ca3af', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
});
