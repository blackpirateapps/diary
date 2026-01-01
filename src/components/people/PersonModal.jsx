// components/people/PersonModal.jsx
import React, { useState, useRef } from 'react';
import { X, Camera, Plus, Trash2, Gift, Calendar } from 'lucide-react';
import { useBlobUrl } from '../../db';
import { compressImage } from '../editor/editorUtils';

const PersonModal = ({ person, onClose, onSave, onDelete }) => {
  const [formData, setFormData] = useState(person || { 
    name: '', relationship: 'Friend', description: '', image: null, dates: [], gallery: [], giftIdeas: []
  });
  const [giftInput, setGiftInput] = useState('');
  const fileRef = useRef(null);
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

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4">
      <div className="bg-white dark:bg-gray-950 w-full max-w-lg md:rounded-3xl rounded-t-3xl p-6 border border-gray-100 dark:border-gray-800 shadow-2xl max-h-[90vh] overflow-y-auto no-scrollbar animate-slideUp">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold dark:text-white">{person ? 'Edit Contact' : 'New Contact'}</h2>
          {person && <button onClick={() => { if(window.confirm('Delete?')) onDelete(person.id); onClose(); }} className="p-2 text-red-500 bg-red-50 rounded-full"><Trash2 size={18} /></button>}
        </div>

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
            className="w-full bg-gray-50 dark:bg-gray-900 dark:text-white p-3.5 rounded-xl outline-none appearance-none"
            value={formData.relationship}
            onChange={e => setFormData({...formData, relationship: e.target.value})}
          >
            {['Friend', 'Family', 'Partner', 'Work', 'Other'].map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <textarea 
            placeholder="Notes..." 
            className="w-full bg-gray-50 dark:bg-gray-900 dark:text-white p-3.5 rounded-xl outline-none min-h-[80px] resize-none"
            value={formData.description}
            onChange={e => setFormData({...formData, description: e.target.value})}
          />
        </div>

        <div className="flex gap-3 pt-4 border-t dark:border-gray-800">
          <button onClick={onClose} className="flex-1 py-3.5 rounded-xl bg-gray-100 dark:bg-gray-800 dark:text-white font-bold">Cancel</button>
          <button onClick={() => onSave(formData)} className="flex-1 py-3.5 rounded-xl bg-[var(--accent-500)] text-white font-bold">Save</button>
        </div>
      </div>
    </div>
  );
};

export default PersonModal;