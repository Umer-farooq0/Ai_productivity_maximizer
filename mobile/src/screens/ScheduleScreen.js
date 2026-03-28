import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import api from '../api';

const TYPE_COLORS = {
  study: '#3b82f6',
  break: '#10b981',
  namaz: '#8b5cf6',
  default: '#6b7280',
};

const DAYS = ['Today', 'Tomorrow', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'];

export default function ScheduleScreen() {
  const [schedule, setSchedule] = useState([]);
  const [selectedDay, setSelectedDay] = useState(0);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  const fetchSchedule = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/schedule/today');
      setSchedule(res.data || []);
      setError('');
    } catch {
      setError('No schedule found. Generate one below.');
      setSchedule([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

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
              await api.post('/schedule/generate');
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
    const key = type.toLowerCase();
    return TYPE_COLORS[key] || TYPE_COLORS.default;
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
      ) : error ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyIcon}>📅</Text>
          <Text style={styles.emptyText}>{error}</Text>
        </View>
      ) : schedule.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyIcon}>📅</Text>
          <Text style={styles.emptyText}>No schedule for today. Generate one!</Text>
        </View>
      ) : (
        <ScrollView style={styles.timeline} contentContainerStyle={{ padding: 16 }}>
          {schedule.map((item, i) => (
            <View key={item.id || i} style={styles.timelineItem}>
              <View style={styles.timeCol}>
                <Text style={styles.timeText}>{item.start_time ? item.start_time.substring(0, 5) : '--:--'}</Text>
                <View style={styles.timeLine} />
                <Text style={styles.timeText}>{item.end_time ? item.end_time.substring(0, 5) : '--:--'}</Text>
              </View>
              <View style={[styles.itemCard, { borderLeftColor: getTypeColor(item.activity_type), borderLeftWidth: 4 }]}>
                <Text style={styles.itemTitle}>{item.title || item.task_title || 'Break'}</Text>
                <View style={[styles.typeBadge, { backgroundColor: getTypeColor(item.activity_type) + '20' }]}>
                  <Text style={[styles.typeBadgeText, { color: getTypeColor(item.activity_type) }]}>
                    {item.activity_type || 'general'}
                  </Text>
                </View>
                {item.notes ? <Text style={styles.itemNotes}>{item.notes}</Text> : null}
              </View>
            </View>
          ))}
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
  dayChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#e5e7eb', marginRight: 8, height: 36 },
  dayChipActive: { backgroundColor: '#3b82f6' },
  dayChipText: { color: '#6b7280', fontWeight: '600', fontSize: 13 },
  dayChipTextActive: { color: '#fff' },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyText: { color: '#6b7280', fontSize: 15, textAlign: 'center' },
  timeline: { flex: 1 },
  timelineItem: { flexDirection: 'row', marginBottom: 16 },
  timeCol: { width: 60, alignItems: 'center' },
  timeText: { fontSize: 11, color: '#6b7280', fontWeight: '600' },
  timeLine: { width: 2, flex: 1, backgroundColor: '#e5e7eb', marginVertical: 4 },
  itemCard: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 14, marginLeft: 12, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4 },
  itemTitle: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 6 },
  typeBadge: { alignSelf: 'flex-start', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 2 },
  typeBadgeText: { fontSize: 12, fontWeight: '600' },
  itemNotes: { fontSize: 12, color: '#6b7280', marginTop: 6 },
});
