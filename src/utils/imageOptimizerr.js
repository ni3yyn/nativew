/**
 * Transforms a raw URL into an optimized, resized WebP image via proxy.
 * @param {string} url - The original image URL
 * @param {number} width - Target width (default 300 for thumbnails)
 * @param {number} quality - Compression quality (1-100)
 */
export const getOptimizedImage = (url, width = 300, quality = 80) => {
    if (!url || typeof url !== 'string') return null;
    
    // If the image is already tiny or local, don't proxy
    if (url.includes('127.0.0.1') || url.startsWith('data:')) return url;

    // 1. If it's a Cloudinary URL, use Cloudinary's native on-the-fly optimization
    if (url.includes('cloudinary.com')) {
        if (url.includes('f_auto,q_auto')) return url;
        const transformation = `w_${width},f_auto,q_auto`;
        return url.replace('/upload/', `/upload/${transformation}/`);
    }

    // 2. If it's an OpenBeautyFacts image, it's already a 400px thumbnail (e.g. front_en.X.400.jpg)
    // Direct CDN delivery is significantly faster and more reliable than wsrv.nl proxy.
    if (url.includes('openbeautyfacts.org')) {
        return url;
    }
  
    // 3. Fallback to wsrv.nl for general external images
    return `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=${width}&q=${quality}&output=webp&il`;
};