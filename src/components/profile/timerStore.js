import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useTimerStore = create(
  persist(
    (set) => ({
      isActive: false,
      endTime: null, // We store the target end time, which is more reliable than a countdown
      duration: 0,
      notificationId: null,

      // Action to start the timer
      startTimer: (newDuration, newNotificationId) => set({
        isActive: true,
        duration: newDuration,
        // Calculate the exact timestamp when the timer should end
        endTime: Date.now() + newDuration * 1000, 
        notificationId: newNotificationId,
      }),

      // Action to stop and reset the timer
      stopTimer: () => set({
        isActive: false,
        endTime: null,
        duration: 0,
        notificationId: null,
      }),
    }),
    {
      name: 'spf-timer-storage', // name of the item in the storage (must be unique)
      storage: createJSONStorage(() => AsyncStorage), // (optional) by default, 'localStorage' is used
    }
  )
);