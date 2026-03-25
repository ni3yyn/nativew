import * as FileSystem from 'expo-file-system/legacy'; 
import { FALLBACK_PRODUCTS } from '../constants/productData';

// Production endpoints
const GITHUB_CDN_URL = "https://cdn.jsdelivr.net/gh/ni3yyn/prdcts@main/finalcatalog506.json"; 
const GITHUB_RAW_URL = "https://raw.githubusercontent.com/ni3yyn/prdcts/main/finalcatalog506.json";

const FILENAME = "wathiq_catalog_db_prod.json";
const ETAG_FILENAME = "wathiq_catalog_etag_prod.txt";

const LOCAL_PATH = `${FileSystem.documentDirectory}${FILENAME}`;
const ETAG_PATH = `${FileSystem.documentDirectory}${ETAG_FILENAME}`;

// Helper: Fetch with Timeout to prevent infinite loading screens on bad networks
const fetchWithTimeout = async (url, options = {}, timeoutMs = 8000) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(id);
        return response;
    } catch (error) {
        clearTimeout(id);
        throw new Error(`Network Timeout or Fetch Error: ${error.message}`);
    }
};

export const CatalogService = {
  async fetchCatalog(forceUpdate = false) {
    try {
      const dbInfo = await FileSystem.getInfoAsync(LOCAL_PATH);
      const etagInfo = await FileSystem.getInfoAsync(ETAG_PATH);
      let localETag = '';

      if (etagInfo.exists) {
        localETag = await FileSystem.readAsStringAsync(ETAG_PATH);
      }
      
      if (!dbInfo.exists || forceUpdate) {
        console.log(`📡 Syncing: Fetching latest products (${forceUpdate ? 'Forced' : 'Auto'})...`);
        
        // Use Direct Raw URL with timestamp cache-buster if forced, otherwise use fast CDN
        const fetchUrl = forceUpdate ? `${GITHUB_RAW_URL}?t=${Date.now()}` : GITHUB_CDN_URL;
        const headers = (localETag && !forceUpdate) ? { 'If-None-Match': localETag } : {};

        const response = await fetchWithTimeout(fetchUrl, { headers });

        // HTTP 304: Nothing has changed on the server, load local cache
        if (response.status === 304 && dbInfo.exists) {
          console.log("✅ Catalog up to date (304 Not Modified).");
          return await this.readLocalCache();
        }

        if (!response.ok) throw new Error(`Server returned ${response.status}`);
        
        const data = await response.json();
        
        // Safety check: Ensure the response is actually an array before saving it
        if (!Array.isArray(data)) throw new Error("Invalid catalog format received from server.");

        // Write to Sandbox Storage
        await FileSystem.writeAsStringAsync(LOCAL_PATH, JSON.stringify(data), {
            encoding: FileSystem.EncodingType.UTF8
        });
        
        // Save the new ETag to optimize future requests
        const newETag = response.headers.get('ETag');
        if (newETag && !forceUpdate) {
           await FileSystem.writeAsStringAsync(ETAG_PATH, newETag);
        }
        
        console.log(`✅ Update Successful. Extracted ${data.length} products.`);
        return data;
      }

      console.log("📂 Storage: Loading products from local cache...");
      return await this.readLocalCache();

    } catch (error) {
      console.warn(`⚠️ Catalog sync failed: ${error.message}. Attempting recovery...`);
      return await this.readLocalCacheFallback();
    }
  },

  // Helper: Safely reads the local cache and handles JSON corruption
  async readLocalCache() {
    try {
      const localContent = await FileSystem.readAsStringAsync(LOCAL_PATH);
      return JSON.parse(localContent);
    } catch (parseError) {
      console.error("❌ Corrupted cache detected. Cleaning up...");
      await FileSystem.deleteAsync(LOCAL_PATH, { idempotent: true });
      throw parseError; // Cascade to the fallback handler
    }
  },

  // Helper: The ultimate safety net
  async readLocalCacheFallback() {
    const info = await FileSystem.getInfoAsync(LOCAL_PATH);
    if (info.exists) {
      try {
        const localContent = await FileSystem.readAsStringAsync(LOCAL_PATH);
        return JSON.parse(localContent);
      } catch (e) {
         // Corrupted fallback cache, ignore and proceed to hardcoded fallback
      }
    }
    console.log("🛡️ Using Hardcoded Fallback Products.");
    return FALLBACK_PRODUCTS;
  }
};