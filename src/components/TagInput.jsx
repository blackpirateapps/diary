import React, { useState, useRef, useEffect } from 'react';
import { Plus, X } from 'lucide-react';

const TagInput = ({ tags = [], onAdd, onRemove }) => {
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
    // Only add if not empty AND not a duplicate
    if (trimmed && !tags.includes(trimmed)) {
      onAdd(trimmed);
      setInput('');
    } else if (trimmed === '') {
      // If empty, just close the input
      setIsInputVisible(false);
      setInput('');
    }
    // If it was a duplicate, we keep the input open so user can fix it, 
    // or you could choose to close it. Here we reset input to avoid confusion.
    if (tags.includes(trimmed)) {
      setInput(''); 
      setIsInputVisible(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitTag();
      // Keep input visible for typing multiple tags quickly? 
      // Usually better to hide or clear. Let's keep it focused for rapid entry:
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
          className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-600 border border-blue-100"
        >
          #{tag}
          <button 
            onClick={() => onRemove(tag)} 
            className="ml-1 hover:text-blue-800 p-0.5 rounded-full hover:bg-blue-100 transition-colors"
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
          className="w-24 px-3 py-1 bg-white border border-blue-200 rounded-full text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-gray-700 placeholder-gray-400"
        />
      ) : (
        <button
          onClick={() => setIsInputVisible(true)}
          className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 hover:text-gray-700 rounded-full transition-colors border border-transparent hover:border-gray-200"
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