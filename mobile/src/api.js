import axios from 'axios';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// When running in Expo Go on a physical device the dev-server host is the
// machine's LAN IP (e.g. 192.168.1.100).  We reuse that IP for the backend
// so you don't have to hard-code anything — just make sure your phone and PC
// are on the same Wi-Fi network and the backend is running on port 8000.
function getApiHost() {
  const expoHost = Constants.expoConfig?.hostUri?.split(':')[0];

  // If Expo resolved a real LAN IP (not localhost/loopback), use it.
  // This covers physical Android and iOS devices automatically.
  if (expoHost && expoHost !== 'localhost' && expoHost !== '127.0.0.1') {
    return expoHost;
  }

  // Emulators / simulators: Android emulator routes 10.0.2.2 → host machine.
  return Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
}

const BASE_URL = `http://${getApiHost()}:8000/api/v1`;

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000, // 10 s – avoids the 2-3 minute hang when the backend is unreachable
});

api.interceptors.request.use(async (config) => {
  try {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (_) {}
  return config;
});

export default api;

/** Returns true when an axios error is a network timeout or connection error. */
export function isNetworkError(e) {
  return e.code === 'ECONNABORTED' || !!e.message?.includes('timeout') || !e.response;
}
