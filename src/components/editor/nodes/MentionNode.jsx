import { TextNode, $applyNodeReplacement } from 'lexical';

export class MentionNode extends TextNode {
  __mention;
  __id;
  __src;

  static getType() {
    return 'mention';
  }

  static clone(node) {
    return new MentionNode(node.__mention, node.__id, node.__src, node.__text, node.__key);
  }

  static importJSON(serializedNode) {
    const node = $createMentionNode(serializedNode.mention, serializedNode.id, serializedNode.src);
    node.setTextContent(serializedNode.text);
    node.setFormat(serializedNode.format);
    node.setDetail(serializedNode.detail);
    node.setMode(serializedNode.mode);
    node.setStyle(serializedNode.style);
    return node;
  }

  constructor(mentionName, id, src, text, key) {
    super(text ?? mentionName, key);
    this.__mention = mentionName;
    this.__id = id;
    this.__src = src;
  }

  exportJSON() {
    return {
      ...super.exportJSON(),
      mention: this.__mention,
      id: this.__id,
      src: this.__src,
      type: 'mention',
      version: 1,
    };
  }

  createDOM(config) {
    const dom = super.createDOM(config);
    
    // --- STYLING: MINIMAL TEXT ONLY ---
    dom.style.backgroundColor = 'transparent';
    dom.style.border = 'none';
    dom.style.borderRadius = '0';
    dom.style.padding = '0';
    
    // Text Appearance
    dom.style.color = 'var(--accent-600)'; // Just the accent color
    dom.style.fontWeight = '600';
    dom.style.display = 'inline-block'; // Keeps it atomic
    dom.style.cursor = 'pointer';
    dom.style.textDecoration = 'none';

    // Hover Effect
    dom.onmouseenter = () => {
      dom.style.textDecoration = 'underline';
    };
    dom.onmouseleave = () => {
      dom.style.textDecoration = 'none';
    };
    
    dom.className = 'mention-node'; 

    // --- NAVIGATION CLICK HANDLER ---
    dom.onclick = (e) => {
        // Prevent editor cursor shifts or focus stealing if needed
        e.preventDefault(); 
        e.stopPropagation();
        
        // 1. Save target ID for PeoplePage to read
        localStorage.setItem('open_person_id', this.__id);
        
        // 2. Trigger Navigation via Hash
        window.location.hash = 'people';
    };

    return dom;
  }

  isTextEntity() {
    return true;
  }
}

export function $createMentionNode(mentionName, id, src) {
  const mentionNode = new MentionNode(mentionName, id, src);
  // FIX: Change to 'atomic' mode. Combined with toggleDirectionless and toggleUnmergeable, this 
  // should fully treat the node as a single, atomic character, correcting the backspace issue.
  mentionNode.setMode('atomic').toggleDirectionless().toggleUnmergeable();
  return $applyNodeReplacement(mentionNode);
}

export function $isMentionNode(node) {
  return node instanceof MentionNode;
}