import React, { useState, useMemo } from 'react';
import { Image as ImageIcon, X, Calendar, MapPin, ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MediaGallery = ({ entries }) => {
  const [selectedImage, setSelectedImage] = useState(null);

  // --- DATA PROCESSING (Same as before) ---
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
        location: entry.location,
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

  const years = Object.keys(galleryData).sort((a, b) => b - a);

  const formatFullDate = (date) => {
    return date.toLocaleDateString(undefined, { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  // --- ANIMATION VARIANTS ---
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="pb-24">
      {/* --- STICKY HEADER --- */}
      <header className="px-6 pt-6 pb-2 sticky top-0 bg-[#F3F4F6]/95 backdrop-blur-md z-20 border-b border-gray-200/50">
        <motion.div 
          initial={{ opacity: 0, y: -10 }} 
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-between items-start"
        >
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Media</h1>
            <p className="text-gray-500 text-sm mt-1 font-medium">
                {Object.values(galleryData).reduce((acc, year) => 
                    acc + Object.values(year).reduce((c, m) => c + m.length, 0), 0
                )} photos
            </p>
          </div>
        </motion.div>
      </header>

      {/* --- GALLERY GRID --- */}
      <div className="px-6 pt-4 space-y-8">
        {years.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-20 text-gray-400"
          >
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-gray-300">
                <ImageIcon size={24} />
            </div>
            <p className="font-medium">No photos added yet.</p>
          </motion.div>
        ) : (
          years.map((year) => (
            <motion.div 
              key={year} 
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="space-y-6"
            >
              <motion.h2 variants={itemVariants} className="text-2xl font-bold text-gray-300 border-b border-gray-100 pb-2 select-none">
                {year}
              </motion.h2>
              
              {Object.keys(galleryData[year]).map(month => (
                <motion.div key={`${year}-${month}`} variants={itemVariants} className="space-y-3">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider pl-1">
                    {month}
                  </h3>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {galleryData[year][month].map((img) => (
                      <motion.button
                        key={img.id}
                        layoutId={`img-${img.id}`} // Magic: Shared element transition
                        onClick={() => setSelectedImage(img)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.95 }}
                        className="aspect-square rounded-2xl overflow-hidden bg-gray-100 relative group cursor-pointer border border-transparent hover:border-black/5"
                      >
                        <img
                          src={img.src}
                          alt="Memory"
                          loading="lazy"
                          className="w-full h-full object-cover transition-transform duration-700"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          ))
        )}
      </div>

      {/* --- LIGHTBOX MODAL --- */}
      {/* AnimatePresence allows the component to animate OUT before unmounting */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col bg-white"
            data-color-mode="light"
          >
            {/* Modal Header */}
            <motion.div 
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="px-4 py-3 flex justify-between items-center bg-white/95 backdrop-blur-xl z-30 border-b border-gray-100"
            >
              <button 
                onClick={() => setSelectedImage(null)} 
                className="p-2 -ml-2 text-blue-500 hover:bg-blue-50 rounded-full transition-colors flex items-center gap-1"
              >
                <ChevronLeft size={24} />
                <span className="text-base font-medium">Back</span>
              </button>
              <span className="text-sm font-semibold text-gray-900">Photo Detail</span>
              <div className="w-10" /> 
            </motion.div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto bg-gray-50 flex flex-col items-center justify-center p-4">
              <motion.div 
                layoutId={`img-${selectedImage.id}`} // Matches the ID above for smooth morphing
                className="w-full max-w-3xl bg-white rounded-3xl shadow-xl overflow-hidden"
              >
                <div className="bg-black/5 relative aspect-auto min-h-[300px] flex items-center justify-center">
                  <img 
                    src={selectedImage.src} 
                    alt="Full screen" 
                    className="w-full h-auto max-h-[70vh] object-contain"
                  />
                </div>

                {/* Metadata Footer */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="p-6 space-y-4"
                >
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
                </motion.div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MediaGallery;