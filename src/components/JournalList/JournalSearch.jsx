import React, { useState, useRef, useEffect } from 'react';
import { 
  Search, X, Tag, Calendar as CalendarIcon, 
  ChevronDown, Check, Smile, RefreshCcw, ArrowRight
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
  const [openDropdown, setOpenDropdown] = useState(null); 
  const [rangeStart, setRangeStart] = useState('');
  const [rangeEnd, setRangeEnd] = useState('');
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const buttonRefs = useRef({});

  const toggleDropdown = (name) => {
    if (openDropdown === name) {
      setOpenDropdown(null);
    } else {
      const button = buttonRefs.current[name];
      if (button) {
        const rect = button.getBoundingClientRect();
        setDropdownPosition({
          top: rect.bottom + window.scrollY + 8,
          left: rect.left + window.scrollX
        });
      }
      setOpenDropdown(name);
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      if (openDropdown) {
        const button = buttonRefs.current[openDropdown];
        if (button) {
          const rect = button.getBoundingClientRect();
          setDropdownPosition({
            top: rect.bottom + window.scrollY + 8,
            left: rect.left + window.scrollX
          });
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [openDropdown]);

  const hasActiveFilters = activeFilters.mood || activeFilters.tag || activeFilters.location || dateFilter;

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
      default: return;
    }
    setDateFilter({ start, end, label });
    setOpenDropdown(null);
  };

  const applyCustomRange = () => {
    if (rangeStart && rangeEnd) {
      const start = new Date(rangeStart);
      start.setHours(0, 0, 0, 0);
      const end = new Date(rangeEnd);
      end.setHours(23, 59, 59, 999);
      const label = `${start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
      setDateFilter({ start, end, label });
      setOpenDropdown(null);
    }
  };

  const handleReset = () => {
    onClear();
    setRangeStart('');
    setRangeEnd('');
  };

  return (
    <>
      <div className="px-6 md:px-0 pb-2">
        {/* 1. SEARCH INPUT */}
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
        <div className="flex flex-wrap items-center gap-2">
          <FilterPill 
            ref={el => buttonRefs.current['date'] = el}
            label={dateFilter ? dateFilter.label : "Date"} 
            isActive={!!dateFilter} 
            onClick={() => toggleDropdown('date')}
            icon={<CalendarIcon size={14} />}
          />
          <FilterPill 
            ref={el => buttonRefs.current['mood'] = el}
            label={activeFilters.mood ? activeFilters.mood : "Mood"} 
            isActive={!!activeFilters.mood} 
            onClick={() => toggleDropdown('mood')}
            icon={<Smile size={14} />}
          />
          <FilterPill 
            ref={el => buttonRefs.current['tag'] = el}
            label={activeFilters.tag ? `#${activeFilters.tag}` : "Tags"} 
            isActive={!!activeFilters.tag} 
            onClick={() => toggleDropdown('tag')}
            icon={<Tag size={14} />}
          />

          {hasActiveFilters && (
            <button 
              onClick={handleReset}
              className="flex items-center gap-1.5 px-2 py-1 text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
            >
              <RefreshCcw size={12} /> Reset
            </button>
          )}
        </div>
      </div>

      {/* 3. FLOATING DROPDOWNS - PORTAL STYLE */}
      <AnimatePresence>
        {openDropdown && (
          <>
            {/* BACKDROP */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9998]" 
              onClick={() => setOpenDropdown(null)} 
            />
            
            {/* DROPDOWN PANEL */}
            <motion.div 
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              style={{
                position: 'absolute',
                top: `${dropdownPosition.top}px`,
                left: `${dropdownPosition.left}px`,
              }}
              className="z-[9999] min-w-[260px] bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-800 p-1.5 ring-1 ring-black/5"
            >
              {openDropdown === 'date' && (
                <div className="flex flex-col gap-1">
                  <div className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Presets</div>
                  {['today', 'thisMonth', 'thisYear'].map(preset => (
                    <DropdownItem 
                      key={preset} 
                      label={preset.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                      onClick={() => applyDatePreset(preset)}
                    />
                  ))}
                  <div className="h-px bg-gray-100 dark:bg-gray-800 my-1" />
                  <div className="px-3 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Custom Range</div>
                  <div className="px-2 pb-2 pt-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <input 
                        type="date" 
                        value={rangeStart}
                        onChange={(e) => setRangeStart(e.target.value)}
                        className="flex-1 bg-gray-50 dark:bg-gray-800 border-none rounded-lg text-xs p-2 text-gray-700 dark:text-gray-200 focus:ring-1 focus:ring-[var(--accent-500)]"
                      />
                      <ArrowRight size={12} className="text-gray-400" />
                      <input 
                        type="date" 
                        value={rangeEnd}
                        onChange={(e) => setRangeEnd(e.target.value)}
                        className="flex-1 bg-gray-50 dark:bg-gray-800 border-none rounded-lg text-xs p-2 text-gray-700 dark:text-gray-200 focus:ring-1 focus:ring-[var(--accent-500)]"
                      />
                    </div>
                    <button 
                      onClick={applyCustomRange}
                      disabled={!rangeStart || !rangeEnd}
                      className="w-full bg-[var(--accent-500)] hover:bg-[var(--accent-600)] disabled:opacity-50 text-white text-xs font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <Check size={14} /> Apply Range
                    </button>
                  </div>
                </div>
              )}

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
    </>
  );
};

// --- SUB-COMPONENTS ---
const FilterPill = React.forwardRef(({ label, isActive, onClick, icon }, ref) => (
  <button 
    ref={ref}
    onClick={onClick}
    className={`
      flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all border
      ${isActive 
        ? 'bg-[var(--accent-50)] text-[var(--accent-600)] border-[var(--accent-200)] dark:bg-gray-800 dark:text-[var(--accent-400)] dark:border-gray-700 shadow-sm' 
        : 'bg-white dark:bg-gray-900 text-gray-500 border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800'}
    `}
  >
    {icon}
    <span className="max-w-[120px] truncate">{label}</span>
    <ChevronDown size={14} className={`opacity-50 transition-transform ${isActive ? 'rotate-180' : ''}`} />
  </button>
));

const DropdownItem = ({ label, icon, onClick, isActive }) => (
  <button
    onClick={onClick}
    className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors text-left"
  >
    <div className="flex items-center gap-2.5">
      {icon}
      <span className={isActive ? "font-bold text-[var(--accent-600)]" : ""}>{label}</span>
    </div>
    {isActive && <Check size={14} className="text-[var(--accent-500)]" />}
  </button>
);

export default JournalSearch;
