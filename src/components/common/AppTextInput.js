import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';

/**
 * AppTextInput — Drop-in replacement for TextInput.
 *
 * WHY: On Android, the native EditText ignores React Native's `fontFamily` style
 * for placeholder text, always falling back to the system font. The fix is to hide
 * the native placeholder (set it to "") and render a styled <Text> overlay instead
 * when the field is empty and unfocused. This guarantees Tajawal-Regular renders.
 *
 * Usage is identical to <TextInput> — just swap the import and component name.
 */
const AppTextInput = React.forwardRef(({
    placeholder,
    placeholderTextColor,
    value,
    style,
    containerStyle,
    onFocus,
    onBlur,
    onChangeText,
    placeholderFontFamily = 'Tajawal-Regular',
    placeholderFontSize,
    placeholderStyle,
    ...rest
}, ref) => {
    const [focused, setFocused] = useState(false);
    const [internalValue, setInternalValue] = useState(value || '');

    useEffect(() => {
        if (value !== undefined) {
            setInternalValue(value);
        }
    }, [value]);

    const handleFocus = (e) => {
        setFocused(true);
        if (onFocus) onFocus(e);
    };

    const handleBlur = (e) => {
        setFocused(false);
        if (onBlur) onBlur(e);
    };

    const handleChangeText = (text) => {
        setInternalValue(text);
        if (onChangeText) onChangeText(text);
    };

    // Flatten the style array to extract padding, fontSize, textAlign, etc.
    const flatStyle = StyleSheet.flatten(style) || {};

    // Extract layout styles for outer wrapper View
    const wrapperLayoutContainer = {
        position: 'relative',
        flex: flatStyle.flex,
        flexGrow: flatStyle.flexGrow,
        flexShrink: flatStyle.flexShrink,
        flexBasis: flatStyle.flexBasis,
        width: flatStyle.width,
        height: flatStyle.height,
        minWidth: flatStyle.minWidth,
        minHeight: flatStyle.minHeight,
        maxWidth: flatStyle.maxWidth,
        maxHeight: flatStyle.maxHeight,
        margin: flatStyle.margin,
        marginTop: flatStyle.marginTop,
        marginBottom: flatStyle.marginBottom,
        marginLeft: flatStyle.marginLeft,
        marginRight: flatStyle.marginRight,
        marginHorizontal: flatStyle.marginHorizontal,
        marginVertical: flatStyle.marginVertical,
        alignSelf: flatStyle.alignSelf,
    };

    // Extract padding for exact overlay placement
    const paddingTop = flatStyle.paddingTop ?? flatStyle.paddingVertical ?? flatStyle.padding ?? 0;
    const paddingBottom = flatStyle.paddingBottom ?? flatStyle.paddingVertical ?? flatStyle.padding ?? 0;
    const paddingLeft = flatStyle.paddingLeft ?? flatStyle.paddingHorizontal ?? flatStyle.padding ?? 0;
    const paddingRight = flatStyle.paddingRight ?? flatStyle.paddingHorizontal ?? flatStyle.padding ?? 0;

    const overlayFontSize = placeholderFontSize || flatStyle.fontSize || 14;

    // Determine alignment and direction
    const isArabic = /[\u0600-\u06FF]/.test(placeholder || '');
    const overlayTextAlign = flatStyle.textAlign || (isArabic ? 'right' : 'right');
    const overlayWritingDirection = (overlayTextAlign === 'right' || isArabic) ? 'rtl' : 'ltr';

    // Vertical alignment
    const overlayTextAlignVertical = flatStyle.textAlignVertical || (rest.multiline ? 'top' : 'center');

    const currentValue = value !== undefined ? value : internalValue;
    const showFakePlaceholder = !currentValue && !focused && !!placeholder;

    return (
        <View style={[wrapperLayoutContainer, containerStyle]}>
            <TextInput
                ref={ref}
                placeholder=""
                value={value}
                style={[
                    style,
                    {
                        fontFamily: flatStyle.fontFamily || 'Tajawal-Regular',
                        fontWeight: 'normal',
                        textAlign: flatStyle.textAlign || 'right',
                    }
                ]}
                placeholderTextColor="transparent"
                onFocus={handleFocus}
                onBlur={handleBlur}
                onChangeText={handleChangeText}
                {...rest}
            />
            {showFakePlaceholder && (
                <Text
                    pointerEvents="none"
                    style={[
                        {
                            position: 'absolute',
                            left: 0,
                            right: 0,
                            top: 0,
                            bottom: 0,
                            zIndex: 10,
                            fontFamily: placeholderFontFamily,
                            fontWeight: 'normal',
                            fontSize: overlayFontSize,
                            color: placeholderTextColor || 'rgba(150,150,150,0.7)',
                            paddingTop,
                            paddingBottom,
                            paddingLeft,
                            paddingRight,
                            textAlign: overlayTextAlign,
                            writingDirection: overlayWritingDirection,
                            textAlignVertical: overlayTextAlignVertical,
                        },
                        placeholderStyle,
                    ]}
                >
                    {placeholder}
                </Text>
            )}
        </View>
    );
});

AppTextInput.displayName = 'AppTextInput';

export default AppTextInput;