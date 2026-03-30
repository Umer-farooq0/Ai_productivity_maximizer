import React, { useState, useContext } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView,
  Platform, ScrollView,
} from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { isNetworkError } from '../api';

export default function RegisterScreen({ navigation }) {
  const { register } = useContext(AuthContext);
  const [form, setForm] = useState({ full_name: '', username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function update(key, val) { setForm(prev => ({ ...prev, [key]: val })); }

  async function handleRegister() {
    if (!form.full_name || !form.username || !form.email || !form.password) {
      setError('Please fill in all fields'); return;
    }
    setLoading(true);
    setError('');
    try {
      await register(form);
    } catch (e) {
      if (isNetworkError(e)) {
        setError('Cannot reach the server. Make sure the backend is running and your device is on the same Wi-Fi network as your PC.');
      } else {
        setError(e.response?.data?.detail || 'Registration failed.');
      }
    } finally {
      setLoading(false);
    }
  }

  const fields = [
    { key: 'full_name', label: 'Full Name', placeholder: 'John Doe' },
    { key: 'username', label: 'Username', placeholder: 'johndoe' },
    { key: 'email', label: 'Email', placeholder: 'you@example.com', keyboardType: 'email-address' },
    { key: 'password', label: 'Password', placeholder: '••••••••', secure: true },
  ];

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.logoBox}>
          <Text style={styles.logoIcon}>🎓</Text>
          <Text style={styles.logoTitle}>Create Account</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.heading}>Get Started</Text>
          <Text style={styles.subheading}>Create your student account</Text>

          {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}

          {fields.map(f => (
            <View key={f.key}>
              <Text style={styles.label}>{f.label}</Text>
              <TextInput
                style={styles.input}
                value={form[f.key]}
                onChangeText={v => update(f.key, v)}
                placeholder={f.placeholder}
                placeholderTextColor="#9ca3af"
                secureTextEntry={!!f.secure}
                autoCapitalize="none"
                keyboardType={f.keyboardType || 'default'}
              />
            </View>
          ))}

          <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Create Account</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.link}>Already have an account? <Text style={styles.linkBold}>Sign In</Text></Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 16 },
  logoBox: { alignItems: 'center', marginBottom: 24 },
  logoIcon: { fontSize: 56 },
  logoTitle: { fontSize: 22, fontWeight: 'bold', color: '#3b82f6', marginTop: 8 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 24, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
  heading: { fontSize: 22, fontWeight: 'bold', color: '#111827', marginBottom: 4 },
  subheading: { fontSize: 14, color: '#6b7280', marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12, fontSize: 15, color: '#111827', marginBottom: 16 },
  button: { backgroundColor: '#3b82f6', borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 4, marginBottom: 16 },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  link: { textAlign: 'center', color: '#6b7280', fontSize: 14 },
  linkBold: { color: '#3b82f6', fontWeight: '600' },
  errorBox: { backgroundColor: '#fee2e2', borderRadius: 8, padding: 10, marginBottom: 12 },
  errorText: { color: '#dc2626', fontSize: 13 },
});
