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

        set((state) => ({ reminders: [...state.reminders, newReminder] }));
      },

      toggleReminder: async (id) => {
        const state = get();
        const reminder = state.reminders.find(r => r.id === id);
        if (!reminder) return;

        const newIsActive = !reminder.isActive;
        let newNotifId = reminder.notificationId;

        if (newIsActive) {
          // Re-schedule
          newNotifId = await scheduleCustomReminder({ ...reminder, isActive: true });
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
      }
    }),
    {
      name: 'wathiq-reminders-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);