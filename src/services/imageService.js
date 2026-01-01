import { Platform } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';

// 🔴 REPLACE WITH YOUR CLOUDINARY DETAILS
const CLOUDINARY_CLOUD_NAME = "ddezg61vu"; 
const CLOUDINARY_PRESET = "community"; 
const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

export const compressImage = async (uri) => {
    // On Web, skip compression to avoid blob/uri issues
    if (Platform.OS === 'web') return uri; 
    
    try {
        const manipResult = await ImageManipulator.manipulateAsync(
            uri,
            [{ resize: { width: 800 } }], 
            { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG } 
        );
        return manipResult.uri;
    } catch (error) {
        console.log("Compression Error (Using original):", error);
        return uri; 
    }
};

export const uploadImageToCloudinary = async (uri) => {
    if (!uri) return null;
    try {
        const formData = new FormData();
        formData.append('upload_preset', CLOUDINARY_PRESET);

        if (Platform.OS === 'web') {
            const response = await fetch(uri);
            const blob = await response.blob();
            formData.append('file', blob);
        } else {
            const filename = uri.split('/').pop();
            const match = /\.(\w+)$/.exec(filename);
            const type = match ? `image/${match[1]}` : `image/jpeg`;
            formData.append('file', { uri, name: filename, type });
        }

        const response = await fetch(CLOUDINARY_URL, {
            method: 'POST',
            body: formData,
        });

        const data = await response.json();
        if (data.error) throw new Error(data.error.message);
        return data.secure_url || null;
    } catch (error) {
        console.error("Upload Error:", error);
        return null;
    }
};