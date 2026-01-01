import React from 'react';
import { Modal, View, TouchableOpacity, Image, ScrollView, StatusBar, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

const FullImageViewer = ({ visible, imageUrl, onClose }) => {
    if (!visible || !imageUrl) return null;
    
    return (
        <Modal visible={true} transparent={true} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
            <View style={styles.viewerContainer}>
                <StatusBar barStyle="light-content" backgroundColor="black" />
                <TouchableOpacity style={styles.viewerCloseBtn} onPress={onClose}>
                    <Ionicons name="close" size={32} color="#FFF" />
                </TouchableOpacity>
                <ScrollView 
                    contentContainerStyle={styles.scrollContent}
                    maximumZoomScale={3}
                    minimumZoomScale={1}
                    centerContent={true}
                    showsHorizontalScrollIndicator={false}
                    showsVerticalScrollIndicator={false}
                >
                    <Image source={{ uri: imageUrl }} style={styles.viewerImage} resizeMode="contain" />
                </ScrollView>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    viewerContainer: { flex: 1, backgroundColor: '#000', justifyContent: 'center' },
    viewerCloseBtn: { position: 'absolute', top: 50, right: 20, zIndex: 10, padding: 10, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 25 },
    scrollContent: { flex: 1, justifyContent: 'center' },
    viewerImage: { width: width, height: height * 0.8 },
});

export default FullImageViewer;