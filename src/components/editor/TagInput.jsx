import React, { useState, useRef, useEffect } from 'react';
import { Plus, X } from 'lucide-react';

const TagInput = ({ tags = [], onChange }) => {
  const [input, setInput] = useState('');
  const [isInputVisible, setIsInputVisible] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isInputVisible && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isInputVisible]);

  const commitTag = () => {
    const trimmed = input.trim();
    // Only add if it's not empty and not a duplicate
    if (trimmed && !tags.includes(trimmed)) {
      const newTags = [...tags, trimmed];
      onChange(newTags); // Pass the updated array back to parent
      setInput('');
    } else if (trimmed === '') {
      setIsInputVisible(false);
      setInput('');
    }
    
    // If duplicate, clear input and close
    if (tags.includes(trimmed)) {
        setInput('');
        setIsInputVisible(false);
    }
  };

  const removeTag = (tagToRemove) => {
    const newTags = tags.filter(tag => tag !== tagToRemove);
    onChange(newTags);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitTag();
      // Keep focus to add multiple tags quickly
      inputRef.current?.focus(); 
    }
    if (e.key === 'Escape') {
      setIsInputVisible(false);
      setInput('');
    }
  };

  const handleBlur = () => {
    commitTag();
    setIsInputVisible(false);
  };

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {tags.map((tag, i) => (
        <span
          key={`${tag}-${i}`}
          className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-600 border border-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800"
        >
          #{tag}
          <button 
            onClick={() => removeTag(tag)} 
            className="ml-1 hover:text-blue-800 dark:hover:text-blue-100 p-0.5 rounded-full hover:bg-blue-100 dark:hover:bg-blue-800 transition-colors"
            type="button"
          >
            <X size={12} />
          </button>
        </span>
      ))}
      
      {isInputVisible ? (
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder="New tag..."
          className="w-24 px-3 py-1 bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-700 rounded-full text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-gray-700 dark:text-gray-200 placeholder-gray-400"
        />
      ) : (
        <button
          onClick={() => setIsInputVisible(true)}
          className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200 rounded-full transition-colors border border-transparent hover:border-gray-200 dark:hover:border-gray-700"
          type="button"
        >
          <Plus size={14} />
          <span>Add Tag</span>
        </button>
      )}
    </div>
  );
};

export default TagInput;