import * as FileSystem from 'expo-file-system/legacy'; 

// Production endpoints
const GITHUB_CDN_URL = "https://cdn.jsdelivr.net/gh/ni3yyn/prdcts@main/finalcatalog506.json"; 
const GITHUB_RAW_URL = "https://raw.githubusercontent.com/ni3yyn/prdcts/main/finalcatalog506.json";

const FILENAME = "wathiq_catalog_db_prod.json";
const ETAG_FILENAME = "wathiq_catalog_etag_prod.txt";

const LOCAL_PATH = `${FileSystem.documentDirectory}${FILENAME}`;
const ETAG_PATH = `${FileSystem.documentDirectory}${ETAG_FILENAME}`;

// ---------------------------------------------------------------------------
// Defensive FS wrappers.
//
// On some builds the native expo-file-system module rejects the 2nd argument
// to getInfoAsync unless it is a valid InfoOptionsLegacy instance, producing:
//   "The 2nd argument cannot be cast to type ...InfoOptionsLegacy
//    (received class com.facebook.react.bridge.ReadableNativeMap)"
//   → java.lang.NullPointerException
// We never pass a 2nd argument, and we never let a native throw abort the
// whole catalog load with a native NPE — instead the throw surfaces as a
// normal JS error the screen can render a retry for.
// ---------------------------------------------------------------------------
async function safeGetInfo(uri) {
  try {
    return await FileSystem.getInfoAsync(uri);
  } catch (e) {
    console.warn(`⚠️ getInfoAsync failed for ${uri}: ${e?.message || e}`);
    return { exists: false };
  }
}

async function safeReadString(uri) {
  try {
    return await FileSystem.readAsStringAsync(uri);
  } catch (e) {
    console.warn(`⚠️ readAsStringAsync failed for ${uri}: ${e?.message || e}`);
    return null;
  }
}

async function safeWriteString(uri, contents) {
  try {
    await FileSystem.writeAsStringAsync(uri, contents, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    return true;
  } catch (e) {
    console.warn(`⚠️ writeAsStringAsync failed for ${uri}: ${e?.message || e}`);
    return false;
  }
}

async function safeDelete(uri) {
  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch (e) {
    console.warn(`⚠️ deleteAsync failed for ${uri}: ${e?.message || e}`);
  }
}

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
  /**
   * Fetch the catalog.
   *
   * Resolves with a non-empty array on success (network or local cache).
   * Throws on any failure. There is no silent fallback — the caller is
   * responsible for presenting a retry UI.
   */
  async fetchCatalog(forceUpdate = false) {
    const dbInfo = await safeGetInfo(LOCAL_PATH);
    const etagInfo = await safeGetInfo(ETAG_PATH);
    let localETag = '';

    if (etagInfo.exists) {
      const etagRaw = await safeReadString(ETAG_PATH);
      if (etagRaw) localETag = etagRaw.trim();
    }

    // ---------------------------------------------------------------
    // Cache-hit path: file exists and we're not forcing a refresh.
    // Try local cache first; only hit the network if the cache is bad.
    // ---------------------------------------------------------------
    if (dbInfo.exists && !forceUpdate) {
      const cached = await this.readLocalCache();
      if (Array.isArray(cached) && cached.length > 0) {
        console.log("📂 Storage: Loading products from local cache...");
        return cached;
      }
      console.warn("⚠️ Local cache unusable; fetching from network.");
    }

    // ---------------------------------------------------------------
    // Network path: either no cache, forced refresh, or bad cache.
    // ---------------------------------------------------------------
    console.log(`📡 Syncing: Fetching latest products (${forceUpdate ? 'Forced' : 'Auto'})...`);

    const fetchUrl = forceUpdate ? `${GITHUB_RAW_URL}?t=${Date.now()}` : GITHUB_CDN_URL;
    const headers = (localETag && !forceUpdate) ? { 'If-None-Match': localETag } : {};

    const response = await fetchWithTimeout(fetchUrl, { headers });

    // 304: nothing changed server-side. Only valid if we actually have a
    // usable cache. If we don't, the request was conditional on a bad
    // etag — refetch unconditionally.
    if (response.status === 304) {
      if (dbInfo.exists) {
        const cached = await this.readLocalCache();
        if (Array.isArray(cached) && cached.length > 0) {
          console.log("✅ Catalog up to date (304 Not Modified).");
          return cached;
        }
      }
      console.warn("⚠️ 304 received but no usable cache — refetching unconditionally.");
      const retry = await fetchWithTimeout(fetchUrl, {});
      if (!retry.ok) throw new Error(`Server returned ${retry.status}`);
      const retryData = await retry.json();
      if (!Array.isArray(retryData) || retryData.length === 0) {
        throw new Error("Server returned an invalid or empty catalog.");
      }
      await safeWriteString(LOCAL_PATH, JSON.stringify(retryData));
      const retryETag = retry.headers.get('ETag');
      if (retryETag && !forceUpdate) {
        await safeWriteString(ETAG_PATH, retryETag);
      }
      console.log(`✅ Update Successful. Extracted ${retryData.length} products.`);
      return retryData;
    }

    if (!response.ok) throw new Error(`Server returned ${response.status}`);

    const data = await response.json();

    // Must be a non-empty array. An empty array from the server is treated
    // as an error and never overwrites a good local cache.
    if (!Array.isArray(data)) {
      throw new Error("Invalid catalog format received from server.");
    }
    if (data.length === 0) {
      throw new Error("Server returned an empty catalog.");
    }

    // Persist. A failed disk write must not fail the load — data is in memory.
    await safeWriteString(LOCAL_PATH, JSON.stringify(data));

    const newETag = response.headers.get('ETag');
    if (newETag && !forceUpdate) {
      await safeWriteString(ETAG_PATH, newETag);
    }

    console.log(`✅ Update Successful. Extracted ${data.length} products.`);
    return data;
  },

  /**
   * Reads the local cache. Returns null on any failure (missing, unreadable,
   * corrupt, or empty). Never throws.
   */
  async readLocalCache() {
    const localContent = await safeReadString(LOCAL_PATH);
    if (!localContent) return null;

    try {
      const data = JSON.parse(localContent);
      if (Array.isArray(data) && data.length > 0) {
        return data;
      }
      console.warn("⚠️ Local cache is not a non-empty array; discarding.");
    } catch (parseError) {
      console.warn("❌ Corrupted cache detected:", parseError?.message || parseError);
    }

    await safeDelete(LOCAL_PATH);
    return null;
  }
};