import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Switch, Modal, TextInput, Dimensions, KeyboardAvoidingView, Platform,
  Animated, Pressable, Easing, Alert, AppState
} from 'react-native';
import { MaterialIcons, Feather, FontAwesome5 } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Linking from 'expo-linking';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../../../context/ThemeContext';
import { useRemindersStore } from '../useRemindersStore';
import Notifications from '../../../utils/safeNotifications';
import { setupNotificationChannelsAsync } from '../../../utils/notificationHelper';
import { t } from '../../../i18n';
import { useCurrentLanguage } from '../../../hooks/useCurrentLanguage';
import AppTextInput from '../../common/AppTextInput';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

export const RemindersScreen = () => {
  const { colors: C } = useTheme();
  const styles = useMemo(() => createStyles(C),[C]);
  const language = useCurrentLanguage();
  const insets = useSafeAreaInsets();
  const floatingBottom = Math.max(insets.bottom, 16) + 14;
  
  const { reminders, addReminder, toggleReminder, deleteReminder, syncActiveReminders } = useRemindersStore();

  const [hasPermission, setHasPermission] = useState(true);
  const [isModalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [type, setType] = useState('daily');
  const [selectedDay, setSelectedDay] = useState(6); 
  
  const [time, setTime] = useState(new Date(new Date().setHours(20, 0, 0, 0)));
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Animation Controllers
  const animController = useRef(new Animated.Value(0)).current;

  // Check permission and sync active reminders on mount & app foreground
  const checkPermissionAndSync = async () => {
    try {
      await setupNotificationChannelsAsync();
      const { status } = await Notifications.getPermissionsAsync();
      const granted = status === 'granted';
      setHasPermission(granted);
      if (granted && syncActiveReminders) {
        await syncActiveReminders();
      }
      return granted;
    } catch (e) {
      console.warn('Error checking permissions in RemindersScreen:', e);
      return false;
    }
  };

  useEffect(() => {
    checkPermissionAndSync();

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        checkPermissionAndSync();
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const handleRequestPermission = async () => {
    try {
      const { status: existing } = await Notifications.getPermissionsAsync();
      if (existing !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status === 'granted') {
          setHasPermission(true);
          if (syncActiveReminders) await syncActiveReminders();
          return;
        }
      }
      Linking.openSettings();
    } catch (_) {
      Linking.openSettings();
    }
  };

  useEffect(() => {
    if (isModalVisible) {
            Animated.spring(animController, {
                toValue: 1,
                friction: 9,
                tension: 50,
                useNativeDriver: true
        }).start();
    }
  }, [isModalVisible]);

  const handleCloseModal = () => {
    Animated.timing(animController, { 
        toValue: 0, 
        duration: 250, 
        easing: Easing.in(Easing.ease),
        useNativeDriver: true 
    }).start(() => setModalVisible(false));
  };

  const formatTime = (hour, minute) => {
    const ampm = hour >= 12 ? t('reminders_time_pm', language) : t('reminders_time_am', language);
    const h = hour % 12 || 12;
    const m = minute.toString().padStart(2, '0');
    return `${h}:${m} ${ampm}`;
  };

  const getDayLabel = (id) => {
    const days = [
      t('reminders_day_sun', language),
      t('reminders_day_mon', language),
      t('reminders_day_tue', language),
      t('reminders_day_wed', language),
      t('reminders_day_thu', language),
      t('reminders_day_fri', language),
      t('reminders_day_sat', language),
    ];
    return days[id - 1] || '';
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return; 
    }

    const notifId = await addReminder({
      title: title.trim(),
      body: t('reminders_body', language),
      type,
      weekday: type === 'weekly' ? selectedDay : undefined,
      hour: time.getHours(),
      minute: time.getMinutes(),
    });

    if (notifId) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      const granted = await checkPermissionAndSync();
      if (!granted) {
        Alert.alert(
          language === 'ar' ? 'تنبيه: الإشعارات معطلة' : 'Notifications Disabled',
          language === 'ar'
            ? 'تم حفظ التذكير، لكن لن يصلك إشعار في الموعد المحدد لأن إشعارات التطبيق معطلة في هاتفك. يرجى تفعيلها من الإعدادات.'
            : 'Reminder saved, but notifications are disabled on your device. Please enable them in Settings to receive alerts.',
          [
            { text: t('alert_cancel', language), style: 'cancel' },
            { text: language === 'ar' ? 'الإعدادات' : 'Settings', onPress: () => Linking.openSettings() }
          ]
        );
      }
    }

    setTitle('');
    setType('daily');
    handleCloseModal();
  };

  const handleToggleReminder = async (reminder) => {
    Haptics.selectionAsync();
    const success = await toggleReminder(reminder.id);
    if (!success && !reminder.isActive) {
      const granted = await checkPermissionAndSync();
      if (!granted) {
        Alert.alert(
          language === 'ar' ? 'تفعيل الإشعارات مطلوب' : 'Permission Required',
          language === 'ar'
            ? 'يرجى السماح بالإشعارات في هاتفك لتشغيل هذا التذكير.'
            : 'Please enable notifications on your phone to activate this reminder.',
          [
            { text: t('alert_cancel', language), style: 'cancel' },
            { text: language === 'ar' ? 'الإعدادات' : 'Settings', onPress: () => Linking.openSettings() }
          ]
        );
      }
    }
  };

  const handleDelete = (id) => {
      Alert.alert(
          t('reminders_delete_title', language),
          t('reminders_delete_message', language),[
              { text: t('alert_cancel', language), style: "cancel" },
              { 
                  text: t('alert_delete', language), 
                  style: "destructive", 
                  onPress: () => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      deleteReminder(id);
                  } 
              }
          ]
      );
  };

  const handleTimeChange = (event, selectedDate) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (selectedDate) setTime(selectedDate);
  };

  const translateY = animController.interpolate({ inputRange:[0, 1], outputRange: [height, 0] });
  const backdropOpacity = animController.interpolate({ inputRange:[0, 1], outputRange: [0, 0.6] });

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.listContainer} showsVerticalScrollIndicator={false}>
        {!hasPermission && (
          <TouchableOpacity
            style={styles.permissionWarningBanner}
            activeOpacity={0.8}
            onPress={handleRequestPermission}
          >
            <View style={styles.permissionIconCircle}>
              <Feather name="bell-off" size={20} color="#FF9800" />
            </View>
            <View style={styles.permissionWarningTextWrap}>
              <Text style={styles.permissionWarningTitle}>
                {language === 'ar' ? 'الإشعارات معطلة في جهازك' : 'Notifications are Disabled'}
              </Text>
              <Text style={styles.permissionWarningText}>
                {language === 'ar'
                  ? 'اضغط هنا لتفعيل إشعارات التطبيق لكي تنبهك التذكيرات'
                  : 'Tap here to enable notifications so reminders can alert you'}
              </Text>
            </View>
            <Feather name={language === 'ar' ? 'chevron-left' : 'chevron-right'} size={18} color={C.textSecondary} />
          </TouchableOpacity>
        )}

        {reminders.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconBox}>
                <Feather name="bell-off" size={36} color={C.primary} />
            </View>
            <Text style={styles.emptyText}>{t('reminders_empty_title', language)}</Text>
            <Text style={styles.emptySubText}>{t('reminders_empty_subtitle', language)}</Text>
          </View>
        ) : (
          reminders.map((reminder) => (
            <View key={reminder.id} style={[styles.card, !reminder.isActive && styles.cardInactive]}>
              <View style={styles.cardHeader}>
                <View style={styles.timeWrap}>
                    <Text style={[styles.timeText, !reminder.isActive && { color: C.textSecondary }]}>
                        {formatTime(reminder.hour, reminder.minute)}
                    </Text>
                    <View style={[styles.badge, !reminder.isActive && { backgroundColor: C.textDim + '20' }]}>
                        <Text style={[styles.badgeText, !reminder.isActive && { color: C.textDim }]}>
                            {reminder.type === 'daily' 
                              ? t('reminders_type_daily', language) 
                              : `${t('reminders_type_weekly', language)} (${getDayLabel(reminder.weekday)})`}
                        </Text>
                    </View>
                </View>
                <Switch
                  trackColor={{ false: C.textDim + '40', true: C.primary + '80' }}
                  thumbColor={reminder.isActive ? C.primary : C.card}
                  onValueChange={() => handleToggleReminder(reminder)}
                  value={reminder.isActive}
                />
              </View>

              <View style={styles.cardFooter}>
                <View style={styles.reminderTitleWrap}>
                    <View style={[styles.dotIndicator, { backgroundColor: reminder.isActive ? C.primary : C.textDim + '50' }]} />
                    <Text style={[styles.reminderTitle, !reminder.isActive && { color: C.textSecondary }]} numberOfLines={1}>
                        {reminder.title}
                    </Text>
                </View>
                <TouchableOpacity 
                    style={styles.deleteBtn}
                    onPress={() => handleDelete(reminder.id)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Feather name="trash-2" size={18} color={C.danger || '#FF5252'} />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* FLOATING ACTION CAPSULE */}
      <View style={[styles.floatingControlsContainer, { bottom: floatingBottom }]}>
          <TouchableOpacity 
              activeOpacity={0.9} 
              style={styles.floatingCapsule}
              onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setTitle(''); 
                  setModalVisible(true);
              }}
          >
              <Feather name="plus" size={20} color={C.primary} />
              <Text style={styles.fabText}>{t('reminders_add_btn', language)}</Text>
          </TouchableOpacity>
      </View>

      {/* PREMIUM FLUID MODAL */}
      <Modal visible={isModalVisible} animationType="none" transparent={true} onRequestClose={handleCloseModal}>
        
        {/* Layer 1: Backdrop */}
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
            <Pressable style={StyleSheet.absoluteFill} onPress={handleCloseModal} />
        </Animated.View>

        {/* Layer 2: Sheet */}
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay} pointerEvents="box-none">
            <Animated.View style={[styles.sheetContainer, { transform: [{ translateY }] }]}>
                <View style={styles.sheetHandleBar}><View style={styles.sheetHandle} /></View>
                
                <View style={styles.modalContent}>
                    <View style={styles.modalHeaderRow}>
                        <View style={styles.modalIconBox}>
                            <FontAwesome5 name="bell" size={20} color={C.primary} />
                        </View>
                        <View>
                            <Text style={styles.modalTitle}>{t('reminders_new_title', language)}</Text>
                            <Text style={styles.modalSubtitle}>{t('reminders_new_subtitle', language)}</Text>
                        </View>
                    </View>

                    {/* Input */}
                    <View style={styles.inputWrapper}>
                        <AppTextInput
                            style={[styles.input, { fontFamily: title.length > 0 ? 'Tajawal-Bold' : 'Tajawal-Regular' }]}
                            placeholder={t('reminders_placeholder', language)}
                            placeholderTextColor={C.textDim}
                            value={title}
                            onChangeText={setTitle}
                            textAlign="right"
                        />
                        <View style={styles.inputIcon}>
                            <Feather name="edit-3" size={18} color={C.primary} />
                        </View>
                    </View>

                    {/* Type Selection */}
                    <View style={styles.segmentContainer}>
                        <TouchableOpacity 
                            style={[styles.segmentBtn, type === 'weekly' && styles.segmentActive]}
                            onPress={() => { Haptics.selectionAsync(); setType('weekly'); }}
                        >
                            <Text style={[styles.segmentText, type === 'weekly' && styles.segmentTextActive]}>{t('reminders_type_weekly', language)}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[styles.segmentBtn, type === 'daily' && styles.segmentActive]}
                            onPress={() => { Haptics.selectionAsync(); setType('daily'); }}
                        >
                            <Text style={[styles.segmentText, type === 'daily' && styles.segmentTextActive]}>{t('reminders_type_daily', language)}</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Weekdays */}
                    {type === 'weekly' && (
                        <View style={styles.weekdaysContainer}>
                            {[1,2,3,4,5,6,7].map((dayId) => (
                                <TouchableOpacity
                                    key={dayId}
                                    style={[styles.dayCircle, selectedDay === dayId && styles.dayCircleActive]}
                                    onPress={() => { Haptics.selectionAsync(); setSelectedDay(dayId); }}
                                >
                                    <Text style={[styles.dayText, selectedDay === dayId && styles.dayTextActive]}>{getDayLabel(dayId)}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}

                    {/* Time Picker */}
                    <Text style={styles.inputLabel}>{t('reminders_label_time', language)}</Text>
                    {Platform.OS === 'android' ? (
                        <TouchableOpacity style={styles.timeSelectorBtn} onPress={() => setShowTimePicker(true)}>
                            <Feather name="clock" size={20} color={C.primary} />
                            <Text style={styles.timeSelectorText}>{formatTime(time.getHours(), time.getMinutes())}</Text>
                        </TouchableOpacity>
                    ) : (
                        <View style={styles.iosTimePickerWrap}>
                             <DateTimePicker value={time} mode="time" display="spinner" onChange={handleTimeChange} textColor={C.textPrimary} />
                        </View>
                    )}

                    {showTimePicker && Platform.OS === 'android' && (
                        <DateTimePicker value={time} mode="time" is24Hour={false} display="default" onChange={handleTimeChange} />
                    )}

                    {/* Action Buttons */}
                    <View style={styles.promptButtonRow}>
                        <TouchableOpacity style={[styles.promptButton, styles.promptButtonSecondary]} onPress={handleCloseModal}>
                            <Text style={styles.promptButtonTextSecondary}>{t('alert_cancel', language)}</Text>
                        </TouchableOpacity>
                        
                        {/* Properly filled disabled button state */}
                        <TouchableOpacity 
                            style={[
                                styles.promptButton, 
                                title.trim() ? styles.promptButtonPrimary : styles.promptButtonDisabled
                            ]} 
                            onPress={handleSave}
                            disabled={!title.trim()}
                        >
                            <Text style={title.trim() ? styles.promptButtonTextPrimary : styles.promptButtonTextDisabled}>
                                {t('reminders_save_btn', language)}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Animated.View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

// ==========================================
// STYLES
// ==========================================
const createStyles = (C) => StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  listContainer: { paddingVertical: 10, gap: 12 },
  
  // Empty State (Replaced transparent borders with solid soft backgrounds)
  emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 60, opacity: 0.8 },
  emptyIconBox: { width: 80, height: 80, borderRadius: 40, backgroundColor: C.textDim + '15', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  emptyText: { fontFamily: 'Tajawal-Bold', fontSize: 18, color: C.textPrimary },
  emptySubText: { fontFamily: 'Tajawal-Regular', fontSize: 14, color: C.textSecondary, marginTop: 8, textAlign: 'center', paddingHorizontal: 40, lineHeight: 22 },

  // Cards
  card: { backgroundColor: C.card, borderRadius: 20, padding: 18, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.05)', shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 3 },
  cardInactive: { opacity: 0.5 },
  cardHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  timeWrap: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
  timeText: { fontFamily: 'Tajawal-Black', fontSize: 28, color: C.textPrimary, letterSpacing: 1 },
  badge: { backgroundColor: C.textPrimary + '1A', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  badgeText: { fontFamily: 'Tajawal-Bold', fontSize: 11, color: C.textPrimary },
  
  cardFooter: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.05)', paddingTop: 15 },
  reminderTitleWrap: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, flex: 1 },
  dotIndicator: { width: 8, height: 8, borderRadius: 4 },
  reminderTitle: { fontFamily: 'Tajawal-Bold', fontSize: 15, color: C.textPrimary, textAlign: 'right', flex: 1 },
  deleteBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(239, 68, 68, 0.1)', alignItems: 'center', justifyContent: 'center' },

  // Floating Action Capsule
  floatingControlsContainer: { position: 'absolute', bottom: 30, left: 0, right: 0, alignItems: 'center', zIndex: 50 },
  floatingCapsule: { flexDirection: 'row-reverse', backgroundColor: C.card, borderRadius: 100, paddingHorizontal: 24, paddingVertical: 14, borderWidth: 0.5, borderColor: C.primary + '40', shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 10, alignItems: 'center', justifyContent: 'center', gap: 10 },
  fabText: { fontFamily: 'Tajawal-Bold', fontSize: 15, color: C.textPrimary },

  // Fluid Modal Layering
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000', zIndex: 1 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', zIndex: 100 },
  sheetContainer: { width: '100%', marginBottom: -80, backgroundColor: C.card, borderTopLeftRadius: 32, borderTopRightRadius: 32, shadowColor: "#000", shadowOffset: { width: 0, height: -5 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 20 },
  sheetHandleBar: { alignItems: 'center', paddingVertical: 15, width: '100%', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.02)' },
  sheetHandle: { width: 48, height: 5, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10 },
  modalContent: { padding: 25, paddingBottom: 120 },

  // Modal Inside Content
  modalHeaderRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 15, marginBottom: 25 },
  modalIconBox: { width: 50, height: 50, borderRadius: 16, backgroundColor: C.primary + '20', alignItems: 'center', justifyContent: 'center' },
  modalTitle: { fontFamily: 'Tajawal-ExtraBold', fontSize: 18, color: C.textPrimary, textAlign: 'right' },
  modalSubtitle: { fontFamily: 'Tajawal-Regular', fontSize: 13, color: C.textSecondary, textAlign: 'right', marginTop: 4 },
  
  // Filled Unfocused State (No dark borders)
  // Input Container
inputWrapper: { 
  flexDirection: 'row-reverse',        // RTL aware
  alignItems: 'center', 
  marginBottom: 20, 
  position: 'relative',
},

// Input Field
input: { 
  flex: 1, 
  backgroundColor: C.textDim + '12',
  borderRadius: 16, 
  paddingVertical: 16, 
  paddingHorizontal: 16,
  paddingRight: 48,                    // room for icon (RTL: right is start)
  color: C.textPrimary, 
  fontSize: 15, 
  textAlign: 'right',
  borderWidth: 1,
  borderColor: C.textDim + '25',       // subtle visible border
  minHeight: 54,                       // consistent tap target
  writingDirection: 'rtl',
},

// Icon inside input
inputIcon: { 
  position: 'absolute', 
  right: 16,                           // match paddingRight
  zIndex: 1,
  width: 24,
  height: 24,
  alignItems: 'center',
  justifyContent: 'center',
},
  
  // Filled Segments
  segmentContainer: { flexDirection: 'row-reverse', backgroundColor: C.textDim + '15', borderRadius: 14, padding: 4, marginBottom: 15 },
  segmentBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 10 },
  segmentActive: { backgroundColor: C.card, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  segmentText: { fontFamily: 'Tajawal-Bold', fontSize: 14, color: C.textSecondary },
  segmentTextActive: { color: C.textPrimary },

  // Soft Filled Unselected Days
  weekdaysContainer: { flexDirection: 'row-reverse', justifyContent: 'space-between', marginBottom: 20 },
  dayCircle: { width: 40, height: 40, borderRadius: 12, backgroundColor: C.textDim + '15', alignItems: 'center', justifyContent: 'center' },
  dayCircleActive: { backgroundColor: C.primary },
  dayText: { fontFamily: 'Tajawal-Bold', fontSize: 12, color: C.textSecondary },
  dayTextActive: { color: C.background },

  inputLabel: { fontFamily: 'Tajawal-Bold', fontSize: 14, color: C.textSecondary, textAlign: 'right', marginBottom: 10, marginRight: 5 },
  
  // Filled Time Picker Background
  timeSelectorBtn: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', backgroundColor: C.textDim + '15', padding: 16, borderRadius: 16, gap: 10 },
  timeSelectorText: { fontFamily: 'Tajawal-Bold', fontSize: 18, color: C.textPrimary },
  iosTimePickerWrap: { alignItems: 'center', backgroundColor: C.textDim + '15', borderRadius: 16, overflow: 'hidden' },

  // Buttons 
  promptButtonRow: { flexDirection: 'row-reverse', gap: 12, marginTop: 30 },
  promptButton: { flex: 1, paddingVertical: 15, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  
  promptButtonPrimary: { backgroundColor: C.primary },
  promptButtonTextPrimary: { fontFamily: 'Tajawal-Bold', fontSize: 15, color: C.textOnAccent || C.background },
  
  // Soft Solid Cancel Button
  promptButtonSecondary: { backgroundColor: C.textDim + '15' },
  promptButtonTextSecondary: { fontFamily: 'Tajawal-Bold', fontSize: 15, color: C.textPrimary },
  
  // Soft Solid Disabled State
  promptButtonDisabled: { backgroundColor: C.textDim + '15' },
  promptButtonTextDisabled: { fontFamily: 'Tajawal-Bold', fontSize: 15, color: C.textDim },

  // Permission warning banner
  permissionWarningBanner: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#FF980018',
    borderColor: '#FF980040',
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    gap: 12,
  },
  permissionIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FF980025',
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionWarningTextWrap: {
    flex: 1,
    alignItems: 'flex-end',
  },
  permissionWarningTitle: {
    fontFamily: 'Tajawal-Bold',
    fontSize: 14,
    color: '#FF9800',
    marginBottom: 2,
    textAlign: 'right',
  },
  permissionWarningText: {
    fontFamily: 'Tajawal-Medium',
    fontSize: 12,
    color: C.textSecondary,
    textAlign: 'right',
    lineHeight: 16,
  },
});