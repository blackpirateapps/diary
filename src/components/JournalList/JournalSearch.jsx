import React, { useState, useRef } from 'react';
import { 
  Search, X, Tag, Calendar as CalendarIcon, 
  ChevronDown, Check, Smile, MapPin, ListFilter
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { MOODS } from './constants';

const JournalSearch = ({
  searchTerm,
  setSearchTerm,
  activeFilters,
  toggleFilter,
  uniqueTags,
  dateFilter,
  setDateFilter,
  onClear
}) => {
  const [openDropdown, setOpenDropdown] = useState(null); // 'mood', 'tag', 'date'

  const toggleDropdown = (name) => {
    setOpenDropdown(openDropdown === name ? null : name);
  };

  const hasActiveFilters = activeFilters.mood || activeFilters.tag || activeFilters.location || dateFilter;

  // Helper for Date Presets
  const applyDatePreset = (preset) => {
    const now = new Date();
    let start, end, label;
    switch (preset) {
      case 'today':
        start = new Date(now.setHours(0,0,0,0));
        end = new Date(now.setHours(23,59,59,999));
        label = "Today";
        break;
      case 'thisMonth':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        label = "This Month";
        break;
      case 'thisYear':
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear(), 11, 31);
        label = now.getFullYear().toString();
        break;
      default: return;
    }
    setDateFilter({ start, end, label });
    setOpenDropdown(null);
  };

  return (
    <div className="space-y-3">
      {/* SEARCH BAR ROW */}
      <div className="relative group">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[var(--accent-500)] transition-colors" size={18} />
        <input 
          type="text" 
          placeholder="Search memories..." 
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full bg-transparent border-b border-gray-200 dark:border-gray-800 py-3 pl-10 pr-10 text-base focus:outline-none focus:border-[var(--accent-500)] transition-all placeholder-gray-400"
        />
        {searchTerm && (
          <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <X size={16} />
          </button>
        )}
      </div>

      {/* FILTER CHIPS ROW */}
      <div className="flex flex-wrap items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        
        {/* Date Filter Chip */}
        <FilterPill 
          label={dateFilter ? dateFilter.label : "Date"} 
          isActive={!!dateFilter} 
          onClick={() => toggleDropdown('date')}
          icon={<CalendarIcon size={14} />}
        />

        {/* Mood Filter Chip */}
        <FilterPill 
          label={activeFilters.mood ? activeFilters.mood : "Mood"} 
          isActive={!!activeFilters.mood} 
          onClick={() => toggleDropdown('mood')}
          icon={<Smile size={14} />}
        />

        {/* Tags Filter Chip */}
        <FilterPill 
          label={activeFilters.tag ? `#${activeFilters.tag}` : "Tags"} 
          isActive={!!activeFilters.tag} 
          onClick={() => toggleDropdown('tag')}
          icon={<Tag size={14} />}
        />

        {hasActiveFilters && (
          <button 
            onClick={onClear}
            className="text-xs font-medium text-gray-400 hover:text-red-500 px-2 py-1 transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      {/* DROPDOWN POPOVERS */}
      <div className="relative">
        <AnimatePresence>
          {openDropdown && (
            <>
              {/* Backdrop to close */}
              <div className="fixed inset-0 z-40" onClick={() => setOpenDropdown(null)} />
              
              <motion.div 
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                className="absolute left-0 top-0 z-50 min-w-[220px] bg-white dark:bg-gray-900 rounded-lg shadow-xl border border-gray-100 dark:border-gray-800 p-1.5"
              >
                {openDropdown === 'date' && (
                  <div className="flex flex-col">
                    {['today', 'thisMonth', 'thisYear'].map(preset => (
                      <DropdownItem 
                        key={preset} 
                        label={preset.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                        onClick={() => applyDatePreset(preset)}
                      />
                    ))}
                  </div>
                )}

                {openDropdown === 'mood' && (
                  <div className="flex flex-col">
                    {MOODS.map(m => (
                      <DropdownItem 
                        key={m.value} 
                        label={m.label} 
                        icon={<m.icon size={14} className={m.color} />}
                        isActive={activeFilters.mood === m.value}
                        onClick={() => { toggleFilter('mood', m.value); setOpenDropdown(null); }}
                      />
                    ))}
                  </div>
                )}

                {openDropdown === 'tag' && (
                  <div className="flex flex-col max-h-60 overflow-y-auto">
                    {uniqueTags.length > 0 ? uniqueTags.map(tag => (
                      <DropdownItem 
                        key={tag} 
                        label={`#${tag}`} 
                        isActive={activeFilters.tag === tag}
                        onClick={() => { toggleFilter('tag', tag); setOpenDropdown(null); }}
                      />
                    )) : (
                      <div className="p-3 text-xs text-gray-400 italic text-center">No tags found</div>
                    )}
                  </div>
                )}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// --- SUB-COMPONENTS FOR NOTION LOOK ---

const FilterPill = ({ label, isActive, onClick, icon }) => (
  <button 
    onClick={onClick}
    className={`
      flex items-center gap-1.5 px-3 py-1 rounded-md text-sm font-medium transition-all
      ${isActive 
        ? 'bg-[var(--accent-50)] text-[var(--accent-600)] dark:bg-gray-800 dark:text-[var(--accent-400)]' 
        : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'}
    `}
  >
    {icon}
    <span>{label}</span>
    <ChevronDown size={12} className={`transition-transform ${isActive ? 'rotate-180' : ''}`} />
  </button>
);

const DropdownItem = ({ label, icon, onClick, isActive }) => (
  <button
    onClick={onClick}
    className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-md transition-colors text-left"
  >
    <div className="flex items-center gap-2">
      {icon}
      <span>{label}</span>
    </div>
    {isActive && <Check size={14} className="text-[var(--accent-500)]" />}
  </button>
);

export default JournalSearch;