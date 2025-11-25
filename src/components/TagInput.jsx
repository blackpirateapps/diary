import React, { useState, useRef, useEffect } from 'react';
import { Plus, X } from 'lucide-react';

const TagInput = ({ tags, onAdd, onRemove }) => {
  const [input, setInput] = useState('');
  const [isInputVisible, setIsInputVisible] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isInputVisible && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isInputVisible]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && input.trim()) {
      e.preventDefault();
      onAdd(input.trim());
      setInput('');
      setIsInputVisible(false);
    }
    if (e.key === 'Escape') {
      setIsInputVisible(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {tags.map((tag, i) => (
        <span
          key={i}
          className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-600 border border-blue-100"
        >
          #{tag}
          <button onClick={() => onRemove(tag)} className="ml-1 hover:text-blue-800">
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
          onBlur={() => { if (!input) setIsInputVisible(false); }}
          placeholder="New tag..."
          className="w-24 px-2 py-1 bg-gray-50 border-none rounded-full text-xs focus:ring-2 focus:ring-blue-500/20 placeholder-gray-400"
        />
      ) : (
        <button
          onClick={() => setIsInputVisible(true)}
          className="p-1 text-gray-400 hover:bg-gray-100 rounded-full transition-colors"
        >
          <Plus size={16} />
        </button>
      )}
    </div>
  );
};

export default TagInput;
