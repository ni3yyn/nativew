import * as FileSystem from 'expo-file-system/legacy'; 
import { FALLBACK_PRODUCTS } from '../constants/productData';

// Production endpoints
const GITHUB_CDN_URL = "https://cdn.jsdelivr.net/gh/ni3yyn/prdcts@main/finalcatalog506.json"; 
const GITHUB_RAW_URL = "https://raw.githubusercontent.com/ni3yyn/prdcts/main/finalcatalog506.json";

const FILENAME = "wathiq_catalog_db_prod.json";
const ETAG_FILENAME = "wathiq_catalog_etag_prod.txt";

const LOCAL_PATH = `${FileSystem.documentDirectory}${FILENAME}`;
const ETAG_PATH = `${FileSystem.documentDirectory}${ETAG_FILENAME}`;

// Helper: Fetch with Timeout to prevent infinite loading screens on bad networks (20s for ~3MB payload)
const fetchWithTimeout = async (url, options = {}, timeoutMs = 20000) => {
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

let _memoryCatalogCache = null;
let _activeFetchPromise = null;

export const CatalogService = {
  async fetchCatalog(forceUpdate = false) {
    if (!forceUpdate && _memoryCatalogCache && Array.isArray(_memoryCatalogCache) && _memoryCatalogCache.length > 0) {
      return _memoryCatalogCache;
    }

    // Deduplicate in-flight fetch
    if (_activeFetchPromise && !forceUpdate) {
      return _activeFetchPromise;
    }

    _activeFetchPromise = (async () => {
      try {
        const dbInfo = await FileSystem.getInfoAsync(LOCAL_PATH);
        const etagInfo = await FileSystem.getInfoAsync(ETAG_PATH);
        let localETag = '';

        if (etagInfo.exists) {
          try {
            localETag = await FileSystem.readAsStringAsync(ETAG_PATH);
          } catch (e) {
            console.warn("Could not read ETag:", e);
          }
        }
        
        if (!dbInfo.exists || forceUpdate) {
          console.log(`📡 Syncing: Fetching latest products (${forceUpdate ? 'Forced' : 'Auto'})...`);
          
          const primaryUrl = forceUpdate ? `${GITHUB_RAW_URL}?t=${Date.now()}` : GITHUB_CDN_URL;
          const fallbackUrl = forceUpdate ? `${GITHUB_CDN_URL}?t=${Date.now()}` : GITHUB_RAW_URL;
          const headers = (localETag && !forceUpdate) ? { 'If-None-Match': localETag } : {};

          let response = null;
          try {
            response = await fetchWithTimeout(primaryUrl, { headers }, 20000);
          } catch (primaryErr) {
            console.warn(`⚠️ Primary catalog URL failed (${primaryUrl}): ${primaryErr.message}. Trying fallback URL...`);
            response = await fetchWithTimeout(fallbackUrl, { headers }, 20000);
          }

          // HTTP 304: Nothing has changed on the server, load local cache
          if (response.status === 304 && dbInfo.exists) {
            console.log("✅ Catalog up to date (304 Not Modified).");
            return await this.readLocalCache();
          }

          if (!response.ok) throw new Error(`Server returned ${response.status}`);
          
          const data = await response.json();
          
          // Safety check: Ensure the response is actually an array before saving it
          if (!Array.isArray(data)) throw new Error("Invalid catalog format received from server.");

          _memoryCatalogCache = data;

          // Write to Sandbox Storage asynchronously
          try {
            await FileSystem.writeAsStringAsync(LOCAL_PATH, JSON.stringify(data), {
                encoding: FileSystem.EncodingType.UTF8
            });
            
            // Save the new ETag to optimize future requests
            const newETag = response.headers.get('ETag');
            if (newETag && !forceUpdate) {
               await FileSystem.writeAsStringAsync(ETAG_PATH, newETag);
            }
          } catch (fsErr) {
            console.warn("⚠️ Failed writing catalog to local storage:", fsErr.message);
          }
          
          console.log(`✅ Update Successful. Extracted ${data.length} products.`);
          return data;
        }

        console.log("📂 Storage: Loading products from local cache...");
        return await this.readLocalCache();

      } catch (error) {
        console.warn(`⚠️ Catalog sync failed: ${error.message}. Attempting recovery...`);
        return await this.readLocalCacheFallback();
      } finally {
        _activeFetchPromise = null;
      }
    })();

    return _activeFetchPromise;
  },

  // Helper: Safely reads the local cache and handles JSON corruption
  async readLocalCache() {
    if (_memoryCatalogCache && Array.isArray(_memoryCatalogCache) && _memoryCatalogCache.length > 0) {
      return _memoryCatalogCache;
    }
    try {
      const localContent = await FileSystem.readAsStringAsync(LOCAL_PATH);
      const data = JSON.parse(localContent);
      if (Array.isArray(data)) {
        _memoryCatalogCache = data;
        return data;
      }
      throw new Error("Local cache is not an array");
    } catch (parseError) {
      console.error("❌ Corrupted cache detected. Cleaning up...");
      try {
        await FileSystem.deleteAsync(LOCAL_PATH, { idempotent: true });
      } catch (e) {}
      throw parseError; // Cascade to the fallback handler
    }
  },

  // Helper: The ultimate safety net
  async readLocalCacheFallback() {
    try {
      const info = await FileSystem.getInfoAsync(LOCAL_PATH);
      if (info.exists) {
        const localContent = await FileSystem.readAsStringAsync(LOCAL_PATH);
        const parsed = JSON.parse(localContent);
        if (Array.isArray(parsed) && parsed.length > 0) {
          _memoryCatalogCache = parsed;
          return parsed;
        }
      }
    } catch (e) {
      // Corrupted fallback cache, ignore and proceed to hardcoded fallback
    }

    if (Array.isArray(FALLBACK_PRODUCTS) && FALLBACK_PRODUCTS.length > 0) {
      console.log("🛡️ Using Hardcoded Fallback Products.");
      return FALLBACK_PRODUCTS;
    }

    return [];
  }
};