import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import api from '../api';

const DIET_OPTIONS = ['poor', 'fair', 'good', 'excellent'];
const EXERCISE_OPTIONS = ['none', 'rarely', 'sometimes', 'regularly', 'daily'];
const HIGH_PERFORMANCE_THRESHOLD = 70;

function SliderRow({ label, value, min, max, step = 1, onChange }) {
  return (
    <View style={styles.sliderRow}>
      <View style={styles.sliderLabelRow}>
        <Text style={styles.sliderLabel}>{label}</Text>
        <Text style={styles.sliderValue}>{value}</Text>
      </View>
      <View style={styles.sliderTrack}>
        {Array.from({ length: Math.floor((max - min) / step) + 1 }, (_, i) => min + i * step).map(v => (
          <TouchableOpacity key={v} onPress={() => onChange(v)} style={[styles.sliderDot, value === v && styles.sliderDotActive]}>
            <Text style={{ fontSize: 0 }}>{v}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.sliderMinMax}>
        <Text style={styles.sliderMin}>{min}</Text>
        <Text style={styles.sliderMax}>{max}</Text>
      </View>
    </View>
  );
}

function OptionPicker({ label, options, value, onChange }) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={styles.label}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {options.map(opt => (
          <TouchableOpacity
            key={opt}
            style={[styles.optPill, value === opt && styles.optPillActive]}
            onPress={() => onChange(opt)}
          >
            <Text style={[styles.optPillText, value === opt && styles.optPillTextActive]}>{opt}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

export default function AnalyticsScreen() {
  const [form, setForm] = useState({
    study_hours_per_day: 6,
    sleep_hours: 7,
    social_media_hours: 2,
    attendance_percentage: 80,
    mental_health_rating: 7,
    diet_quality: 'good',
    exercise_frequency: 'sometimes',
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  function update(key, val) { setForm(prev => ({ ...prev, [key]: val })); }

  async function handlePredict() {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await api.post('/analytics/predict', form);
      setResult(res.data);
    } catch (e) {
      setError(e.response?.data?.detail || 'Prediction failed. Check your connection.');
    } finally {
      setLoading(false);
    }
  }

  const isHigh = result?.prediction === 'High' || result?.predicted_grade >= HIGH_PERFORMANCE_THRESHOLD;
  const prob = result?.probability ?? result?.confidence ?? 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.heading}>Performance Predictor</Text>
      <Text style={styles.subheading}>Enter your habits to predict academic performance</Text>

      <View style={styles.card}>
        <SliderRow label="Study Hours/Day" value={form.study_hours_per_day} min={0} max={12} onChange={v => update('study_hours_per_day', v)} />
        <SliderRow label="Sleep Hours" value={form.sleep_hours} min={4} max={12} onChange={v => update('sleep_hours', v)} />
        <SliderRow label="Social Media Hours" value={form.social_media_hours} min={0} max={8} onChange={v => update('social_media_hours', v)} />
        <SliderRow label="Attendance %" value={form.attendance_percentage} min={0} max={100} step={5} onChange={v => update('attendance_percentage', v)} />
        <SliderRow label="Mental Health (1-10)" value={form.mental_health_rating} min={1} max={10} onChange={v => update('mental_health_rating', v)} />

        <OptionPicker label="Diet Quality" options={DIET_OPTIONS} value={form.diet_quality} onChange={v => update('diet_quality', v)} />
        <OptionPicker label="Exercise Frequency" options={EXERCISE_OPTIONS} value={form.exercise_frequency} onChange={v => update('exercise_frequency', v)} />

        <TouchableOpacity style={styles.predictBtn} onPress={handlePredict} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.predictBtnText}>⚡ Predict Performance</Text>}
        </TouchableOpacity>
      </View>

      {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}

      {result && (
        <View style={[styles.resultCard, { borderColor: isHigh ? '#10b981' : '#f59e0b' }]}>
          <Text style={[styles.resultTitle, { color: isHigh ? '#10b981' : '#f59e0b' }]}>
            {isHigh ? '🌟 High Performance' : '📈 Needs Improvement'}
          </Text>
          {result.prediction && <Text style={styles.resultPrediction}>{result.prediction}</Text>}
          <View style={styles.probBar}>
            <View style={[styles.probFill, { width: `${Math.round(prob * 100)}%`, backgroundColor: isHigh ? '#10b981' : '#f59e0b' }]} />
          </View>
          <Text style={styles.probText}>Confidence: {Math.round(prob * 100)}%</Text>
          {result.tips && result.tips.length > 0 && (
            <View style={styles.tipsBox}>
              <Text style={styles.tipsTitle}>💡 Tips</Text>
              {result.tips.map((tip, i) => <Text key={i} style={styles.tipItem}>• {tip}</Text>)}
            </View>
          )}
        </View>
      )}

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  heading: { fontSize: 22, fontWeight: 'bold', color: '#111827', marginBottom: 4 },
  subheading: { fontSize: 14, color: '#6b7280', marginBottom: 16 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 },
  sliderRow: { marginBottom: 20 },
  sliderLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  sliderLabel: { fontSize: 13, fontWeight: '600', color: '#374151' },
  sliderValue: { fontSize: 13, fontWeight: 'bold', color: '#3b82f6' },
  sliderTrack: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4 },
  sliderDot: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#e5e7eb' },
  sliderDotActive: { backgroundColor: '#3b82f6' },
  sliderMinMax: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  sliderMin: { fontSize: 11, color: '#9ca3af' },
  sliderMax: { fontSize: 11, color: '#9ca3af' },
  optPill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#e5e7eb', marginRight: 8 },
  optPillActive: { backgroundColor: '#3b82f6' },
  optPillText: { color: '#6b7280', fontWeight: '600', fontSize: 13 },
  optPillTextActive: { color: '#fff' },
  predictBtn: { backgroundColor: '#3b82f6', borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 8 },
  predictBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  errorBox: { backgroundColor: '#fee2e2', borderRadius: 8, padding: 12, marginBottom: 16 },
  errorText: { color: '#dc2626', fontSize: 13 },
  resultCard: { backgroundColor: '#fff', borderRadius: 12, padding: 20, elevation: 2, borderWidth: 2, marginBottom: 16 },
  resultTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  resultPrediction: { fontSize: 15, color: '#374151', marginBottom: 12 },
  probBar: { height: 10, backgroundColor: '#e5e7eb', borderRadius: 5, overflow: 'hidden', marginBottom: 6 },
  probFill: { height: 10, borderRadius: 5 },
  probText: { fontSize: 13, color: '#6b7280', marginBottom: 12 },
  tipsBox: { backgroundColor: '#f0fdf4', borderRadius: 8, padding: 12 },
  tipsTitle: { fontSize: 14, fontWeight: 'bold', color: '#059669', marginBottom: 8 },
  tipItem: { fontSize: 13, color: '#374151', marginBottom: 4 },
});
