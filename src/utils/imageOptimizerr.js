/**
 * Transforms a raw URL into an optimized, resized WebP image via proxy.
 * @param {string} url - The original image URL
 * @param {number} width - Target width (default 300 for thumbnails)
 * @param {number} quality - Compression quality (1-100)
 */
export const getOptimizedImage = (url, width = 300, quality = 80) => {
    if (!url) return null;
    
    // If the image is already tiny or local, don't proxy
    if (url.includes('127.0.0.1') || url.startsWith('data:')) return url;
  
    // We use wsrv.nl (WordPress Image Resizer) which is free and extremely fast
    // w: width, h: height, fit: contain, q: quality, output: webp, il: progressive
    return `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=${width}&q=${quality}&output=webp&il`;
  };