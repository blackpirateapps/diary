// PeopleSuggestions.jsx
import React, { useState, useEffect } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useLiveQuery } from 'dexie-react-hooks';
import { $getRoot, $isMentionNode, $createMentionNode } from 'lexical';
import { Sparkles, UserPlus } from 'lucide-react';
import { db } from '../../db'; 
import { findPeopleMatches } from './editorUtils';
import { MentionNode } from './nodes/MentionNode';

const PeopleSuggestions = ({ contentText }) => {
  const [editor] = useLexicalComposerContext();
  const people = useLiveQuery(() => db.people.toArray()) || [];
  const [suggestions, setSuggestions] = useState([]);

  useEffect(() => {
    editor.getEditorState().read(() => {
      const root = $getRoot();
      const textNodes = root.getAllTextNodes();
      const matches = [];
      const uniqueIds = new Set();

      textNodes.forEach(node => {
        // Note: You might need to import $isMentionNode from './nodes/MentionNode' if it's not exported from lexical
        // or check node type string. Assuming helper works:
        if (node.getType() === 'mention') return; 
        
        const text = node.getTextContent();
        const nodeMatches = findPeopleMatches(text, people);
        
        nodeMatches.forEach(m => {
             if (!uniqueIds.has(m.person.id)) {
                 uniqueIds.add(m.person.id);
                 matches.push(m);
             }
        });
      });
      
      setSuggestions(matches);
    });
  }, [contentText, people, editor]);

  const replaceWithMention = (person, matchWord) => {
    editor.update(() => {
        const root = $getRoot();
        const textNodes = root.getAllTextNodes();
        
        for (const node of textNodes) {
            if (node.getType() === 'mention') continue;

            const text = node.getTextContent();
            const regex = new RegExp(`\\b${matchWord}\\b`, 'i');
            const match = regex.exec(text);
            
            if (match) {
                const startOffset = match.index;
                let targetNode = node;
                
                if (startOffset > 0) {
                    targetNode = targetNode.splitText(startOffset)[1];
                }
                if (targetNode) {
                    if (targetNode.getTextContent().length > match[0].length) {
                         targetNode.splitText(match[0].length);
                    }
                    const mentionNode = $createMentionNode(person.name, person.id, null);
                    targetNode.replace(mentionNode);
                }
                break;
            }
        }
    });
  };

  if (suggestions.length === 0) return null;

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-3 shadow-sm mb-6 animate-fadeIn">
        <div className="flex items-center gap-2 mb-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
            <Sparkles size={14} className="text-[var(--accent-500)]" />
            <span>Detected People</span>
        </div>
        <div className="space-y-2">
            {suggestions.map(({ person, matchWord }) => (
                <div key={person.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                    <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-600 overflow-hidden flex-shrink-0">
                             <span className="flex items-center justify-center w-full h-full text-[10px] font-bold">{person.name[0]}</span>
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="text-sm font-bold text-gray-800 dark:text-gray-200 truncate">{person.name}</span>
                            <span className="text-[10px] text-gray-400">Matches "{matchWord}"</span>
                        </div>
                    </div>
                    <button 
                        onClick={() => replaceWithMention(person, matchWord)}
                        className="p-1.5 bg-[var(--accent-50)] text-[var(--accent-600)] rounded-md hover:bg-[var(--accent-100)] transition-colors"
                        title="Convert to Mention"
                    >
                        <UserPlus size={16} />
                    </button>
                </div>
            ))}
        </div>
    </div>
  );
};

export default PeopleSuggestions;