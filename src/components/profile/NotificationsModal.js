import React from 'react';
import { View, Text, Modal, StyleSheet, FlatList, TouchableOpacity, Pressable, Animated, Dimensions } from 'react-native';
import { FontAwesome5, Feather } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { LinearGradient } from 'expo-linear-gradient';

const { height } = Dimensions.get('window');

// Theme Colors (Matching Profile.js)
const COLORS = {
  background: '#1A2D27',
  card: '#253D34',
  border: 'rgba(90, 156, 132, 0.25)',
  textPrimary: '#F1F3F2',
  textSecondary: '#A3B1AC',
  accentGreen: '#5A9C84',
  danger: '#ef4444', 
};

const NotificationItem = ({ item, onPress }) => {
  const timeAgo = formatDistanceToNow(new Date(item.date), { locale: ar, addSuffix: true });
  
  // Determine Icon based on data content (optional logic)
  let icon = "bell";
  let iconColor = COLORS.accentGreen;

  if (item.title?.includes('إعجاب') || item.title?.includes('Like')) {
      icon = "heart"; 
      iconColor = COLORS.danger;
  } else if (item.title?.includes('تعليق') || item.title?.includes('Comment')) {
      icon = "comment-alt";
      iconColor = "#fbbf24"; // Gold
  }

  return (
    <TouchableOpacity activeOpacity={0.8} onPress={() => onPress(item)} style={[styles.itemContainer, !item.read && styles.unreadItem]}>
      <View style={styles.contentRow}>
         <View style={{flex: 1, gap: 4}}>
             <Text style={styles.itemTitle}>{item.title}</Text>
             <Text style={styles.itemBody} numberOfLines={2}>{item.body}</Text>
             <Text style={styles.itemTime}>{timeAgo}</Text>
         </View>
         
         <View style={[styles.iconBox, { backgroundColor: iconColor + '15', borderColor: iconColor + '30' }]}>
             <FontAwesome5 name={icon} size={16} color={iconColor} solid />
         </View>
      </View>
      {!item.read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );
};

export default function NotificationsModal({ visible, onClose, notifications, onClear, onNotificationClick }) {
  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        
        <View style={styles.sheetContainer}>
            <View style={styles.header}>
                <View style={styles.handle} />
                <View style={styles.headerRow}>
                    <TouchableOpacity onPress={onClear} style={styles.clearBtn}>
                        <Text style={styles.clearText}>مسح الكل</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>الإشعارات</Text>
                </View>
            </View>

            <FlatList 
                data={notifications}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                    <NotificationItem 
                        item={item} 
                        onPress={onNotificationClick} 
                    />
                )}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Feather name="bell-off" size={40} color={COLORS.textSecondary} />
                        <Text style={styles.emptyText}>لا توجد إشعارات حالياً</Text>
                    </View>
                }
            />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: COLORS.background,
    height: height * 0.75,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  header: {
    backgroundColor: COLORS.card,
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 15,
  },
  headerRow: {
    flexDirection: 'row', // Keeping standard row, using text alignment
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: 'Tajawal-ExtraBold',
    fontSize: 18,
    color: COLORS.textPrimary,
  },
  clearBtn: {
    padding: 5,
  },
  clearText: {
    fontFamily: 'Tajawal-Regular',
    fontSize: 12,
    color: COLORS.danger,
  },
  listContent: {
    padding: 20,
    paddingBottom: 50,
  },
  itemContainer: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 16,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  unreadItem: {
    backgroundColor: 'rgba(90, 156, 132, 0.08)',
    borderColor: 'rgba(90, 156, 132, 0.3)',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  itemTitle: {
    fontFamily: 'Tajawal-Bold',
    fontSize: 14,
    color: COLORS.textPrimary,
    textAlign: 'right',
    marginBottom: 4,
  },
  itemBody: {
    fontFamily: 'Tajawal-Regular',
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'right',
    marginBottom: 6,
    lineHeight: 18,
  },
  itemTime: {
    fontFamily: 'Tajawal-Regular',
    fontSize: 10,
    color: COLORS.textSecondary, // Dim color
    textAlign: 'right',
    opacity: 0.6
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  unreadDot: {
    position: 'absolute',
    top: 15,
    right: 15,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.accentGreen,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: 10,
    opacity: 0.5,
  },
  emptyText: {
    fontFamily: 'Tajawal-Regular',
    color: COLORS.textSecondary,
    fontSize: 14,
  },
});