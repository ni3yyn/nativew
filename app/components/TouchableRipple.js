import React, { useRef } from 'react';
import {
  TouchableOpacity,
  Animated,
  StyleSheet,
  View,
  Platform,
} from 'react-native';

const TouchableRipple = ({
  children,
  onPress,
  onLongPress,
  style,
  rippleColor = 'rgba(178, 216, 180, 0.3)',
  rippleDuration = 400,
  disabled = false,
  activeOpacity = 0.7,
  scaleValue = 0.95,
  ...props
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rippleAnim = useRef(new Animated.Value(0)).current;
  const rippleOpacity = useRef(new Animated.Value(1)).current;
  const rippleSize = useRef(0);

  const handlePressIn = () => {
    if (disabled) return;

    Animated.spring(scaleAnim, {
      toValue: scaleValue,
      useNativeDriver: true,
      friction: 8,
      tension: 40,
    }).start();
  };

  const handlePressOut = () => {
    if (disabled) return;

    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 8,
      tension: 40,
    }).start();

    // Ripple effect
    rippleAnim.setValue(0);
    rippleOpacity.setValue(1);
    
    Animated.timing(rippleAnim, {
      toValue: 1,
      duration: rippleDuration,
      useNativeDriver: true,
    }).start();

    Animated.timing(rippleOpacity, {
      toValue: 0,
      duration: rippleDuration,
      useNativeDriver: true,
    }).start();
  };

  const handlePress = () => {
    if (onPress && !disabled) {
      onPress();
    }
  };

  const handleLongPress = () => {
    if (onLongPress && !disabled) {
      onLongPress();
    }
  };

  const onLayout = (event) => {
    const { width, height } = event.nativeEvent.layout;
    rippleSize.current = Math.sqrt(width * width + height * height) * 2;
  };

  const rippleStyle = {
    position: 'absolute',
    width: rippleSize.current,
    height: rippleSize.current,
    borderRadius: rippleSize.current / 2,
    backgroundColor: rippleColor,
    transform: [
      {
        scale: rippleAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.1, 1],
        }),
      },
    ],
    opacity: rippleOpacity,
  };

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onLongPress={handleLongPress}
      disabled={disabled}
      style={[styles.container, style]}
      {...props}
    >
      <Animated.View
        style={[
          styles.content,
          {
            transform: [{ scale: scaleAnim }],
          },
        ]}
        onLayout={onLayout}
      >
        {/* Ripple Effect */}
        <Animated.View style={[styles.ripple, rippleStyle]} />

        {/* Content */}
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  content: {
    position: 'relative',
  },
  ripple: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -1, // Center the ripple
    marginTop: -1,
  },
});

// For iOS specific ripple
const TouchableRippleIOS = TouchableRipple;

// For Android - using TouchableNativeFeedback
let TouchableRippleAndroid = TouchableRipple;

if (Platform.OS === 'android' && Platform.Version >= 21) {
  const { TouchableNativeFeedback } = require('react-native');
  
  TouchableRippleAndroid = ({
    children,
    style,
    rippleColor = 'rgba(178, 216, 180, 0.3)',
    borderless = false,
    ...props
  }) => {
    return (
      <TouchableNativeFeedback
        background={TouchableNativeFeedback.Ripple(rippleColor, borderless)}
        useForeground={TouchableNativeFeedback.canUseNativeForeground()}
        {...props}
      >
        <View style={style}>{children}</View>
      </TouchableNativeFeedback>
    );
  };
}

export default Platform.select({
  ios: TouchableRippleIOS,
  android: TouchableRippleAndroid,
  default: TouchableRipple,
});