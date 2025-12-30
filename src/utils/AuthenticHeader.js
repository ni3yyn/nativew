import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, Animated } from 'react-native';
import { FontAwesome5, Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

// --- THEME COLORS (Matches your Profile.js) ---
const COLORS = {
  accentGreen: '#5A9C84', 
  textSecondary: '#A3B1AC',
  textDim: '#6B7C76',
  gold: '#fbbf24',
  blue: '#60a5fa'
};

// --- LOGIC: CONTEXT AWARE MESSAGES & ICONS ---
const getAuthenticContent = (productCount, name) => {
  const hour = new Date().getHours();
  const firstName = name?.split(' ')[0] || 'جميلتي';

  // 1. Context: Empty Shelf (The "Bismillah" Phase)
  if (productCount === 0) {
    return [
      { text: "الرف فارغ؟.. لنبدأ بأول منتج لديك", icon: "door-open", iconColor: COLORS.accentGreen },
      { text: "كل بشرة جميلة تبدأ بمنتج واحد تضيفينه لوثيق", icon: "pen-nib", iconColor: COLORS.textSecondary },
      { text: "لا تحتاري، افحصي أول منتج ونحن معك", icon: "hand-holding-heart", iconColor: COLORS.gold }
    ];
  }
  
  // 2. Context: Crowded Shelf (The "Baraka but Logic" Phase)
  if (productCount > 10) {
    return [
      { text: "خيرات! لكن كثرة الأيادي تفسد الطبخة", icon: "exclamation-circle", iconColor: COLORS.textSecondary },
      { text: "خزانة مليئة.. هل بشرتك فعلاً تحتاج كل هذا؟", icon: "question", iconColor: COLORS.accentGreen },
      { text: "الزين في البساطة، لا في التكدس", icon: "gem", iconColor: COLORS.gold }
    ];
  }

  // 3. Context: Morning (The "Chatara" & Sun Anxiety)
  if (hour >= 5 && hour < 12) { 
    return [
      { text: `صباح النشاط يا ${firstName}.. شمس دزاير لا ترحم!`, icon: "sun", iconColor: COLORS.gold },
      { text: "نوضي وتوكلي على ربي.. واقي الشمس وينو؟", icon: "search", iconColor: COLORS.textDim },
      { text: "وجهك يستحق أن يشرق قبل الشمس", icon: "smile-beam", iconColor: COLORS.blue }
    ];
  }
  
  // 4. Context: Evening (The "Nqa" & Rest)
  if (hour >= 18 || hour < 5) { 
    return [
      { text: "بالاكي يغلبك النعاس قبل الغسول!", icon: "exclamation-triangle", iconColor: COLORS.danger }, // The "motherly warning" tone
      { text: "نامي بقلب ووجه صافيين", icon: "sparkles", iconColor: COLORS.blue },
      { text: "تصبحين على خير.. شربتِ الماء أم نسيتي؟", icon: "tint", iconColor: COLORS.accentGreen }
    ];
  }

  // 5. Context: General Philosophy (The "Thallay" Spirit)
  return [
    { text: "اعتني بروحك.. فأنتِ تستحقين الدلال", icon: "hand-holding-heart", iconColor: COLORS.accentGreen },
    { text: "لا تستعجلي.. الصبر مفتاح النضارة", icon: "hourglass-half", iconColor: COLORS.textDim },
    { text: "وجهك مرآة صحتك.. أكرميه يكرمك", icon: "mirror", iconColor: COLORS.gold }
  ];
};


const AuthenticHeader = ({ productCount, userName }) => {
  const [displayData, setDisplayData] = useState({ text: "", icon: "circle", color: COLORS.textDim });
  const [typedText, setTypedText] = useState("");
  const [cursorVisible, setCursorVisible] = useState(true);
  const [messageIndex, setMessageIndex] = useState(0);
  
  // Animation Refs
  const typingTimeout = useRef(null);
  const cursorInterval = useRef(null);
  const iconOpacity = useRef(new Animated.Value(1)).current;

  // Get data based on props
  const messages = useMemo(() => 
    getAuthenticContent(productCount, userName), 
  [productCount, userName]);

  // Typing Effect
  const startTyping = (messageData) => {
    let i = 0;
    setTypedText(""); 
    setDisplayData(messageData); // Set Icon immediately
    
    // Fade Icon In
    iconOpacity.setValue(0);
    Animated.timing(iconOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();

    if (typingTimeout.current) clearInterval(typingTimeout.current);

    typingTimeout.current = setInterval(() => {
      setTypedText(messageData.text.substring(0, i + 1));
      i++;
      if (i === messageData.text.length) clearInterval(typingTimeout.current);
    }, 100); // Speed
  };

  // Initial Load
  useEffect(() => {
    startTyping(messages[0]);
    
    cursorInterval.current = setInterval(() => {
      setCursorVisible(v => !v);
    }, 500);

    return () => {
      if (typingTimeout.current) clearInterval(typingTimeout.current);
      if (cursorInterval.current) clearInterval(cursorInterval.current);
    };
  }, [messages]);

  // Handle User Tap
  const handleNextMessage = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Fade Out Icon briefly
    Animated.timing(iconOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
        const nextIndex = (messageIndex + 1) % messages.length;
        setMessageIndex(nextIndex);
        startTyping(messages[nextIndex]);
    });
  };

  return (
    <Pressable onPress={handleNextMessage} style={styles.container}>
      
      <View style={styles.textContainer}>
        <Text style={styles.authenticText} numberOfLines={2}>
          {typedText}
          <Text style={[styles.cursor, { opacity: cursorVisible ? 1 : 0 }]}>|</Text>
        </Text>
      </View>

      <Animated.View style={[styles.iconContainer, { opacity: iconOpacity }]}>
         <FontAwesome5 
            name={displayData.icon} 
            size={14} 
            color={displayData.iconColor} 
         />
      </Animated.View>

    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row', // RTL
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
    minHeight: 28, // Prevents layout jump
    alignSelf: 'flex-end' // Aligns to the right in RTL context
  },
  textContainer: {
    flexShrink: 1, // Ensures text wraps if too long
  },
  authenticText: {
    fontFamily: 'Tajawal-Regular', 
    fontSize: 13,
    color: COLORS.textSecondary, 
    textAlign: 'right',
    lineHeight: 20,
    letterSpacing: 0.2
  },
  cursor: {
    color: COLORS.accentGreen,
    fontWeight: 'bold'
  },
  iconContainer: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    // Optional: Subtle background for the icon
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)'
  }
});

export default AuthenticHeader;