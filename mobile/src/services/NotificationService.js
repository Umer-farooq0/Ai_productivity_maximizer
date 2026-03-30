import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const WEEK_IN_MS = 7 * 24 * 60 * 60 * 1000;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermissions() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('study-sessions', {
      name: 'Study Sessions',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#3b82f6',
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  if (existingStatus === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function scheduleSessionNotifications(weekData) {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    // ignore if cancel fails
  }

  const now = new Date();
  const sevenDaysLater = new Date(now.getTime() + WEEK_IN_MS);
  let count = 0;

  for (const day of weekData) {
    for (const slot of (day.time_slots || [])) {
      const slotStart = new Date(slot.start);
      if (isNaN(slotStart.getTime())) {
        console.warn('[NotificationService] Invalid slot date:', slot.start);
        continue;
      }
      if (slotStart <= now) continue;
      if (slotStart > sevenDaysLater) continue;

      const type = (slot.type || '').toLowerCase();
      const slotLabel = slot.label || '';

      let title, body;
      if (type === 'study') {
        title = '📖 Study Session Starting';
        body = slotLabel.replace(/^📖\s*/, '') || 'Time to start studying!';
      } else if (type === 'break') {
        title = '☕ Break Time!';
        body = 'Take a short break and recharge.';
      } else if (type === 'namaz') {
        title = '🕌 Prayer Time';
        body = slotLabel.replace(/^🕌\s*/, '') || 'Time for prayer.';
      } else {
        continue;
      }

      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title,
            body,
            sound: true,
            channelId: 'study-sessions',
          },
          trigger: { date: slotStart },
        });
        count++;
      } catch {
        // skip if scheduling fails for this slot
      }
    }
  }

  return count;
}

export async function cancelAllNotifications() {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    // ignore
  }
}
