import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function StatsCard({ label, value, icon, color }) {
  return (
    <View style={[styles.card, { borderTopColor: color, borderTopWidth: 3 }]}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={[styles.value, { color }]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    margin: 8,
    width: '44%',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  icon: { fontSize: 28, marginBottom: 8 },
  value: { fontSize: 26, fontWeight: 'bold', marginBottom: 4 },
  label: { fontSize: 12, color: '#6b7280', textAlign: 'center' },
});
