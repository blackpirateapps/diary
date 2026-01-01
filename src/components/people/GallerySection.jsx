// components/people/GallerySection.jsx
import React from 'react';
import { ImageIcon } from 'lucide-react';
import { useBlobUrl } from '../../db';

/**
 * Individual Thumbnail Component
 * Handles the conversion of Blobs to usable URLs and hover effects.
 */
const GalleryThumb = ({ src }) => {
  const url = useBlobUrl(src);
  
  return (
    <div className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 group shadow-sm">
      {url ? (
        <img 
          src={url} 
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
          alt="Shared memory" 
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-gray-400">
           <ImageIcon size={20} />
        </div>
      )}
      {/* Subtle overlay on hover */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none" />
    </div>
  );
};

/**
 * Main Gallery Section Component
 */
const GallerySection = ({ images }) => {
  if (!images || images.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="p-1.5 bg-pink-50 dark:bg-pink-900/30 text-pink-500 rounded-lg">
          <ImageIcon size={16} />
        </div>
        <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
          Shared Moments
        </h3>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {images.map((img, i) => (
          <GalleryThumb key={i} src={img} />
        ))}
      </div>
    </div>
  );
};

export default GallerySection;