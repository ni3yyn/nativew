import * as FileSystem from 'expo-file-system/legacy'; // <--- FIXED FOR EXPO 54
import { FALLBACK_PRODUCTS } from '../constants/productData';

// REPLACE with your actual GitHub Raw URL
const GITHUB_RAW_URL = "https://raw.githubusercontent.com/ni3yyn/prdcts/refs/heads/main/finalcatalog506.json"; 
const FILENAME = "wathiq_catalog_db.json";
const LOCAL_PATH = `${FileSystem.documentDirectory}${FILENAME}`;

export const CatalogService = {
  async fetchCatalog(forceUpdate = false) {
    try {
      // Check if the local database exists using the legacy API
      const info = await FileSystem.getInfoAsync(LOCAL_PATH);
      
      if (!info.exists || forceUpdate) {
        console.log("📡 Syncing: Fetching latest products from GitHub...");
        
        const response = await fetch(GITHUB_RAW_URL);
        if (!response.ok) throw new Error(`Network response was ${response.status}`);
        
        const data = await response.json();
        
        // Write data to the internal storage sandbox
        await FileSystem.writeAsStringAsync(LOCAL_PATH, JSON.stringify(data), {
          encoding: FileSystem.EncodingType.UTF8
        });
        
        return data;
      }

      // Load from local storage for instant access
      console.log("📂 Storage: Loading products from local cache...");
      const localContent = await FileSystem.readAsStringAsync(LOCAL_PATH);
      return JSON.parse(localContent);

    } catch (error) {
      console.error("❌ CatalogService Error:", error.message);
      
      // Fallback: Try local cache first, then hardcoded fallback
      const info = await FileSystem.getInfoAsync(LOCAL_PATH);
      if (info.exists) {
        const localContent = await FileSystem.readAsStringAsync(LOCAL_PATH);
        return JSON.parse(localContent);
      }
      
      return FALLBACK_PRODUCTS; 
    }
  }
};