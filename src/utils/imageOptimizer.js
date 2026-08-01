/**
 * Optimizes Cloudinary URLs for performance and bandwidth.
 * Adds: f_auto (Best format: WebP/AVIF), q_auto (Smart compression)
 * @param {string} url - The raw Cloudinary URL
 * @param {number} width - Optional width to resize on the fly
 * @returns {string} - The optimized URL
 */
export const getOptimizedImage = (url, width = 800, quality = 80) => {
    if (!url || typeof url !== 'string') return null;
    
    const cleanUrl = url.trim();
    if (!cleanUrl) return null;

    if (
        cleanUrl.startsWith('data:') || 
        cleanUrl.startsWith('file:') || 
        cleanUrl.startsWith('blob:') || 
        cleanUrl.includes('127.0.0.1') || 
        cleanUrl.includes('localhost')
    ) {
        return cleanUrl;
    }

    if (cleanUrl.toLowerCase().endsWith('.svg')) {
        return cleanUrl;
    }

    if (cleanUrl.includes('cloudinary.com')) {
        if (cleanUrl.includes('f_auto') || cleanUrl.includes('q_auto')) return cleanUrl;
        if (cleanUrl.includes('/upload/')) {
            const transformation = `w_${width},f_auto,q_auto`;
            return cleanUrl.replace('/upload/', `/upload/${transformation}/`);
        }
        return cleanUrl;
    }

    if (
        cleanUrl.includes('openbeautyfacts.org') || 
        cleanUrl.includes('openfoodfacts.org') || 
        cleanUrl.includes('openfoodfacts.net') || 
        cleanUrl.includes('openbeautyfacts.net')
    ) {
        return cleanUrl;
    }

    try {
        return `https://wsrv.nl/?url=${encodeURIComponent(cleanUrl)}&w=${width}&q=${quality}&output=webp&il`;
    } catch (e) {
        return cleanUrl;
    }
};

export const getOptimizedImageUrl = getOptimizedImage;