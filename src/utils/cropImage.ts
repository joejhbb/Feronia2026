/**
 * Crops and frames an image onto a Canvas based on preview frame dimensions, pan offset, zoom scale, and padding.
 * Returns a Promise resolving to a high-resolution base64 data URL matching what the user sees in the frame.
 */
export async function getCroppedImg(
  imageSrc: string,
  pan: { x: number; y: number },
  imageZoom: number,
  frameWidth: number = 144,
  frameHeight: number = 112,
  padding: number = 4
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const naturalWidth = img.naturalWidth || 600;
        const naturalHeight = img.naturalHeight || 400;

        // Output Canvas dimensions (higher resolution than preview frame, e.g. 600px width)
        const outputWidth = Math.max(600, Math.round(frameWidth * 3));
        const outputHeight = Math.round(outputWidth * (frameHeight / frameWidth));

        const canvas = document.createElement('canvas');
        canvas.width = outputWidth;
        canvas.height = outputHeight;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          resolve(imageSrc);
          return;
        }

        // 1. Draw blurred ambient background (matching preview style)
        ctx.save();
        ctx.filter = 'blur(16px)';
        ctx.globalAlpha = 0.35;
        ctx.drawImage(img, -outputWidth * 0.1, -outputHeight * 0.1, outputWidth * 1.2, outputHeight * 1.2);
        ctx.restore();

        // Dark ambient overlay
        ctx.fillStyle = '#050a07';
        ctx.globalCompositeOperation = 'destination-over';
        ctx.fillRect(0, 0, outputWidth, outputHeight);
        ctx.globalCompositeOperation = 'source-over';

        // 2. Calculate contain scale inside inner frame (with padding)
        const innerWidth = Math.max(1, frameWidth - padding * 2);
        const innerHeight = Math.max(1, frameHeight - padding * 2);

        const scaleContain = Math.min(innerWidth / naturalWidth, innerHeight / naturalHeight);

        const baseWidth = naturalWidth * scaleContain;
        const baseHeight = naturalHeight * scaleContain;

        const zoomScale = imageZoom / 100;

        const renderedWidth = baseWidth * zoomScale;
        const renderedHeight = baseHeight * zoomScale;

        // Image center in frame coordinates
        const frameCenterX = frameWidth / 2 + pan.x;
        const frameCenterY = frameHeight / 2 + pan.y;

        // Top-left of rendered image in frame coordinates
        const imgFrameX = frameCenterX - renderedWidth / 2;
        const imgFrameY = frameCenterY - renderedHeight / 2;

        // Scale factor from preview frame to canvas
        const canvasScale = outputWidth / frameWidth;

        // Canvas destination coordinates
        const drawX = imgFrameX * canvasScale;
        const drawY = imgFrameY * canvasScale;
        const drawW = renderedWidth * canvasScale;
        const drawH = renderedHeight * canvasScale;

        // 3. Draw sharp image
        ctx.drawImage(img, drawX, drawY, drawW, drawH);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
        resolve(dataUrl);
      } catch (err) {
        console.warn('Canvas export error:', err);
        resolve(imageSrc);
      }
    };

    img.onerror = () => {
      resolve(imageSrc);
    };

    img.src = imageSrc;
  });
}
