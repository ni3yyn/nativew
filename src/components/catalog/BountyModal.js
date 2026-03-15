import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, 
  Pressable, ScrollView, KeyboardAvoidingView, Platform, Dimensions, ActivityIndicator
} from 'react-native';
import { FontAwesome5, Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { getClaimsByProductType } from '../../constants/productData';

const { height, width } = Dimensions.get('window');

/**
 * Adaptive Bounty Modal: Swaps UI based on the field being edited.
 */
export default function BountyModal({ visible, onClose, onSubmit, product, field }) {
  const { colors: C } = useTheme();
  
  // States for different types of inputs
  const [textValue, setTextValue] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync state when field or product changes
  useEffect(() => {
    if (visible) {
      if (field === 'marketingClaims' || field === 'targetTypes') {
        setSelectedTags(product?.[field] || []);
      } else {
        setTextValue(product?.[field]?.toString() || '');
      }
    }
  }, [visible, field, product]);

  // Handler for tag selection (multi-select)
  const toggleTag = (tag) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    let finalValue;
    
    if (field === 'marketingClaims' || field === 'targetTypes') {
      finalValue = selectedTags;
    } else {
      finalValue = textValue.trim();
    }

    // Pass data back to parent
    await onSubmit(product, field, finalValue);
    
    setIsSubmitting(false);
    onClose();
  };

  // 1. Tag List Logic
  const availableTags = useMemo(() => {
    if (field === 'marketingClaims') {
      return getClaimsByProductType(product?.category?.id || 'other');
    }
    if (field === 'targetTypes') {
      return [
        'بشرة دهنية', 'بشرة جافة', 'بشرة حساسة', 'بشرة مختلطة', 'بشرة معرضة للحبوب',
        'شعر جاف', 'شعر دهني', 'شعر متضرر', 'شعر مصبوغ', 'فروة حساسة'
      ];
    }
    return [];
  }, [field, product]);

  // 2. Adaptive UI Switcher
  const renderInputArea = () => {
    switch (field) {
      case 'price':
        return (
          <View style={[styles.inputWrapper, { backgroundColor: C.card, borderColor: C.gold }]}>
            <TextInput
              style={[styles.input, { color: C.textPrimary }]}
              placeholder="0.00"
              placeholderTextColor={C.textDim}
              keyboardType="numeric"
              value={textValue}
              onChangeText={setTextValue}
              textAlign="right"
              autoFocus
            />
            <Text style={[styles.unitText, { color: C.textDim }]}>د.ج</Text>
          </View>
        );

      case 'ingredients':
        return (
          <View style={[styles.areaWrapper, { backgroundColor: C.card, borderColor: C.border }]}>
            <TextInput
              style={[styles.areaInput, { color: C.textPrimary }]}
              placeholder="الصقي قائمة المكونات الكاملة هنا (INCI)..."
              placeholderTextColor={C.textDim}
              multiline
              numberOfLines={6}
              value={textValue}
              onChangeText={setTextValue}
              textAlign="right"
            />
            <View style={styles.areaHint}>
              <Feather name="info" size={12} color={C.accentGreen} />
              <Text style={[styles.areaHintText, { color: C.textDim }]}>يفضل ترتيب المكونات كما هي في العبوة.</Text>
            </View>
          </View>
        );

      case 'marketingClaims':
      case 'targetTypes':
        return (
          <View style={styles.tagGridContainer}>
            <Text style={[styles.subLabel, { color: C.textDim }]}>اختر المناسب من القائمة:</Text>
            <ScrollView contentContainerStyle={styles.tagScroll} showsVerticalScrollIndicator={false}>
              {availableTags.map((tag, i) => (
                <TouchableOpacity 
                  key={i} 
                  onPress={() => toggleTag(tag)}
                  style={[
                    styles.tagChip, 
                    { 
                      backgroundColor: selectedTags.includes(tag) ? C.accentGreen : C.card,
                      borderColor: selectedTags.includes(tag) ? C.accentGreen : C.border 
                    }
                  ]}
                >
                  <Text style={[
                    styles.tagText, 
                    { color: selectedTags.includes(tag) ? C.textOnAccent : C.textSecondary }
                  ]}>
                    {tag}
                  </Text>
                  {selectedTags.includes(tag) && <Ionicons name="checkmark-circle" size={14} color={C.textOnAccent} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        );

      default: // quantity, country, brand, etc.
        return (
          <View style={[styles.inputWrapper, { backgroundColor: C.card, borderColor: C.border }]}>
            <TextInput
              style={[styles.input, { color: C.textPrimary }]}
              placeholder="اكتبي القيمة هنا..."
              placeholderTextColor={C.textDim}
              value={textValue}
              onChangeText={setTextValue}
              textAlign="right"
              autoFocus
            />
          </View>
        );
    }
  };

  const getFieldTitle = () => {
    const titles = {
      price: 'تحديث سعر المنتج',
      quantity: 'تعديل الحجم/الكمية',
      ingredients: 'إضافة المكونات (INCI)',
      marketingClaims: 'تحديد الوعود التسويقية',
      targetTypes: 'تحديد الفئة المستهدفة',
      country: 'تعديل بلد المنشأ'
    };
    return titles[field] || 'تحديث البيانات';
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={{ flex: 1 }}
      >
        <View style={styles.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
          
          <View style={[styles.content, { backgroundColor: C.background, borderColor: C.border }]}>
            <View style={[styles.handle, { backgroundColor: C.textDim + '30' }]} />
            
            <View style={styles.header}>
              <View style={[styles.iconBox, { backgroundColor: C.gold + '15' }]}>
                <FontAwesome5 name="medal" size={20} color={C.gold} />
              </View>
              <Text style={[styles.title, { color: C.textPrimary }]}>{getFieldTitle()}</Text>
              <Text style={[styles.subTitle, { color: C.textDim }]}>
                مساهمتك تساعد آلاف الجزائريات في العثور على المنتج الأفضل.
              </Text>
            </View>

            <View style={styles.body}>
              {renderInputArea()}
            </View>

            <View style={styles.footer}>
              <TouchableOpacity 
                style={[styles.btn, styles.btnCancel, { borderColor: C.border }]} 
                onPress={onClose}
              >
                <Text style={[styles.btnText, { color: C.textSecondary }]}>إلغاء</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.btn, styles.btnSave, { backgroundColor: C.accentGreen }]} 
                onPress={handleSave}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color={C.textOnAccent} size="small" />
                ) : (
                  <>
                    <Text style={[styles.btnText, { color: C.textOnAccent }]}>حفظ وربح +50 ✨</Text>
                    <Feather name="check" size={18} color={C.textOnAccent} />
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.75)', 
    justifyContent: 'flex-end' 
  },
  content: { 
    borderTopLeftRadius: 35, 
    borderTopRightRadius: 35, 
    padding: 25, 
    borderWidth: 1, 
    borderBottomWidth: 0,
    maxHeight: height * 0.85
  },
  handle: { 
    width: 40, 
    height: 5, 
    borderRadius: 10, 
    alignSelf: 'center', 
    marginBottom: 20 
  },
  header: { 
    alignItems: 'center', 
    marginBottom: 25 
  },
  iconBox: { 
    width: 50, 
    height: 50, 
    borderRadius: 25, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: 15 
  },
  title: { 
    fontFamily: 'Tajawal-ExtraBold', 
    fontSize: 20, 
    marginBottom: 8 
  },
  subTitle: { 
    fontFamily: 'Tajawal-Medium', 
    fontSize: 13, 
    textAlign: 'center', 
    lineHeight: 18, 
    paddingHorizontal: 20 
  },

  body: { 
    marginBottom: 30 
  },
  
  // Standard Input Style
  inputWrapper: { 
    flexDirection: 'row-reverse', 
    alignItems: 'center', 
    height: 65, 
    borderRadius: 18, 
    borderWidth: 1, 
    paddingHorizontal: 20 
  },
  input: { 
    flex: 1, 
    fontFamily: 'Tajawal-ExtraBold', 
    fontSize: 22 
  },
  unitText: { 
    fontFamily: 'Tajawal-Bold', 
    fontSize: 16, 
    marginRight: 10 
  },

  // Multi-line Text Style
  areaWrapper: { 
    borderRadius: 18, 
    borderWidth: 1, 
    padding: 15 
  },
  areaInput: { 
    minHeight: 120, 
    fontFamily: 'Tajawal-Medium', 
    fontSize: 14, 
    textAlignVertical: 'top' 
  },
  areaHint: { 
    flexDirection: 'row-reverse', 
    alignItems: 'center', 
    gap: 6, 
    marginTop: 10, 
    opacity: 0.8 
  },
  areaHintText: { 
    fontSize: 11, 
    fontFamily: 'Tajawal-Regular' 
  },

  // Tag Selection Style
  tagGridContainer: { 
    height: 250 
  },
  subLabel: { 
    fontFamily: 'Tajawal-Bold', 
    fontSize: 12, 
    marginBottom: 12, 
    textAlign: 'right' 
  },
  tagScroll: { 
    flexDirection: 'row-reverse', 
    flexWrap: 'wrap', 
    gap: 10, 
    paddingBottom: 20 
  },
  tagChip: { 
    flexDirection: 'row-reverse', 
    alignItems: 'center', 
    gap: 8, 
    paddingHorizontal: 16, 
    paddingVertical: 10, 
    borderRadius: 14, 
    borderWidth: 1 
  },
  tagText: { 
    fontFamily: 'Tajawal-Bold', 
    fontSize: 13 
  },

  // Footer Buttons
  footer: { 
    flexDirection: 'row-reverse', 
    gap: 15 
  },
  btn: { 
    flex: 1, 
    height: 60, 
    borderRadius: 18, 
    flexDirection: 'row-reverse', 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: 10 
  },
  btnCancel: { 
    borderWidth: 1 
  },
  btnSave: { 
    flex: 2, 
    elevation: 3, 
    shadowColor: '#000', 
    shadowOpacity: 0.1, 
    shadowRadius: 5 
  },
  btnText: { 
    fontFamily: 'Tajawal-ExtraBold', 
    fontSize: 15 
  }
});