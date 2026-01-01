import React, { useState } from 'react';
import { Search, X, Tag, Calendar as CalendarIcon, ChevronDown, Check, Smile, RefreshCcw, ArrowRight } from 'lucide-react';
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

  const toggleDropdown = (name) => {
    setOpenDropdown(openDropdown === name ? null : name);
  };

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
      default:
        return;
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
    <div className="mb-4 space-y-3">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search journal entries..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Filter Row */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Mood Filter */}
        <div className="relative z-50">
          <button
            onClick={() => toggleDropdown('mood')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${
              activeFilters.mood
                ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
            }`}
          >
            <Smile className="w-3.5 h-3.5" />
            <span>Mood</span>
            {activeFilters.mood && (
              <span className="ml-1 px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs">
                {activeFilters.mood}
              </span>
            )}
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${openDropdown === 'mood' ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {openDropdown === 'mood' && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.15 }}
                className="absolute top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-50"
              >
                <div className="max-h-64 overflow-y-auto">
                  {MOODS.map((mood) => (
                    <button
                      key={mood.label}
                      onClick={() => {
                        toggleFilter('mood', mood.label);
                        setOpenDropdown(null);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 transition-colors text-left"
                    >
                      <span className="text-lg">{mood.emoji}</span>
                      <span className="text-sm text-gray-700">{mood.label}</span>
                      {activeFilters.mood === mood.label && <Check className="w-4 h-4 ml-auto text-indigo-600" />}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Tag Filter */}
        <div className="relative z-50">
          <button
            onClick={() => toggleDropdown('tag')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${
              activeFilters.tag
                ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Tag</span>
            {activeFilters.tag && (
              <span className="ml-1 px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs">
                {activeFilters.tag}
              </span>
            )}
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${openDropdown === 'tag' ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {openDropdown === 'tag' && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.15 }}
                className="absolute top-full mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-50"
              >
                {uniqueTags.length > 0 ? (
                  <div className="max-h-64 overflow-y-auto">
                    {uniqueTags.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => {
                          toggleFilter('tag', tag);
                          setOpenDropdown(null);
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-50 transition-colors text-left"
                      >
                        <span className="text-sm text-gray-700">#{tag}</span>
                        {activeFilters.tag === tag && <Check className="w-4 h-4 text-indigo-600" />}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="px-3 py-4 text-sm text-gray-400 text-center">
                    No tags available
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Date Filter */}
        <div className="relative z-50">
          <button
            onClick={() => toggleDropdown('date')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${
              dateFilter
                ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
            }`}
          >
            <CalendarIcon className="w-3.5 h-3.5" />
            <span>Date</span>
            {dateFilter && (
              <span className="ml-1 px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs">
                {dateFilter.label}
              </span>
            )}
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${openDropdown === 'date' ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {openDropdown === 'date' && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.15 }}
                className="absolute top-full mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-50"
              >
                <div className="p-3 space-y-2">
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Quick Select</div>
                  <button
                    onClick={() => applyDatePreset('today')}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded transition-colors"
                  >
                    Today
                  </button>
                  <button
                    onClick={() => applyDatePreset('thisMonth')}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded transition-colors"
                  >
                    This Month
                  </button>
                  <button
                    onClick={() => applyDatePreset('thisYear')}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded transition-colors"
                  >
                    This Year
                  </button>
                  
                  <div className="border-t border-gray-200 pt-2 mt-2">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Custom Range</div>
                    <div className="space-y-2">
                      <input
                        type="date"
                        value={rangeStart}
                        onChange={(e) => setRangeStart(e.target.value)}
                        className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <div className="flex items-center justify-center">
                        <ArrowRight className="w-3 h-3 text-gray-400" />
                      </div>
                      <input
                        type="date"
                        value={rangeEnd}
                        onChange={(e) => setRangeEnd(e.target.value)}
                        className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <button
                        onClick={applyCustomRange}
                        disabled={!rangeStart || !rangeEnd}
                        className="w-full px-3 py-1.5 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                      >
                        Apply Range
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all ml-auto"
          >
            <RefreshCcw className="w-3.5 h-3.5" />
            <span>Clear</span>
          </motion.button>
        )}
      </div>
    </div>
  );
};

export default JournalSearch;
