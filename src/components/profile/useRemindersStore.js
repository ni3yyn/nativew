// src/components/profile/useRemindersStore.js
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { scheduleCustomReminder, cancelCustomReminder } from '../../utils/notificationHelper';

export const useRemindersStore = create(
  persist(
    (set, get) => ({
      reminders: [], // Array of { id, title, type: 'daily' | 'weekly', weekday, hour, minute, isActive, notificationId }

      addReminder: async (reminderData) => {
        const newReminder = {
          ...reminderData,
          id: Date.now().toString(),
          isActive: true,
        };
        
        // Schedule it and save the generated Expo notification ID
        const notifId = await scheduleCustomReminder(newReminder);
        newReminder.notificationId = notifId;
        newReminder.isActive = Boolean(notifId);

        set((state) => ({ reminders: [...state.reminders, newReminder] }));
        return notifId;
      },

      toggleReminder: async (id) => {
        const state = get();
        const reminder = state.reminders.find(r => r.id === id);
        if (!reminder) return false;

        const newIsActive = !reminder.isActive;
        let newNotifId = reminder.notificationId;

        if (newIsActive) {
          // Re-schedule
          newNotifId = await scheduleCustomReminder({ ...reminder, isActive: true });
          if (!newNotifId) {
            // Failed to schedule (e.g. permission denied)
            return false;
          }
        } else {
          // Cancel
          if (reminder.notificationId) {
            await cancelCustomReminder(reminder.notificationId);
            newNotifId = null;
          }
        }

        set((state) => ({
          reminders: state.reminders.map(r => 
            r.id === id ? { ...r, isActive: newIsActive, notificationId: newNotifId } : r
          )
        }));
        return true;
      },

      deleteReminder: async (id) => {
        const state = get();
        const reminder = state.reminders.find(r => r.id === id);
        
        if (reminder && reminder.notificationId) {
          await cancelCustomReminder(reminder.notificationId);
        }

        set((state) => ({
          reminders: state.reminders.filter(r => r.id !== id)
        }));
      },

      syncActiveReminders: async () => {
        const state = get();
        if (!state.reminders || state.reminders.length === 0) return;

        const updated = await Promise.all(
          state.reminders.map(async (r) => {
            if (r.isActive) {
              const notifId = await scheduleCustomReminder(r);
              return { ...r, notificationId: notifId || r.notificationId };
            }
            return r;
          })
        );
        set({ reminders: updated });
      }
    }),
    {
      name: 'wathiq-reminders-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);