import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';

export const getWeatherLabel = (code) => {
  if (code === 0) return 'Clear sky';
  if (code >= 1 && code <= 3) return 'Partly cloudy';
  if (code >= 45 && code <= 48) return 'Fog';
  if (code >= 51 && code <= 67) return 'Drizzle/Rain';
  if (code >= 71 && code <= 77) return 'Snow';
  if (code >= 80 && code <= 82) return 'Showers';
  if (code >= 95 && code <= 99) return 'Thunderstorm';
  return 'Unknown';
};

export const compressImage = (file) => {
  return new Promise((resolve, reject) => {
    if (file.size > 50 * 1024 * 1024) {
      reject(new Error('Image too large (Max 50MB).'));
      return;
    }
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new window.Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 2560; 
        const MAX_HEIGHT = 2560;
        let width = img.width;
        let height = img.height;
        if (width > height && width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        } else if (height > MAX_HEIGHT) {
          width *= MAX_HEIGHT / height;
          height = MAX_HEIGHT;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Compression failed.'));
        }, 'image/webp', 0.95);
      };
      img.onerror = () => reject(new Error('Failed to load image.'));
    };
    reader.onerror = () => reject(new Error('Failed to read file.'));
  });
};

export const formatSleepRange = (startTime, durationHours) => {
  if (!startTime) return '';
  const start = new Date(startTime);
  const end = new Date(startTime + (durationHours * 60 * 60 * 1000));
  const fmt = (d) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${fmt(start)} - ${fmt(end)}`;
};

export const blobToJpeg = (blob) => {
  return new Promise((resolve) => {
    if (!(blob instanceof Blob)) {
        resolve(blob);
        return;
    }
    const img = new window.Image();
    const url = URL.createObjectURL(blob);
    img.src = url;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.9);
      URL.revokeObjectURL(url);
      resolve(jpegDataUrl);
    };
    img.onerror = () => {
        resolve(null); 
    };
  });
};

export const Styles = () => (
  <style>{`
    .no-scrollbar::-webkit-scrollbar { display: none; }
    .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
    
    .native-input {
      font-family: inherit;
      font-size: 15px;
      line-height: 1.5;
      color: #111827;
    }
    .dark .native-input { color: #e5e7eb; }

    textarea { caret-color: var(--accent-500); }
  `}</style>
);