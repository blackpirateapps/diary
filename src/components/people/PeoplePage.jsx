// components/people/PeoplePage.jsx
import React, { useState } from 'react';
import { Plus, ChevronLeft, User } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';

import PersonCard from './PersonCard';
import PersonProfile from './PersonProfile';
import PersonModal from './PersonModal';

const FILTER_TYPES = ['All', 'Friend', 'Family', 'Partner', 'Work', 'Other'];

export const PeoplePage = ({ navigate, onEdit }) => {
  const people = useLiveQuery(() => db.people.toArray(), []) || [];
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [filter, setFilter] = useState('All');

  const filteredPeople = people.filter(p => filter === 'All' || p.relationship === filter);

  const handleSave = async (data) => {
    if (!data.name.trim()) return alert("Name is required");
    data.id ? await db.people.put(data) : await db.people.add(data);
    setIsCreating(false);
    setIsEditing(false);
    if (selectedPerson) setSelectedPerson(data);
  };

  return (
    <div className="pb-24 animate-slideUp relative">
       {/* Header & Filters */}
       <div className="sticky top-0 bg-[#F3F4F6]/95 dark:bg-gray-950/95 backdrop-blur-md z-20 pt-6 pb-4 px-6 border-b border-gray-200 dark:border-gray-800">
         <div className="flex justify-between items-center mb-4">
           <div className="flex items-center gap-3">
             <button onClick={() => navigate('more')} className="text-[var(--accent-500)]"><ChevronLeft size={24} /></button>
             <h1 className="text-2xl font-bold dark:text-white">People</h1>
           </div>
           <button onClick={() => setIsCreating(true)} className="p-2.5 bg-[var(--accent-500)] text-white rounded-full shadow-lg"><Plus size={22} /></button>
         </div>
         <div className="flex gap-2 overflow-x-auto no-scrollbar">
           {FILTER_TYPES.map(f => (
             <button key={f} onClick={() => setFilter(f)} className={`px-4 py-1.5 rounded-full text-xs font-bold ${filter === f ? 'bg-[var(--accent-500)] text-white' : 'bg-white dark:bg-gray-800 text-gray-500'}`}>
               {f}
             </button>
           ))}
         </div>
       </div>

       {/* List */}
       <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
         {filteredPeople.map(p => <PersonCard key={p.id} person={p} onClick={setSelectedPerson} />)}
       </div>

       {/* Sub-Views */}
       {selectedPerson && !isEditing && (
         <PersonProfile person={selectedPerson} onBack={() => setSelectedPerson(null)} onEditEntry={onEdit} onEditProfile={() => setIsEditing(true)} />
       )}

       {(isCreating || isEditing) && (
         <PersonModal person={isEditing ? selectedPerson : null} onClose={() => { setIsCreating(false); setIsEditing(false); }} onSave={handleSave} onDelete={(id) => db.people.delete(id)} />
       )}
    </div>
  );
};