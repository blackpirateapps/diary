import React, { useState, useRef } from 'react';
import { Plus, User, Trash2, Camera, Heart, Calendar, X, ChevronLeft, MapPin } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, useBlobUrl } from '../db';
import { compressImage } from './editor/editorUtils'; 

// --- SHARED COMPONENTS (Simplified ListCard for independence) ---
const SimpleEntryCard = ({ entry }) => {
  const dateObj = new Date(entry.date);
  const mainDate = dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  const hasImage = entry.images && entry.images.length > 0;
  const imgUrl = useBlobUrl(hasImage ? entry.images[0] : null);

  return (
    <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm mb-3">
        <div className="flex justify-between items-start mb-2">
            <span className="font-bold text-gray-900 dark:text-gray-100">{mainDate}</span>
            {entry.location && (
                <span className="text-[10px] text-gray-400 flex items-center gap-1">
                    <MapPin size={10} /> {entry.location}
                </span>
            )}
        </div>
        
        {hasImage && (
            <div className="h-24 w-full rounded-lg overflow-hidden mb-2 bg-gray-50">
                <img src={imgUrl} className="w-full h-full object-cover" />
            </div>
        )}

        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 leading-relaxed">
            {entry.content.replace(/<[^>]*>?/gm, ' ')}
        </p>
    </div>
  );
};

const PersonCard = ({ person, onClick }) => {
  const imageUrl = useBlobUrl(person.image);
  return (
    <div onClick={() => onClick(person)} className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 flex items-center gap-4 cursor-pointer hover:border-[var(--accent-200)] transition-colors shadow-sm active:scale-[0.98]">
      <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-800 flex-shrink-0 overflow-hidden flex items-center justify-center border border-gray-200 dark:border-gray-700">
        {imageUrl ? <img src={imageUrl} className="w-full h-full object-cover" /> : <User size={24} className="text-gray-400" />}
      </div>
      <div className="min-w-0">
        <h3 className="font-bold text-gray-900 dark:text-white truncate text-lg">{person.name}</h3>
        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[var(--accent-50)] text-[var(--accent-600)] dark:bg-gray-800 dark:text-gray-300">
          {person.relationship}
        </span>
      </div>
    </div>
  );
};

// --- PROFILE VIEW ---
const PersonProfile = ({ person, onBack, onEdit }) => {
  const imageUrl = useBlobUrl(person.image);
  
  // Find entries where this person is in the 'people' array
  const entries = useLiveQuery(() => 
    db.entries
      .where('people').equals(person.id)
      .reverse()
      .sortBy('date'), 
  [person.id]) || [];

  return (
    <div className="bg-[#F3F4F6] dark:bg-gray-950 min-h-screen animate-slideUp absolute inset-0 z-30 flex flex-col">
        {/* Header Image/Banner */}
        <div className="relative h-48 bg-[var(--accent-100)] dark:bg-gray-900">
            {imageUrl && (
                <>
                    <img src={imageUrl} className="w-full h-full object-cover opacity-60 blur-md" />
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#F3F4F6] dark:to-gray-950" />
                </>
            )}
            <button onClick={onBack} className="absolute top-6 left-6 p-2 bg-white/50 dark:bg-black/50 backdrop-blur-md rounded-full text-gray-900 dark:text-white hover:bg-white/80 transition-colors">
                <ChevronLeft size={24} />
            </button>
            <button onClick={() => onEdit(person)} className="absolute top-6 right-6 px-4 py-1.5 bg-white/50 dark:bg-black/50 backdrop-blur-md rounded-full text-xs font-bold text-gray-900 dark:text-white hover:bg-white/80 transition-colors">
                Edit
            </button>
        </div>

        {/* Profile Info */}
        <div className="px-6 -mt-12 relative flex-1 overflow-y-auto no-scrollbar pb-24">
            <div className="flex flex-col items-center text-center mb-8">
                <div className="w-24 h-24 rounded-full bg-white dark:bg-gray-800 p-1 shadow-lg mb-3">
                    <div className="w-full h-full rounded-full overflow-hidden bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
                        {imageUrl ? <img src={imageUrl} className="w-full h-full object-cover" /> : <User size={40} className="text-gray-400" />}
                    </div>
                </div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{person.name}</h1>
                <span className="text-sm font-medium text-[var(--accent-600)] dark:text-[var(--accent-400)] bg-[var(--accent-50)] dark:bg-gray-800 px-3 py-1 rounded-full mb-4">{person.relationship}</span>
                
                {person.description && (
                    <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm w-full max-w-sm text-sm text-gray-600 dark:text-gray-300">
                        {person.description}
                    </div>
                )}
            </div>

            {/* Timeline */}
            <div className="max-w-xl mx-auto">
                <div className="flex items-center gap-2 mb-4 text-gray-400 dark:text-gray-500 text-xs font-bold uppercase tracking-wider">
                    <Calendar size={14} />
                    <span>Timeline ({entries.length})</span>
                </div>

                {entries.length === 0 ? (
                    <div className="text-center py-10 text-gray-400 dark:text-gray-600">
                        <p>No entries yet.</p>
                        <p className="text-xs mt-1">Tag @{person.name.split(' ')[0]} in your journal to see them here.</p>
                    </div>
                ) : (
                    entries.map(entry => (
                        <SimpleEntryCard key={entry.id} entry={entry} />
                    ))
                )}
            </div>
        </div>
    </div>
  );
};

