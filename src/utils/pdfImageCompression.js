// Simple browser-based image compression for PDF embedding
// Converts any image to JPEG at given quality and max dimensions using a canvas.

const _cache = new Map();

export async function compressImageToDataURL(src, options = {}) {
  const {
    maxWidth = 1200,
    maxHeight = 900,
    quality = 0.6,
    mimeType = 'image/jpeg',
    background = '#ffffff', // used when converting from PNG with transparency
  } = options;

  try {
    const cacheKey = `${src}|${maxWidth}x${maxHeight}|q=${quality}|${mimeType}`;
    if (_cache.has(cacheKey)) return _cache.get(cacheKey);
    const img = await loadImage(src);
    // Compute target size preserving aspect ratio
    const { width, height } = computeTargetSize(img.naturalWidth || img.width, img.naturalHeight || img.height, maxWidth, maxHeight);

    // Draw into canvas
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    // Fill background for transparency if exporting to JPEG
    if (mimeType === 'image/jpeg' && background) {
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, width, height);
    }
    ctx.drawImage(img, 0, 0, width, height);

    const dataUrl = canvas.toDataURL(mimeType, quality);
    _cache.set(cacheKey, dataUrl);
    return dataUrl;
  } catch (e) {
    console.warn('[compressImageToDataURL] Fallback to original src due to error:', e);
    return src; // fallback: return original
  }
}

export function computeTargetSize(origW, origH, maxW, maxH) {
  if (!origW || !origH) return { width: Math.min(origW || maxW, maxW), height: Math.min(origH || maxH, maxH) };
  const ratio = Math.min(maxW / origW, maxH / origH, 1);
  return { width: Math.round(origW * ratio), height: Math.round(origH * ratio) };
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // For local assets served by the app, crossOrigin isn't usually required.
    // If you ever serve from another origin, uncomment next line:
    // img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}
