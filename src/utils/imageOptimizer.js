/**
 * Optimizes Cloudinary URLs for performance and bandwidth.
 * Adds: f_auto (Best format: WebP/AVIF), q_auto (Smart compression)
 * @param {string} url - The raw Cloudinary URL
 * @param {number} width - Optional width to resize on the fly
 * @returns {string} - The optimized URL
 */
export const getOptimizedImageUrl = (url, width = 800) => {
    if (!url || typeof url !== 'string') return null;
    
    // Check if it's actually a Cloudinary URL
    if (!url.includes('cloudinary.com')) return url;

    // Avoid double optimization
    if (url.includes('f_auto,q_auto')) return url;

    // Inject transformations after the "/upload/" segment
    // w_{width}: Resize to specific width
    // f_auto: Serve WebP/AVIF automatically
    // q_auto: meaningful compression without visual loss
    const transformation = `w_${width},f_auto,q_auto`;
    
    return url.replace('/upload/', `/upload/${transformation}/`);
};