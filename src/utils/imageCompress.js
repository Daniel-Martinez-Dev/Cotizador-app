// Browser-side image helpers (DataURL + compression)
// Keeps payload small enough for Firestore fields.

export async function compressImageFileToDataURL(file, options = {}) {
	if (!file) return "";

	const {
		maxWidth = 900,
		maxHeight = 900,
		quality = 0.65,
		mimeType = "image/jpeg",
		background = "#ffffff",
		// Soft limit to avoid hitting Firestore 1MB doc limit.
		// DataURL is base64 and has overhead; keep it comfortably below 1MB.
		maxDataUrlChars = 750_000,
	} = options;

	if (typeof File === "undefined" || !(file instanceof File)) {
		throw new Error("Archivo inválido");
	}
	if (!file.type?.startsWith("image/")) {
		throw new Error("El archivo no es una imagen");
	}

	// First pass
	let dataUrl = await _compressFromFile(file, { maxWidth, maxHeight, quality, mimeType, background });
	if (dataUrl && dataUrl.length <= maxDataUrlChars) return dataUrl;

	// Second pass (more aggressive) if still large
	dataUrl = await _compressFromFile(file, {
		maxWidth: Math.min(maxWidth, 700),
		maxHeight: Math.min(maxHeight, 700),
		quality: Math.min(quality, 0.55),
		mimeType,
		background,
	});

	if (dataUrl && dataUrl.length <= maxDataUrlChars) return dataUrl;
	throw new Error("La imagen es demasiado grande. Usa una imagen más liviana o recortada.");
}

export function dataUrlSizeLabel(dataUrl) {
	if (!dataUrl) return "0 KB";
	// base64 length -> bytes approx: (len * 3/4) minus padding, but this is good enough for a label
	const base64Len = String(dataUrl).split(",")[1]?.length || 0;
	const bytes = Math.floor((base64Len * 3) / 4);
	const kb = bytes / 1024;
	if (kb < 1024) return `${Math.round(kb)} KB`;
	return `${(kb / 1024).toFixed(2)} MB`;
}

async function _compressFromFile(file, { maxWidth, maxHeight, quality, mimeType, background }) {
	const objectUrl = URL.createObjectURL(file);
	try {
		const img = await _loadImage(objectUrl);
		const { width, height } = _computeTargetSize(img.naturalWidth || img.width, img.naturalHeight || img.height, maxWidth, maxHeight);

		const canvas = document.createElement("canvas");
		canvas.width = width;
		canvas.height = height;
		const ctx = canvas.getContext("2d");

		if (mimeType === "image/jpeg" && background) {
			ctx.fillStyle = background;
			ctx.fillRect(0, 0, width, height);
		}
		ctx.drawImage(img, 0, 0, width, height);
		return canvas.toDataURL(mimeType, quality);
	} finally {
		URL.revokeObjectURL(objectUrl);
	}
}

function _computeTargetSize(origW, origH, maxW, maxH) {
	if (!origW || !origH) return { width: Math.min(origW || maxW, maxW), height: Math.min(origH || maxH, maxH) };
	const ratio = Math.min(maxW / origW, maxH / origH, 1);
	return { width: Math.round(origW * ratio), height: Math.round(origH * ratio) };
}

function _loadImage(src) {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.onload = () => resolve(img);
		img.onerror = (e) => reject(e);
		img.src = src;
	});
}