// Modal for Adding/Editing
const PersonModal = ({ person, onClose, onSave, onDelete }) => {
  const [formData, setFormData] = useState(person || { name: '', relationship: 'Friend', description: '', image: null });
  const fileRef = useRef(null);
  const previewUrl = useBlobUrl(formData.image);

  const handleImage = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const compressed = await compressImage(file);
        setFormData(p => ({ ...p, image: compressed }));
      } catch (err) { alert('Image too large'); }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4 animate-fadeIn">
      <div className="bg-white dark:bg-gray-950 w-full max-w-md md:rounded-3xl rounded-t-3xl p-6 animate-slideUp border border-gray-100 dark:border-gray-800 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
             <h2 className="text-xl font-bold text-gray-900 dark:text-white">{person ? 'Edit Contact' : 'New Contact'}</h2>
             {person && (
                 <button onClick={() => onDelete(person.id)} className="p-2 bg-red-50 text-red-500 rounded-full hover:bg-red-100 transition-colors">
                     <Trash2 size={18} />
                 </button>
             )}
        </div>
        
        {/* Image Upload */}
        <div className="flex justify-center mb-6">
          <div onClick={() => fileRef.current.click()} className="relative w-28 h-28 rounded-full bg-gray-50 dark:bg-gray-900 flex items-center justify-center cursor-pointer overflow-hidden border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-[var(--accent-500)] group transition-colors">
            {previewUrl ? (
                <img src={previewUrl} className="w-full h-full object-cover" />
            ) : (
                <div className="flex flex-col items-center gap-1 text-gray-400 group-hover:text-[var(--accent-500)]">
                    <Camera size={24} />
                    <span className="text-[10px] font-bold">Add Photo</span>
                </div>
            )}
            <input type="file" ref={fileRef} className="hidden" onChange={handleImage} accept="image/*" />
          </div>
        </div>

        <div className="space-y-4">
          <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 block ml-1">Name</label>
              <input 
                placeholder="e.g. John Doe" 
                className="w-full bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white p-3 rounded-xl border border-transparent focus:border-[var(--accent-500)] focus:outline-none transition-all font-medium"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                autoFocus
              />
          </div>
          
          <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 block ml-1">Relationship</label>
              <select 
                className="w-full bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white p-3 rounded-xl border-r-8 border-transparent focus:border-[var(--accent-500)] focus:outline-none transition-all font-medium"
                value={formData.relationship}
                onChange={e => setFormData({...formData, relationship: e.target.value})}
              >
                <option>Friend</option> 
                <option>Family</option> 
                <option>Partner</option> 
                <option>Colleague</option> 
                <option>Work</option>
                <option>Other</option>
              </select>
          </div>

          <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 block ml-1">Notes & Dates</label>
              <textarea 
                placeholder="Birthday, anniversary, how we met..." 
                className="w-full bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white p-3 rounded-xl border border-transparent focus:border-[var(--accent-500)] focus:outline-none transition-all font-medium min-h-[100px] resize-none"
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
              />
          </div>
        </div>

        <div className="flex gap-3 mt-8">
          <button onClick={onClose} className="flex-1 py-3.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">Cancel</button>
          <button onClick={() => onSave(formData)} className="flex-1 py-3.5 rounded-xl bg-[var(--accent-500)] text-white font-bold shadow-lg shadow-[var(--accent-500)]/30 hover:brightness-110 transition-all">Save Contact</button>
        </div>
      </div>
    </div>
  );
};

