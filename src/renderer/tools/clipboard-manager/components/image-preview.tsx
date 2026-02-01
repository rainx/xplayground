/**
 * ImagePreview - Displays encrypted clipboard images by decrypting via IPC
 */

import { useState, useEffect } from 'react';

interface ImagePreviewProps {
  imagePath: string;
  alt?: string;
  className?: string;
  fallback?: React.ReactNode;
}

export function ImagePreview({
  imagePath,
  alt = 'Clipboard image',
  className,
  fallback,
}: ImagePreviewProps): JSX.Element {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadImage() {
      if (!imagePath) {
        setError(true);
        setLoading(false);
        return;
      }

      try {
        const result = await window.api.clipboard.getImageData(imagePath);
        if (cancelled) return;

        if (result.success && result.data) {
          // Determine format from path or default to png
          const format = imagePath.endsWith('.enc') ? 'png' : imagePath.split('.').pop() || 'png';
          setDataUrl(`data:image/${format};base64,${result.data}`);
          setError(false);
        } else {
          setError(true);
        }
      } catch {
        if (!cancelled) {
          setError(true);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    setLoading(true);
    setError(false);
    loadImage();

    return () => {
      cancelled = true;
    };
  }, [imagePath]);

  if (loading) {
    return <div className={`image-loading ${className || ''}`}>Loading...</div>;
  }

  if (error || !dataUrl) {
    return <>{fallback || <div className={`image-error ${className || ''}`}>Failed to load</div>}</>;
  }

  return <img src={dataUrl} alt={alt} className={className} />;
}
