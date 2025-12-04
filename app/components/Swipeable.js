import React, { useRef } from 'react';
import { View, Animated, PanResponder, StyleSheet } from 'react-native';

const Swipeable = ({ 
  children, 
  onSwipeLeft, 
  onSwipeRight, 
  leftThreshold = 100, 
  rightThreshold = 100,
  leftActionWidth = 80,
  rightActionWidth = 80,
  leftAction,
  rightAction,
  enabled = true
}) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => enabled,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 10 && enabled;
      },
      onPanResponderMove: (_, gestureState) => {
        if (enabled) {
          translateX.setValue(gestureState.dx);
          
          // Fade in action when swiping
          const progress = Math.min(Math.abs(gestureState.dx) / 50, 1);
          fadeAnim.setValue(progress);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (!enabled) return;

        const { dx } = gestureState;
        
        if (dx < -leftThreshold && onSwipeLeft) {
          // Swipe left complete
          Animated.timing(translateX, {
            toValue: -leftActionWidth,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            onSwipeLeft();
            setTimeout(() => {
              resetPosition();
            }, 300);
          });
        } else if (dx > rightThreshold && onSwipeRight) {
          // Swipe right complete
          Animated.timing(translateX, {
            toValue: rightActionWidth,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            onSwipeRight();
            setTimeout(() => {
              resetPosition();
            }, 300);
          });
        } else {
          // Reset position
          resetPosition();
        }
      },
      onPanResponderTerminate: () => {
        resetPosition();
      },
    })
  ).current;

  const resetPosition = () => {
    Animated.spring(translateX, {
      toValue: 0,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();
    
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const leftActionStyle = {
    opacity: translateX.interpolate({
      inputRange: [-leftActionWidth, 0],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    }),
    transform: [{
      translateX: translateX.interpolate({
        inputRange: [-leftActionWidth, 0],
        outputRange: [0, -leftActionWidth],
        extrapolate: 'clamp',
      }),
    }],
  };

  const rightActionStyle = {
    opacity: translateX.interpolate({
      inputRange: [0, rightActionWidth],
      outputRange: [0, 1],
      extrapolate: 'clamp',
    }),
    transform: [{
      translateX: translateX.interpolate({
        inputRange: [0, rightActionWidth],
        outputRange: [-rightActionWidth, 0],
        extrapolate: 'clamp',
      }),
    }],
  };

  return (
    <View style={styles.container}>
      {/* Left Action Background */}
      {leftAction && (
        <Animated.View style={[styles.actionBackground, styles.leftAction, leftActionStyle]}>
          {leftAction}
        </Animated.View>
      )}

      {/* Right Action Background */}
      {rightAction && (
        <Animated.View style={[styles.actionBackground, styles.rightAction, rightActionStyle]}>
          {rightAction}
        </Animated.View>
      )}

      {/* Main Content */}
      <Animated.View
        style={[
          styles.content,
          {
            transform: [{ translateX }],
          },
        ]}
        {...panResponder.panHandlers}
      >
        {children}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
  },
  actionBackground: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  leftAction: {
    right: 0,
    backgroundColor: '#ff6b6b',
  },
  rightAction: {
    left: 0,
    backgroundColor: '#4cd964',
  },
  content: {
    zIndex: 1,
  },
});

export default Swipeable;