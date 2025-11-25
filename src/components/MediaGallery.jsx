import React from 'react';
import { Image as ImageIcon } from 'lucide-react';

const MediaGallery = ({ entries }) => {
  const allImages = entries.reduce((acc, entry) => {
    const imgs = Array.isArray(entry.images) ? entry.images : [];
    return [...acc, ...imgs.map(img => ({ src: img, entryId: entry.id }))];
  }, []);

  return (
    <div className="space-y-6 pb-24 px-6 pt-6">
      <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Media</h1>
      {allImages.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <ImageIcon size={48} className="mb-4 opacity-50" />
          <p>No photos added yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {allImages.map((img, idx) => (
            <div
              key={`${img.entryId}-${idx}`}
              className="aspect-square rounded-2xl overflow-hidden bg-gray-100 relative group"
            >
              <img
                src={img.src}
                alt=""
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MediaGallery;
