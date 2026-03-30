import React, { useState, useContext } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Switch, Alert,
} from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { schedulePrayerReminders, cancelPrayerReminders } from '../services/NotificationService';

export default function SettingsScreen() {
  const { user, logout } = useContext(AuthContext);
  const [namazEnabled, setNamazEnabled] = useState(true);
  const [studyMode, setStudyMode] = useState(true);

  function handleLogout() {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  }

  async function toggleNamaz(val) {
    setNamazEnabled(val);
    if (val) {
      const count = await schedulePrayerReminders().catch(() => 0);
      Alert.alert(
        '🕌 Prayer Reminders On',
        `You'll be reminded for all 5 daily prayers. ${count} reminders scheduled!`,
      );
    } else {
      await cancelPrayerReminders().catch(() => {});
      Alert.alert('Prayer Reminders Off', 'Prayer time notifications have been turned off.');
    }
  }

  const PRAYER_TIMES_INFO = [
    { name: 'Fajr',    time: '5:15 AM'  },
    { name: 'Dhuhr',   time: '1:15 PM'  },
    { name: 'Asr',     time: '4:30 PM'  },
    { name: 'Maghrib', time: '6:30 PM'  },
    { name: 'Isha',    time: '8:00 PM'  },
  ];

  return (
    <ScrollView style={styles.container}>
      {/* Profile header */}
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{(user?.full_name || user?.username || 'S')[0].toUpperCase()}</Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{user?.full_name || user?.username || 'Student'}</Text>
          <Text style={styles.profileEmail}>{user?.email || ''}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Preferences</Text>
      <View style={styles.card}>
        <View style={styles.settingRow}>
          <View style={styles.settingTextCol}>
            <Text style={styles.settingLabel}>🎯 Focus Mode</Text>
            <Text style={styles.settingDesc}>Shows a timer when you start working on a task</Text>
          </View>
          <Switch value={studyMode} onValueChange={setStudyMode} trackColor={{ true: '#3b82f6' }} thumbColor="#fff" />
        </View>

        <View style={styles.divider} />

        <View style={styles.settingRow}>
          <View style={styles.settingTextCol}>
            <Text style={styles.settingLabel}>🕌 Prayer Reminders</Text>
            <Text style={styles.settingDesc}>Get notified at each Namaz time — prayer has the highest priority!</Text>
          </View>
          <Switch value={namazEnabled} onValueChange={toggleNamaz} trackColor={{ true: '#8b5cf6' }} thumbColor="#fff" />
        </View>

        {namazEnabled && (
          <View style={styles.namazBox}>
            <Text style={styles.namazTitle}>📿 Today's Approximate Prayer Times</Text>
            <Text style={styles.namazNote}>These are average Pakistan (PKT) times. The app will remind you at these times each day.</Text>
            {PRAYER_TIMES_INFO.map(p => (
              <View key={p.name} style={styles.prayerRow}>
                <Text style={styles.prayerName}>🕌 {p.name}</Text>
                <Text style={styles.prayerTime}>{p.time}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <Text style={styles.sectionTitle}>About This App</Text>
      <View style={styles.card}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>App Version</Text>
          <Text style={styles.infoValue}>1.0.0</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Powered by</Text>
          <Text style={styles.infoValue}>FastAPI + AI 🤖</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Break Reminder</Text>
          <Text style={styles.infoValue}>AI-personalized ☕</Text>
        </View>
      </View>

      <View style={styles.tipsCard}>
        <Text style={styles.tipsTitle}>💡 Quick Tips</Text>
        <Text style={styles.tipItem}>• Tap ▶ Start Task on any task to start its timer</Text>
        <Text style={styles.tipItem}>• Long-press a task to edit or delete it</Text>
        <Text style={styles.tipItem}>• Go to Schedule → Generate to get an AI study plan</Text>
        <Text style={styles.tipItem}>• Check Analytics to see your progress charts</Text>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutBtnText}>🚪 Logout</Text>
      </TouchableOpacity>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  profileCard: { backgroundColor: '#3b82f6', padding: 24, flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 68, height: 68, borderRadius: 34, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 28, fontWeight: 'bold', color: '#3b82f6' },
  profileInfo: { marginLeft: 16 },
  profileName: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  profileEmail: { fontSize: 14, color: '#bfdbfe', marginTop: 4 },

  sectionTitle: { fontSize: 12, fontWeight: '700', color: '#6b7280', margin: 16, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  card: { backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 14, overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, marginBottom: 12 },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  settingTextCol: { flex: 1, marginRight: 12 },
  settingLabel: { fontSize: 15, fontWeight: '600', color: '#111827' },
  settingDesc: { fontSize: 12, color: '#6b7280', marginTop: 3, lineHeight: 16 },
  divider: { height: 1, backgroundColor: '#f3f4f6', marginHorizontal: 16 },

  namazBox: { backgroundColor: '#f5f3ff', margin: 12, borderRadius: 12, padding: 14 },
  namazTitle: { fontSize: 14, fontWeight: '700', color: '#7c3aed', marginBottom: 4 },
  namazNote: { fontSize: 12, color: '#6b7280', marginBottom: 10, lineHeight: 16 },
  prayerRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: '#ede9fe' },
  prayerName: { fontSize: 14, color: '#374151', fontWeight: '500' },
  prayerTime: { fontSize: 14, color: '#7c3aed', fontWeight: '600' },

  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  infoLabel: { fontSize: 15, color: '#374151' },
  infoValue: { fontSize: 15, color: '#6b7280' },

  tipsCard: { backgroundColor: '#fffbeb', marginHorizontal: 16, borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#fde68a' },
  tipsTitle: { fontSize: 14, fontWeight: '700', color: '#92400e', marginBottom: 10 },
  tipItem: { fontSize: 13, color: '#78350f', marginBottom: 6, lineHeight: 18 },

  logoutBtn: { backgroundColor: '#fee2e2', marginHorizontal: 16, marginTop: 4, borderRadius: 14, padding: 16, alignItems: 'center' },
  logoutBtnText: { color: '#dc2626', fontWeight: 'bold', fontSize: 16 },
});
