import { Platform } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';

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
        if (Platform.OS === 'web') {
            const formData = new FormData();
            formData.append('upload_preset', CLOUDINARY_PRESET);
            const response = await fetch(uri);
            const blob = await response.blob();
            formData.append('file', blob);

            const uploadRes = await fetch(CLOUDINARY_URL, {
                method: 'POST',
                body: formData,
            });
            const data = await uploadRes.json();
            if (data.error) throw new Error(data.error.message);
            return data.secure_url || null;
        }

        // Native (Android / iOS): Use FileSystem.uploadAsync to prevent FormData crashes on React Native
        const uploadResult = await FileSystem.uploadAsync(CLOUDINARY_URL, uri, {
            httpMethod: 'POST',
            uploadType: FileSystem.FileSystemUploadType.MULTIPART,
            fieldName: 'file',
            parameters: {
                upload_preset: CLOUDINARY_PRESET,
            },
        });

        if (uploadResult.status < 200 || uploadResult.status >= 300) {
            console.error("Cloudinary upload error:", uploadResult.status, uploadResult.body);
            throw new Error(`Upload failed with status ${uploadResult.status}`);
        }

        const data = JSON.parse(uploadResult.body);
        if (data.error) throw new Error(data.error.message);
        return data.secure_url || null;
    } catch (error) {
        console.error("Upload Error:", error);
        return null;
    }
};