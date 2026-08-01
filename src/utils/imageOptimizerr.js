/**
 * Transforms a raw URL into an optimized, resized WebP image via proxy.
 * @param {string} url - The original image URL
 * @param {number} width - Target width (default 300 for thumbnails)
 * @param {number} quality - Compression quality (1-100)
 */
export const getOptimizedImage = (url, width = 300, quality = 80) => {
    if (!url || typeof url !== 'string') return null;
    
    const cleanUrl = url.trim();
    if (!cleanUrl) return null;

    // If the image is local, data URI, blob, or file, don't proxy
    if (
        cleanUrl.startsWith('data:') || 
        cleanUrl.startsWith('file:') || 
        cleanUrl.startsWith('blob:') || 
        cleanUrl.includes('127.0.0.1') || 
        cleanUrl.includes('localhost')
    ) {
        return cleanUrl;
    }

    // SVG images shouldn't be proxied/converted
    if (cleanUrl.toLowerCase().endsWith('.svg')) {
        return cleanUrl;
    }

    // 1. Cloudinary URLs: use Cloudinary's native on-the-fly optimization if /upload/ is present
    if (cleanUrl.includes('cloudinary.com')) {
        if (cleanUrl.includes('f_auto') || cleanUrl.includes('q_auto')) return cleanUrl;
        if (cleanUrl.includes('/upload/')) {
            const transformation = `w_${width},f_auto,q_auto`;
            return cleanUrl.replace('/upload/', `/upload/${transformation}/`);
        }
        return cleanUrl;
    }

    // 2. OpenFoodFacts / OpenBeautyFacts images (direct CDN delivery is much faster and doesn't fail on high-res photos)
    if (
        cleanUrl.includes('openbeautyfacts.org') || 
        cleanUrl.includes('openfoodfacts.org') || 
        cleanUrl.includes('openfoodfacts.net') || 
        cleanUrl.includes('openbeautyfacts.net')
    ) {
        return cleanUrl;
    }
  
    // 3. Fallback to wsrv.nl for general external images
    try {
        return `https://wsrv.nl/?url=${encodeURIComponent(cleanUrl)}&w=${width}&q=${quality}&output=webp&il`;
    } catch (e) {
        return cleanUrl;
    }
};

export const getOptimizedImageUrl = getOptimizedImage;