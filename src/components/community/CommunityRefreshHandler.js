import React, { useState, useCallback } from 'react';
import { View, FlatList, RefreshControl, StyleSheet, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { COLORS as DEFAULT_COLORS } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';

const CommunityRefreshHandler = ({
    data,
    renderItem,
    onRefresh,
    loading,
    ListEmptyComponent,
    flatListRef,
    ...props
}) => {
    const { colors } = useTheme();
    const COLORS = colors || DEFAULT_COLORS;
    const [refreshing, setRefreshing] = useState(false);

    const handleRefresh = useCallback(async () => {
        // 1. Immediate Haptic Feedback on release
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        setRefreshing(true);

        try {
            // 2. Perform the actual data fetch
            if (onRefresh) {
                await onRefresh();
            }
            // 3. Success Haptic
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (error) {
            console.error("Refresh failed:", error);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } finally {
            setRefreshing(false);
        }
    }, [onRefresh]);

    return (
        <View style={styles.container}>
            <FlatList
                ref={flatListRef}
                data={data}
                renderItem={renderItem}

                // --- NATIVE REFRESH CONTROL ---
                // "Cost Effective": Runs on UI Thread, native feel, uses less battery.
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        // Android Styling
                        colors={[COLORS.accentGreen, COLORS.primary]}
                        progressBackgroundColor={COLORS.card}
                        // iOS Styling
                        tintColor={COLORS.accentGreen}
                        title="جاري التحديث..."
                        titleColor={COLORS.accentGreen}
                    />
                }

                // Logic to show empty component only when NOT loading initial data
                ListEmptyComponent={!loading ? ListEmptyComponent : null}

                // Performance Props
                removeClippedSubviews={Platform.OS === 'android'}
                initialNumToRender={5}
                maxToRenderPerBatch={10}
                windowSize={10}
                {...props}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});

export default CommunityRefreshHandler;