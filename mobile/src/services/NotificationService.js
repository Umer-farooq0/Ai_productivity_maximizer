import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const WEEK_IN_MS = 7 * 24 * 60 * 60 * 1000;
const PRAYER_NOTIF_IDS_KEY = '@prayerNotifIds';

// Approximate jamaah (congregation) times for Pakistan (PKT = UTC+5).
// NOTE: Actual prayer times vary significantly by season and location (Fajr can range
// from ~3:30 AM in summer to ~6:30 AM in winter). These are reasonable year-round
// averages for reference — users should adjust based on their local mosque timetable.
const PRAYER_TIMES = [
  { name: 'Fajr',    hour: 5,  minute: 15 },
  { name: 'Dhuhr',   hour: 13, minute: 15 },
  { name: 'Asr',     hour: 16, minute: 30 },
  { name: 'Maghrib', hour: 18, minute: 30 },
  { name: 'Isha',    hour: 20, minute: 0  },
];

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermissions() {
  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync('study-sessions', {
        name: 'Study Sessions',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#3b82f6',
      });
      await Notifications.setNotificationChannelAsync('prayer-times', {
        name: 'Prayer Times',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 500, 200, 500],
        lightColor: '#8b5cf6',
      });
    } catch {
      // setNotificationChannelAsync is not supported in Expo Go; ignore the error
    }
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
        body = 'Take a short break and recharge. You deserve it!';
      } else if (type === 'namaz') {
        title = '🕌 Prayer Time – Namaz has priority!';
        body = slotLabel.replace(/^🕌\s*/, '') || "Stop what you're doing and offer your prayer first.";
      } else {
        continue;
      }

      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title,
            body,
            sound: true,
            channelId: type === 'namaz' ? 'prayer-times' : 'study-sessions',
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

/**
 * Schedule a break reminder that fires after `afterMinutes` of uninterrupted work.
 * Returns the notification identifier so it can be cancelled when the task is stopped.
 */
export async function scheduleBreakReminder(taskName, afterMinutes = 25) {
  const triggerDate = new Date(Date.now() + afterMinutes * 60 * 1000);
  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: '☕ Time for a Break!',
        body: `You've been working on "${taskName}" for ${afterMinutes} minutes. Stretch, breathe, and take a 5-minute break!`,
        sound: true,
        channelId: 'study-sessions',
      },
      trigger: { date: triggerDate },
    });
    return id;
  } catch (e) {
    console.warn('[NotificationService] scheduleBreakReminder failed:', e?.message);
    return null;
  }
}

/**
 * Cancel a previously scheduled break-reminder notification by its ID.
 */
export async function cancelBreakReminder(notificationId) {
  if (!notificationId) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch {
    // ignore
  }
}

/**
 * Schedule Namaz (prayer) reminder notifications for the next 7 days based on
 * approximate Pakistani jamaah times.  Notification IDs are persisted in AsyncStorage
 * so only prayer notifications are cancelled when the user disables the feature.
 * Returns the number of notifications scheduled.
 */
export async function schedulePrayerReminders() {
  const now = new Date();
  const ids = [];

  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    for (const prayer of PRAYER_TIMES) {
      const trigger = new Date(now);
      trigger.setDate(now.getDate() + dayOffset);
      trigger.setHours(prayer.hour, prayer.minute, 0, 0);

      // Skip times that have already passed
      if (trigger <= now) continue;

      try {
        const id = await Notifications.scheduleNotificationAsync({
          content: {
            title: `🕌 ${prayer.name} – Time to Pray!`,
            body: `It's ${prayer.name} time. Namaz has the highest priority — pause your work and offer your prayer.`,
            sound: true,
            channelId: 'prayer-times',
          },
          trigger: { date: trigger },
        });
        ids.push(id);
      } catch {
        // skip on error
      }
    }
  }

  // Persist IDs so we can cancel only prayer notifications later
  try {
    await AsyncStorage.setItem(PRAYER_NOTIF_IDS_KEY, JSON.stringify(ids));
  } catch {
    // ignore storage errors
  }

  return ids.length;
}

/**
 * Cancel only the prayer reminder notifications (leaves study/break reminders intact).
 */
export async function cancelPrayerReminders() {
  try {
    const raw = await AsyncStorage.getItem(PRAYER_NOTIF_IDS_KEY);
    const ids = raw ? JSON.parse(raw) : [];
    await Promise.all(ids.map(id => Notifications.cancelScheduledNotificationAsync(id).catch(() => {})));
    await AsyncStorage.removeItem(PRAYER_NOTIF_IDS_KEY);
  } catch {
    // ignore
  }
}

export async function cancelAllNotifications() {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    // ignore
  }
}
