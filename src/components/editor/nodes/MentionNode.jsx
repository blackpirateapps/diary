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
    
    // --- STYLING ---
    // Base Pill Style
    dom.style.backgroundColor = 'var(--accent-100)'; 
    dom.style.color = 'var(--accent-700)';
    dom.style.padding = '1px 8px 1px 2px'; // Right padding for balance
    dom.style.borderRadius = '12px'; // Pill shape
    dom.style.display = 'inline-flex';
    dom.style.alignItems = 'center';
    dom.style.fontWeight = '600';
    dom.style.fontSize = '0.9em';
    dom.style.lineHeight = '1.4';
    dom.style.border = '1px solid var(--accent-200)';
    dom.style.verticalAlign = 'baseline';
    dom.style.margin = '0 2px';
    dom.style.cursor = 'pointer'; // Clickable cursor
    dom.style.transition = 'all 0.15s ease';
    dom.style.userSelect = 'none'; // Prevent text selection inside chip
    dom.style.whiteSpace = 'nowrap';

    // Interactive Hover Effects (via JS since we are inline)
    dom.onmouseenter = () => {
      dom.style.backgroundColor = 'var(--accent-200)';
      dom.style.borderColor = 'var(--accent-300)';
      dom.style.transform = 'translateY(-1px)';
    };
    dom.onmouseleave = () => {
      dom.style.backgroundColor = 'var(--accent-100)';
      dom.style.borderColor = 'var(--accent-200)';
      dom.style.transform = 'none';
    };

    // --- IMAGE HANDLING ---
    if (this.__src && typeof this.__src === 'string') {
        // Use padding + background image to simulate an avatar inside the text node
        dom.style.paddingLeft = '22px'; // Space for image
        dom.style.backgroundImage = `url(${this.__src})`;
        dom.style.backgroundSize = '18px 18px'; // Size of avatar
        dom.style.backgroundRepeat = 'no-repeat';
        dom.style.backgroundPosition = '2px center'; // Positioned left
        // Circular mask for the background image isn't perfect in CSS without a real element, 
        // but typically square avatars are uploaded. If we need circles:
        // We can't easily border-radius ONLY the background image in one div. 
        // However, standard avatars usually look fine small.
    } else {
        // Fallback icon style (optional, simple dot)
        dom.style.paddingLeft = '8px';
    }
    
    dom.className = 'mention-node'; 

    // --- CLICK NAVIGATION ---
    dom.onclick = (e) => {
        // Prevent editor from stealing focus immediately or other weird behaviors
        e.preventDefault();
        e.stopPropagation();
        
        // 1. Save the target person ID to local storage so PeoplePage knows who to open
        localStorage.setItem('open_person_id', this.__id);
        
        // 2. Navigate to the People Page
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
  mentionNode.setMode('segmented').toggleDirectionless();
  return $applyNodeReplacement(mentionNode);
}

export function $isMentionNode(node) {
  return node instanceof MentionNode;
}