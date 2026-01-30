import React, { useCallback, useEffect, useState, useRef } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  SELECTION_CHANGE_COMMAND,
  FORMAT_TEXT_COMMAND,
  FORMAT_ELEMENT_COMMAND,
  $getSelection,
  $isRangeSelection,
  $createParagraphNode,
  $createTextNode,
  $getNodeByKey,
  UNDO_COMMAND,
  REDO_COMMAND,
  CAN_UNDO_COMMAND,
  CAN_REDO_COMMAND,
} from 'lexical';
import { $wrapNodes } from '@lexical/selection';
import {
  $createHeadingNode,
  $createQuoteNode,
  $isHeadingNode,
} from '@lexical/rich-text';
import {
  $isListNode,
  ListNode,
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  REMOVE_LIST_COMMAND,
} from '@lexical/list';
import { $isLinkNode, TOGGLE_LINK_COMMAND } from '@lexical/link';
import { $isCodeNode, CODE_LANGUAGE_MAP } from '@lexical/code';
import { mergeRegister } from '@lexical/utils';
import {
  Bold, Italic, Underline, Strikethrough, Code, 
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, CheckSquare, Quote, 
  Undo, Redo, Link as LinkIcon, Image as ImageIcon, 
  Type, ChevronDown, Minus, Plus
} from 'lucide-react';

const FONT_FAMILY_OPTIONS = [
  { label: 'Sans Serif', value: 'Inter, system-ui, sans-serif' },
  { label: 'Serif', value: 'Georgia, serif' },
  { label: 'Mono', value: 'Menlo, monospace' },
];

const FONT_SIZE_OPTIONS = ['10px', '12px', '14px', '16px', '18px', '20px', '24px', '30px'];

const BLOCK_TYPES = {
  paragraph: { label: 'Normal', icon: Type },
  h1: { label: 'Heading 1', icon: Type },
  h2: { label: 'Heading 2', icon: Type },
  h3: { label: 'Heading 3', icon: Type },
  quote: { label: 'Quote', icon: Quote },
  ul: { label: 'Bulleted List', icon: List },
  ol: { label: 'Numbered List', icon: ListOrdered },
  code: { label: 'Code Block', icon: Code },
};

// Added flex-shrink-0 to prevent divider from vanishing
const Divider = () => <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1 self-center flex-shrink-0" />;