export const PeoplePage = ({ navigate }) => {
  const people = useLiveQuery(() => db.people.toArray(), []) || [];
  
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const handleSave = async (data) => {
    if (!data.name.trim()) return alert("Name is required");
    if (data.id) {
        await db.people.put(data);
        // If we edited the currently viewed person, update the view
        if(selectedPerson && selectedPerson.id === data.id) setSelectedPerson(data);
    } else {
        await db.people.add(data);
    }
    setIsCreating(false);
    setIsEditing(false);
  };

  const handleDelete = async (id) => {
     if(window.confirm('Delete this person?')) {
        await db.people.delete(id);
        setIsEditing(false);
        setSelectedPerson(null);
     }
  };

  return (
    <div className="pb-24 animate-slideUp relative">
       {/* List View Header */}
       <div className="px-6 pt-6 pb-2 sticky top-0 bg-[#F3F4F6]/95 dark:bg-gray-950/95 backdrop-blur-md z-20 border-b border-gray-200/50 dark:border-gray-800/50 flex justify-between items-center">
         <div className="flex items-center gap-3">
            <button onClick={() => navigate('more')} className="p-2 -ml-2 text-[var(--accent-500)] rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
                <ChevronLeft size={24} />
            </button>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">People</h1>
         </div>
         <button onClick={() => setIsCreating(true)} className="p-2 bg-[var(--accent-500)] text-white rounded-full shadow-lg hover:brightness-110 transition-all active:scale-90">
           <Plus size={24} />
         </button>
       </div>

       {/* People Grid */}
       <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
         {people.length === 0 ? (
           <div className="col-span-full py-20 text-center flex flex-col items-center">
               <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                    <User size={32} className="text-gray-300 dark:text-gray-600" />
               </div>
               <p className="text-gray-400 dark:text-gray-500 font-medium">No contacts yet.</p>
               <button onClick={() => setIsCreating(true)} className="mt-4 text-[var(--accent-500)] font-bold text-sm">Add your first connection</button>
           </div>
         ) : (
           people.map(p => <PersonCard key={p.id} person={p} onClick={setSelectedPerson} />)
         )}
       </div>

       {/* Profile Detail View (Overlay) */}
       {selectedPerson && !isEditing && (
           <PersonProfile 
             person={selectedPerson} 
             onBack={() => setSelectedPerson(null)} 
             onEdit={() => setIsEditing(true)}
           />
       )}

       {/* Add/Edit Modal */}
       {(isCreating || isEditing) && (
         <PersonModal 
           person={isEditing ? selectedPerson : null} 
           onClose={() => { setIsCreating(false); setIsEditing(false); }}
           onSave={handleSave} 
           onDelete={handleDelete}
         />
       )}
    </div>
  );
};