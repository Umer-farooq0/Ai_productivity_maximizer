import React, { useState, useContext } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Switch, Alert,
} from 'react-native';
import { AuthContext } from '../context/AuthContext';

export default function SettingsScreen() {
  const { user, logout } = useContext(AuthContext);
  const [namazEnabled, setNamazEnabled] = useState(false);
  const [studyMode, setStudyMode] = useState(true);

  function handleLogout() {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  }

  return (
    <ScrollView style={styles.container}>
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
          <View>
            <Text style={styles.settingLabel}>Study Mode</Text>
            <Text style={styles.settingDesc}>Focus timer and distraction blocking</Text>
          </View>
          <Switch value={studyMode} onValueChange={setStudyMode} trackColor={{ true: '#3b82f6' }} />
        </View>

        <View style={styles.divider} />

        <View style={styles.settingRow}>
          <View>
            <Text style={styles.settingLabel}>Namaz Breaks 🕌</Text>
            <Text style={styles.settingDesc}>Schedule prayer time breaks</Text>
          </View>
          <Switch value={namazEnabled} onValueChange={setNamazEnabled} trackColor={{ true: '#8b5cf6' }} />
        </View>

        {namazEnabled && (
          <View style={styles.namazBox}>
            <Text style={styles.namazTitle}>Prayer Times (auto-detected)</Text>
            {['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].map(prayer => (
              <View key={prayer} style={styles.prayerRow}>
                <Text style={styles.prayerName}>{prayer}</Text>
                <Text style={styles.prayerTime}>Auto</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <Text style={styles.sectionTitle}>About</Text>
      <View style={styles.card}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Version</Text>
          <Text style={styles.infoValue}>1.0.0</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Backend</Text>
          <Text style={styles.infoValue}>FastAPI + ML</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutBtnText}>🚪 Logout</Text>
      </TouchableOpacity>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  profileCard: { backgroundColor: '#3b82f6', padding: 24, flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 26, fontWeight: 'bold', color: '#3b82f6' },
  profileInfo: { marginLeft: 16 },
  profileName: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  profileEmail: { fontSize: 14, color: '#bfdbfe', marginTop: 4 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#6b7280', margin: 16, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  card: { backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 12, overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, marginBottom: 8 },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  settingLabel: { fontSize: 15, fontWeight: '600', color: '#111827' },
  settingDesc: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  divider: { height: 1, backgroundColor: '#f3f4f6', marginHorizontal: 16 },
  namazBox: { backgroundColor: '#f5f3ff', margin: 12, borderRadius: 8, padding: 12 },
  namazTitle: { fontSize: 13, fontWeight: '700', color: '#7c3aed', marginBottom: 8 },
  prayerRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  prayerName: { fontSize: 14, color: '#374151' },
  prayerTime: { fontSize: 14, color: '#6b7280' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  infoLabel: { fontSize: 15, color: '#374151' },
  infoValue: { fontSize: 15, color: '#6b7280' },
  logoutBtn: { backgroundColor: '#fee2e2', marginHorizontal: 16, marginTop: 8, borderRadius: 12, padding: 16, alignItems: 'center' },
  logoutBtnText: { color: '#dc2626', fontWeight: 'bold', fontSize: 16 },
});