export default function ToolbarPlugin({ onInsertImage }) {
  const [editor] = useLexicalComposerContext();
  const [activeBlock, setActiveBlock] = useState('paragraph');
  const [selectedFont, setSelectedFont] = useState('Sans Serif');
  const [selectedFontSize, setSelectedFontSize] = useState('16px');
  const [isLink, setIsLink] = useState(false);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isStrikethrough, setIsStrikethrough] = useState(false);
  const [isCode, setIsCode] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [isBlockOpen, setIsBlockOpen] = useState(false);
  const blockMenuRef = useRef(null);

  const updateToolbar = useCallback(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      const anchorNode = selection.anchor.getNode();
      const element = anchorNode.getKey() === 'root' 
        ? anchorNode 
        : anchorNode.getTopLevelElementOrThrow();
      const elementKey = element.getKey();
      const elementDOM = editor.getElementByKey(elementKey);

      // Update Text Formats
      setIsBold(selection.hasFormat('bold'));
      setIsItalic(selection.hasFormat('italic'));
      setIsUnderline(selection.hasFormat('underline'));
      setIsStrikethrough(selection.hasFormat('strikethrough'));
      setIsCode(selection.hasFormat('code'));
      
      // Update Links
      const node = selection.anchor.getNode();
      const parent = node.getParent();
      if ($isLinkNode(parent) || $isLinkNode(node)) {
        setIsLink(true);
      } else {
        setIsLink(false);
      }

      // Update Block Type
      if (elementDOM !== null) {
        if ($isListNode(element)) {
          const parentList = $getNodeByKey(elementKey);
          const type = parentList ? parentList.getTag() : element.getTag();
          setActiveBlock(type === 'ul' ? 'ul' : 'ol');
        } else {
          const type = $isHeadingNode(element) 
            ? element.getTag() 
            : element.getType();
          
          if (type in BLOCK_TYPES) {
            setActiveBlock(type);
          } else {
            setActiveBlock('paragraph');
          }
        }
      }
    }
  }, [editor]);

  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => {
          updateToolbar();
        });
      }),
      editor.registerCommand(SELECTION_CHANGE_COMMAND, () => {
        updateToolbar();
        return false;
      }, 1),
      editor.registerCommand(CAN_UNDO_COMMAND, (payload) => {
        setCanUndo(payload);
        return false;
      }, 1),
      editor.registerCommand(CAN_REDO_COMMAND, (payload) => {
        setCanRedo(payload);
        return false;
      }, 1)
    );
  }, [editor, updateToolbar]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!blockMenuRef.current) return;
      if (!blockMenuRef.current.contains(event.target)) {
        setIsBlockOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const insertLink = useCallback(() => {
    if (!isLink) {
      const url = prompt('Enter the URL:', 'https://');
      if (url) {
        editor.dispatchCommand(TOGGLE_LINK_COMMAND, url);
      }
    } else {
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
    }
  }, [editor, isLink]);

  const setFontFamily = (family) => {
    setSelectedFont(family);
    document.execCommand('fontName', false, family); 
  };

  const setFontSize = (size) => {
    setSelectedFontSize(size);
    // Placeholder for font size logic
  };

  const formatBlock = (type) => {
    if (activeBlock === type) return;

    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        $wrapNodes(selection, () => $createParagraphNode());
      }
    });

    switch (type) {
      case 'h1':
        editor.update(() => { const selection = $getSelection(); if ($isRangeSelection(selection)) { $wrapNodes(selection, () => $createHeadingNode('h1')); } });
        break;
      case 'h2':
        editor.update(() => { const selection = $getSelection(); if ($isRangeSelection(selection)) { $wrapNodes(selection, () => $createHeadingNode('h2')); } });
        break;
      case 'h3':
        editor.update(() => { const selection = $getSelection(); if ($isRangeSelection(selection)) { $wrapNodes(selection, () => $createHeadingNode('h3')); } });
        break;
      case 'quote':
        editor.update(() => { const selection = $getSelection(); if ($isRangeSelection(selection)) { $wrapNodes(selection, () => $createQuoteNode()); } });
        break;
      case 'ul':
        editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND);
        break;
      case 'ol':
        editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND);
        break;
      case 'paragraph':
        editor.update(() => {
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
                $wrapNodes(selection, () => $createParagraphNode());
            }
        });
        break;
      default:
        break;
    }
  };

  return (
    // FIX: Changed flex-wrap to flex-nowrap and added overflow-x-auto, no-scrollbar
    // This ensures buttons are all accessible by scrolling left/right on mobile without taking up vertical space
    <div className="flex items-center gap-1 p-2 border-b border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-950/95 backdrop-blur-sm sticky top-0 z-20 flex-nowrap overflow-x-auto no-scrollbar w-full">
      
      {/* HISTORY - Added flex-shrink-0 */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <button disabled={!canUndo} onClick={() => editor.dispatchCommand(UNDO_COMMAND)} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30">
            <Undo size={18} />
        </button>
        <button disabled={!canRedo} onClick={() => editor.dispatchCommand(REDO_COMMAND)} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30">
            <Redo size={18} />
        </button>
      </div>

      <Divider />

      {/* BLOCK FORMATTING - Added flex-shrink-0 */}
      <div ref={blockMenuRef} className="relative flex-shrink-0">
        <button
          onClick={() => setIsBlockOpen((open) => !open)}
          className="flex items-center gap-1 px-2 py-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-sm font-medium w-32 justify-between"
        >
          <span className="truncate">{BLOCK_TYPES[activeBlock]?.label || 'Normal'}</span>
          <ChevronDown size={14} className="opacity-50" />
        </button>
        <div className={`${isBlockOpen ? 'block' : 'hidden'} absolute top-full left-0 mt-1 w-40 bg-white dark:bg-gray-900 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 max-h-60 overflow-y-auto`}>
          {Object.entries(BLOCK_TYPES).map(([key, { label, icon: Icon }]) => (
            <button
              key={key}
              onClick={() => {
                formatBlock(key);
                setIsBlockOpen(false);
              }}
              className={`flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-800 ${activeBlock === key ? 'text-[var(--accent-600)] bg-[var(--accent-50)]' : ''}`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>
      </div>

      <Divider />

      {/* TEXT FORMATTING - Added flex-shrink-0 */}
      <div className="flex items-center gap-0.5 flex-shrink-0">
        <button onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold')} className={`p-1.5 rounded ${isBold ? 'bg-[var(--accent-100)] text-[var(--accent-700)]' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
          <Bold size={18} />
        </button>
        <button onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic')} className={`p-1.5 rounded ${isItalic ? 'bg-[var(--accent-100)] text-[var(--accent-700)]' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
          <Italic size={18} />
        </button>
        <button onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline')} className={`p-1.5 rounded ${isUnderline ? 'bg-[var(--accent-100)] text-[var(--accent-700)]' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
          <Underline size={18} />
        </button>
        <button onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'strikethrough')} className={`p-1.5 rounded ${isStrikethrough ? 'bg-[var(--accent-100)] text-[var(--accent-700)]' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
          <Strikethrough size={18} />
        </button>
        <button onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'code')} className={`p-1.5 rounded ${isCode ? 'bg-[var(--accent-100)] text-[var(--accent-700)]' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
          <Code size={18} />
        </button>
        <button onClick={insertLink} className={`p-1.5 rounded ${isLink ? 'bg-[var(--accent-100)] text-[var(--accent-700)]' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
          <LinkIcon size={18} />
        </button>
      </div>

      <Divider />

      {/* ALIGNMENT - Added flex-shrink-0 */}
      <div className="flex items-center gap-0.5 flex-shrink-0">
        <button onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'left')} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
          <AlignLeft size={18} />
        </button>
        <button onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'center')} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
          <AlignCenter size={18} />
        </button>
        <button onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'right')} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
          <AlignRight size={18} />
        </button>
      </div>

      <Divider />

      {/* INSERT ACTIONS - Added flex-shrink-0 */}
      <div className="flex items-center gap-0.5 flex-shrink-0">
        <button onClick={onInsertImage} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800" title="Insert Image">
          <ImageIcon size={18} />
        </button>
        <button 
          onClick={() => {
             editor.update(() => {
               const selection = $getSelection();
               if($isRangeSelection(selection)) {
                 const p = $createParagraphNode();
                 const line = $createParagraphNode();
                 line.append($createTextNode('---'));
                 p.append(line);
                 selection.insertNodes([p]);
               }
             })
          }} 
          className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 font-mono font-bold text-xs" 
          title="Horizontal Rule"
        >
          —
        </button>
      </div>

    </div>
  );
}
