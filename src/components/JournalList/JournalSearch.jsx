import React, { useState } from 'react';
import { 
  Search, X, Tag, Calendar as CalendarIcon, 
  ChevronDown, Check, Smile, RefreshCcw
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

  // --- DATE HELPERS ---
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
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        label = "This Month";
        break;
      case 'thisYear':
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
        label = now.getFullYear().toString();
        break;
      default:
        return;
    }
    setDateFilter({ start, end, label });
    setOpenDropdown(null);
  };

  return (
    <div className="px-6 md:px-0 pb-2 relative z-[50]">
      {/* 1. SEARCH INPUT (Notion Style: Minimalist) */}
      <div className="relative group mb-4">
        <Search className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[var(--accent-500)] transition-colors" size={18} />
        <input 
          type="text" 
          placeholder="Search memories..." 
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full bg-transparent border-b border-gray-200 dark:border-gray-800 py-2.5 pl-8 pr-10 text-base focus:outline-none focus:border-[var(--accent-500)] transition-all placeholder-gray-400 dark:placeholder-gray-600"
        />
        {searchTerm && (
          <button onClick={() => setSearchTerm('')} className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <X size={16} />
          </button>
        )}
      </div>

      {/* 2. FILTER CHIPS ROW */}
      <div className="flex flex-wrap items-center gap-2 relative">
        <FilterPill 
          label={dateFilter ? dateFilter.label : "Date"} 
          isActive={!!dateFilter} 
          onClick={() => toggleDropdown('date')}
          icon={<CalendarIcon size={14} />}
        />

        <FilterPill 
          label={activeFilters.mood ? activeFilters.mood : "Mood"} 
          isActive={!!activeFilters.mood} 
          onClick={() => toggleDropdown('mood')}
          icon={<Smile size={14} />}
        />

        <FilterPill 
          label={activeFilters.tag ? `#${activeFilters.tag}` : "Tags"} 
          isActive={!!activeFilters.tag} 
          onClick={() => toggleDropdown('tag')}
          icon={<Tag size={14} />}
        />

        {hasActiveFilters && (
          <button 
            onClick={onClear}
            className="flex items-center gap-1.5 px-2 py-1 text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
          >
            <RefreshCcw size={12} /> Reset
          </button>
        )}

        {/* 3. FLOATING DROPDOWNS */}
        <AnimatePresence>
          {openDropdown && (
            <>
              {/* Higher-level invisible backdrop to catch clicks and close menu */}
              <div 
                className="fixed inset-0 z-[60]" 
                onClick={() => setOpenDropdown(null)} 
              />
              
              <motion.div 
                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                className="absolute left-0 top-full mt-2 z-[70] min-w-[220px] bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-800 p-1.5 ring-1 ring-black/5"
              >
                {/* DATE OPTIONS */}
                {openDropdown === 'date' && (
                  <div className="flex flex-col">
                    <div className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Presets</div>
                    {['today', 'thisMonth', 'thisYear'].map(preset => (
                      <DropdownItem 
                        key={preset} 
                        label={preset.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                        onClick={() => applyDatePreset(preset)}
                      />
                    ))}
                  </div>
                )}

                {/* MOOD OPTIONS */}
                {openDropdown === 'mood' && (
                  <div className="flex flex-col">
                    <div className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Select Mood</div>
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

                {/* TAG OPTIONS */}
                {openDropdown === 'tag' && (
                  <div className="flex flex-col max-h-64 overflow-y-auto custom-scrollbar">
                    <div className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Select Tag</div>
                    {uniqueTags.length > 0 ? uniqueTags.map(tag => (
                      <DropdownItem 
                        key={tag} 
                        label={`#${tag}`} 
                        isActive={activeFilters.tag === tag}
                        onClick={() => { toggleFilter('tag', tag); setOpenDropdown(null); }}
                      />
                    )) : (
                      <div className="px-3 py-4 text-xs text-gray-400 italic text-center">No tags used yet</div>
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

// --- NOTION-STYLE SUB-COMPONENTS ---

const FilterPill = ({ label, isActive, onClick, icon }) => (
  <button 
    onClick={onClick}
    className={`
      flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all border
      ${isActive 
        ? 'bg-[var(--accent-50)] text-[var(--accent-600)] border-[var(--accent-200)] dark:bg-gray-800 dark:text-[var(--accent-400)] dark:border-gray-700' 
        : 'bg-white dark:bg-gray-900 text-gray-500 border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800'}
    `}
  >
    {icon}
    <span>{label}</span>
    <ChevronDown size={14} className={`opacity-50 transition-transform ${isActive ? 'rotate-180' : ''}`} />
  </button>
);

const DropdownItem = ({ label, icon, onClick, isActive }) => (
  <button
    onClick={onClick}
    className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors text-left group"
  >
    <div className="flex items-center gap-2.5">
      {icon}
      <span className={isActive ? "font-bold text-[var(--accent-600)]" : ""}>{label}</span>
    </div>
    {isActive && <Check size={14} className="text-[var(--accent-500)]" />}
  </button>
);

export default JournalSearch;