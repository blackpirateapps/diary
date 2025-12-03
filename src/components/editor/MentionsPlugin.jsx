import React, { useState, useEffect, useCallback } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { LexicalTypeaheadMenuPlugin } from '@lexical/react/LexicalTypeaheadMenuPlugin';
import { $createMentionNode } from './nodes/MentionNode';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, useBlobUrl } from '../../db'; 
import { User } from 'lucide-react';

// Helper to render the circular image in the list
const MentionMenuItem = ({ index, isSelected, onClick, onMouseEnter, option }) => {
  const imageUrl = useBlobUrl(option.picture);
  
  return (
    <li
      key={option.key}
      tabIndex={-1}
      className={`cursor-pointer px-3 py-2 flex items-center gap-3 text-sm transition-colors border-b border-gray-50 dark:border-gray-800 last:border-0 ${
        isSelected ? 'bg-[var(--accent-50)] dark:bg-gray-700' : 'bg-white dark:bg-gray-800'
      }`}
      ref={option.setRefElement}
      role="option"
      aria-selected={isSelected}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
    >
      <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-100 flex-shrink-0 flex items-center justify-center border border-gray-200 dark:border-gray-700">
        {imageUrl ? (
          <img src={imageUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <User size={14} className="text-gray-400" />
        )}
      </div>
      <div className="flex flex-col">
        <span className="font-bold text-gray-900 dark:text-gray-100 leading-none">{option.name}</span>
        <span className="text-[10px] text-gray-400 uppercase tracking-wide mt-1">{option.relationship}</span>
      </div>
    </li>
  );
};

export default function MentionsPlugin() {
  const [editor] = useLexicalComposerContext();
  const [queryString, setQueryString] = useState(null);
  
  // 1. Live Query to get people
  const people = useLiveQuery(() => db.people.toArray()) || [];

  // 2. Filter logic
  const options = people
    .filter((person) => {
      if (!queryString) return true;
      return person.name.toLowerCase().includes(queryString.toLowerCase());
    })
    .map((person) => ({
      ...person,
      key: person.id,
      picture: person.image
    }));

  // 3. Selection Handler
  const onSelectOption = useCallback(
    (selectedOption, nodeToReplace, closeMenu) => {
      editor.update(() => {
        // We need a URL string for the node style (blobs don't work well inside TextNode styling directly without URL.createObjectUrl)
        // Since we can't easily hook useBlobUrl inside the Node class efficiently, we might need to rely on base64 
        // OR simpler: just pass the name and ID, and handle the image rendering via a DecoratorNode if we wanted full React.
        // For this "TextNode" version, we will omit the image inside the editor pill if it's a blob, or try to read it.
        // To keep it robust: We will just render the name in the pill for now, or handle blob conversion before creation.
        
        const mentionNode = $createMentionNode(
          selectedOption.name,
          selectedOption.id,
          null // Passing null src for now to avoid complex async blob logic inside synchronous editor update
        );
        
        if (nodeToReplace) {
          nodeToReplace.replace(mentionNode);
        }
        
        mentionNode.select();
        closeMenu();
      });
    },
    [editor]
  );

  return (
    <LexicalTypeaheadMenuPlugin
      onQueryChange={setQueryString}
      onSelectOption={onSelectOption}
      triggerFn={(text) => {
        const match = text.match(/@(\w*)$/); 
        if (match === null) return null;
        return {
          leadOffset: match.index + match[0].length,
          matchingString: match[1],
          replaceableString: match[0],
        };
      }}
      options={options}
      menuRenderFn={(
        anchorElementRef,
        { selectedIndex, selectOptionAndCleanUp, setHighlightedIndex }
      ) => {
        if (anchorElementRef.current && options.length === 0) return null;

        return anchorElementRef.current && options.length > 0 ? (
          <div className="fixed z-50 w-60 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden max-h-60 overflow-y-auto animate-fadeIn mt-1">
            <ul>
              {options.map((option, i) => (
                <MentionMenuItem
                  key={option.key}
                  index={i}
                  isSelected={selectedIndex === i}
                  onClick={() => {
                    setHighlightedIndex(i);
                    selectOptionAndCleanUp(option);
                  }}
                  onMouseEnter={() => setHighlightedIndex(i)}
                  option={option}
                />
              ))}
            </ul>
          </div>
        ) : null;
      }}
    />
  );
}