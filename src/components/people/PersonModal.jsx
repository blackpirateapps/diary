// components/people/PersonModal.jsx
import React, { useState, useRef } from 'react';
import { X, Camera, Plus, Trash2, Gift, Calendar, ImageIcon } from 'lucide-react';
import { useBlobUrl } from '../../db';
import { compressImage } from '../editor/editorUtils';

const PersonModal = ({ person, onClose, onSave, onDelete }) => {
  const [formData, setFormData] = useState(person || { 
    name: '', 
    relationship: 'Friend', 
    description: '', 
    image: null, 
    dates: [], 
    gallery: [], 
    giftIdeas: []
  });
  
  const fileRef = useRef(null);
  const galleryRef = useRef(null);
  const avatarUrl = useBlobUrl(formData.image);

  const handleAvatar = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const compressed = await compressImage(file);
        setFormData(p => ({ ...p, image: compressed }));
      } catch (err) { alert('Invalid image'); }
    }
  };

  const handleGalleryUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      try {
        const compressedFiles = await Promise.all(files.map(f => compressImage(f)));
        setFormData(p => ({
          ...p,
          gallery: [...(p.gallery || []), ...compressedFiles]
        }));
      } catch (err) { alert('Error uploading images'); }
    }
  };

  const addDate = () => {
    const label = prompt("Label (e.g., Birthday, Anniversary):", "Birthday");
    if (label) {
      setFormData(p => ({
        ...p,
        dates: [...(p.dates || []), { label, date: new Date().toISOString().split('T')[0] }]
      }));
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4">
      <div className="bg-white dark:bg-gray-950 w-full max-w-lg md:rounded-3xl rounded-t-3xl p-6 border border-gray-100 dark:border-gray-800 shadow-2xl max-h-[90vh] overflow-y-auto no-scrollbar animate-slideUp">
        
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold dark:text-white">{person ? 'Edit Contact' : 'New Contact'}</h2>
          <div className="flex gap-2">
            {person && (
              <button 
                onClick={() => { if(window.confirm('Delete this contact?')) onDelete(person.id); }} 
                className="p-2 text-red-500 bg-red-50 dark:bg-red-900/20 rounded-full"
              >
                <Trash2 size={18} />
              </button>
            )}
            <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Profile Image */}
        <div className="flex justify-center mb-8">
          <div onClick={() => fileRef.current.click()} className="relative w-28 h-28 rounded-full bg-gray-50 dark:bg-gray-900 flex items-center justify-center cursor-pointer overflow-hidden border-2 border-dashed border-gray-300 dark:border-gray-700">
            {avatarUrl ? <img src={avatarUrl} className="w-full h-full object-cover" alt="" /> : <Camera size={24} className="text-gray-400" />}
            <input type="file" ref={fileRef} className="hidden" onChange={handleAvatar} accept="image/*" />
          </div>
        </div>

        <div className="space-y-4 mb-8">
          <input 
            placeholder="Name" 
            className="w-full bg-gray-50 dark:bg-gray-900 dark:text-white p-3.5 rounded-xl outline-none border border-transparent focus:border-[var(--accent-500)] font-bold"
            value={formData.name}
            onChange={e => setFormData({...formData, name: e.target.value})}
          />
          
          <select 
            className="w-full bg-gray-50 dark:bg-gray-900 dark:text-white p-3.5 rounded-xl outline-none border border-transparent focus:border-[var(--accent-500)]"
            value={formData.relationship}
            onChange={e => setFormData({...formData, relationship: e.target.value})}
          >
            {['Friend', 'Family', 'Partner', 'Work', 'Other'].map(r => <option key={r} value={r}>{r}</option>)}
          </select>

          {/* Important Dates */}
          <div className="space-y-2">
            <div className="flex justify-between items-center px-1">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                <Calendar size={14} /> Important Dates
              </label>
              <button onClick={addDate} className="text-[var(--accent-500)] text-xs font-bold">+ Add Date</button>
            </div>
            {formData.dates?.map((d, i) => (
              <div key={i} className="flex gap-2 items-center bg-gray-50 dark:bg-gray-900 p-2 rounded-xl">
                <span className="text-xs font-bold w-20 truncate ml-2">{d.label}</span>
                <input 
                  type="date" 
                  className="bg-transparent text-sm outline-none flex-1" 
                  value={d.date} 
                  onChange={e => {
                    const newDates = [...formData.dates];
                    newDates[i].date = e.target.value;
                    setFormData({...formData, dates: newDates});
                  }}
                />
                <button onClick={() => setFormData({...formData, dates: formData.dates.filter((_, idx) => idx !== i)})} className="p-1 text-gray-400"><X size={14}/></button>
              </div>
            ))}
          </div>

          {/* Gallery Upload */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1 px-1">
              <ImageIcon size={14} /> Gallery
            </label>
            <div className="flex flex-wrap gap-2">
              <button 
                onClick={() => galleryRef.current.click()}
                className="w-12 h-12 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-800 flex items-center justify-center text-gray-400"
              >
                <Plus size={18} />
              </button>
              {formData.gallery?.map((img, i) => (
                <div key={i} className="relative w-12 h-12 rounded-lg overflow-hidden group">
                  <GalleryItemBlob blob={img} />
                  <button 
                    onClick={() => setFormData(p => ({ ...p, gallery: p.gallery.filter((_, idx) => idx !== i) }))}
                    className="absolute inset-0 bg-black/40 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
            <input type="file" ref={galleryRef} className="hidden" multiple onChange={handleGalleryUpload} accept="image/*" />
          </div>

          <textarea 
            placeholder="Notes and observations..." 
            className="w-full bg-gray-50 dark:bg-gray-900 dark:text-white p-3.5 rounded-xl outline-none min-h-[100px] resize-none border border-transparent focus:border-[var(--accent-500)]"
            value={formData.description}
            onChange={e => setFormData({...formData, description: e.target.value})}
          />
        </div>

        <div className="flex gap-3 pt-4 border-t dark:border-gray-800">
          <button onClick={onClose} className="flex-1 py-3.5 rounded-xl bg-gray-100 dark:bg-gray-800 dark:text-white font-bold transition-colors">Cancel</button>
          <button onClick={() => onSave(formData)} className="flex-1 py-3.5 rounded-xl bg-[var(--accent-500)] text-white font-bold shadow-lg shadow-[var(--accent-500)]/20 transition-transform active:scale-95">Save</button>
        </div>
      </div>
    </div>
  );
};

// Internal helper for blob previews in modal
const GalleryItemBlob = ({ blob }) => {
  const url = useBlobUrl(blob);
  return url ? <img src={url} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gray-200 animate-pulse" />;
};

export default PersonModal;