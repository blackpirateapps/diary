import React, { useState, useMemo } from 'react';
import { Image as ImageIcon, X, Calendar, MapPin, ChevronLeft } from 'lucide-react';

const MediaGallery = ({ entries }) => {
  const [selectedImage, setSelectedImage] = useState(null);

  // --- DATA PROCESSING ---
  // 1. Flatten all images from entries into a single array with metadata
  // 2. Sort by Date (Newest first)
  // 3. Group by Year -> Month
  const galleryData = useMemo(() => {
    const allImages = entries.reduce((acc, entry) => {
      const imgs = Array.isArray(entry.images) ? entry.images : [];
      if (imgs.length === 0) return acc;
      
      const dateObj = new Date(entry.date);
      
      return [...acc, ...imgs.map((src, index) => ({
        src,
        id: `${entry.id}-${index}`,
        entryId: entry.id,
        date: dateObj,
        location: entry.location, // Grab location for the lightbox
        weather: entry.weather
      }))];
    }, []);

    // Sort newest first
    allImages.sort((a, b) => b.date - a.date);

    // Group
    const groups = {};
    allImages.forEach(img => {
      const year = img.date.getFullYear();
      const month = img.date.toLocaleString('default', { month: 'long' });
      
      if (!groups[year]) groups[year] = {};
      if (!groups[year][month]) groups[year][month] = [];
      
      groups[year][month].push(img);
    });

    return groups;
  }, [entries]);

  // Sort years descending (2025, 2024...)
  const years = Object.keys(galleryData).sort((a, b) => b - a);

  // Format Helper
  const formatFullDate = (date) => {
    return date.toLocaleDateString(undefined, { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  return (
    <div className="pb-24 animate-in fade-in duration-500">
      {/* --- STICKY HEADER (Matches JournalList) --- */}
      <header className="px-6 pt-6 pb-2 sticky top-0 bg-[#F3F4F6]/95 backdrop-blur-md z-20 border-b border-gray-200/50">
        <div className="flex justify-between items-start">
            <div>
                <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Media</h1>
                <p className="text-gray-500 text-sm mt-1 font-medium">
                    {Object.values(galleryData).reduce((acc, year) => 
                        acc + Object.values(year).reduce((c, m) => c + m.length, 0), 0
                    )} photos
                </p>
            </div>
        </div>
      </header>

      {/* --- GALLERY GRID --- */}
      <div className="px-6 pt-4 space-y-8">
        {years.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-gray-300">
                <ImageIcon size={24} />
            </div>
            <p className="font-medium">No photos added yet.</p>
          </div>
        ) : (
          years.map(year => (
            <div key={year} className="space-y-6">
              {/* Year Heading */}
              <h2 className="text-2xl font-bold text-gray-300 border-b border-gray-100 pb-2 select-none">
                {year}
              </h2>
              
              {/* Months */}
              {Object.keys(galleryData[year]).map(month => (
                <div key={`${year}-${month}`} className="space-y-3">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider pl-1">
                    {month}
                  </h3>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {galleryData[year][month].map((img) => (
                      <button
                        key={img.id}
                        onClick={() => setSelectedImage(img)}
                        className="aspect-square rounded-2xl overflow-hidden bg-gray-100 relative group cursor-pointer focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all active:scale-95"
                      >
                        <img
                          src={img.src}
                          alt="Memory"
                          loading="lazy"
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      {/* --- LIGHTBOX MODAL --- */}
      {selectedImage && (
        <div 
            className="fixed inset-0 z-50 flex flex-col bg-white animate-in slide-in-from-bottom-10 duration-300"
            data-color-mode="light"
        >
            {/* Modal Header */}
            <div className="px-4 py-3 flex justify-between items-center bg-white/95 backdrop-blur-xl z-30 border-b border-gray-100">
                <button 
                    onClick={() => setSelectedImage(null)} 
                    className="p-2 -ml-2 text-blue-500 hover:bg-blue-50 rounded-full transition-colors flex items-center gap-1"
                >
                    <ChevronLeft size={24} />
                    <span className="text-base font-medium">Back</span>
                </button>
                <span className="text-sm font-semibold text-gray-900">Photo Detail</span>
                <div className="w-10" /> {/* Spacer for balance */}
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto bg-gray-50 flex flex-col items-center justify-center p-4">
                <div className="w-full max-w-3xl bg-white rounded-3xl shadow-xl overflow-hidden">
                    {/* Large Image */}
                    <div className="bg-black/5 relative aspect-auto min-h-[300px] flex items-center justify-center">
                        <img 
                            src={selectedImage.src} 
                            alt="Full screen" 
                            className="w-full h-auto max-h-[70vh] object-contain"
                        />
                    </div>

                    {/* Metadata Footer */}
                    <div className="p-6 space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-full">
                                <Calendar size={20} />
                            </div>
                            <div>
                                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Date Captured</p>
                                <p className="text-gray-900 font-medium text-lg">
                                    {formatFullDate(selectedImage.date)}
                                </p>
                            </div>
                        </div>

                        {selectedImage.location && (
                            <div className="flex items-center gap-3 pt-2 border-t border-gray-50">
                                <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-full">
                                    <MapPin size={20} />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Location</p>
                                    <p className="text-gray-900 font-medium">
                                        {selectedImage.location}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default MediaGallery;