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
    // STYLING THE PILL
    dom.style.backgroundColor = 'var(--accent-50)'; // Uses theme variable
    dom.style.color = 'var(--accent-600)';
    dom.style.padding = '2px 8px 2px 4px';
    dom.style.borderRadius = '9999px';
    dom.style.display = 'inline-flex';
    dom.style.alignItems = 'center';
    dom.style.gap = '6px';
    dom.style.fontWeight = '600';
    dom.style.fontSize = '0.9em';
    dom.style.border = '1px solid var(--accent-200)';
    dom.style.verticalAlign = 'middle';
    dom.style.margin = '0 2px';
    
    // Add an image element if we have a source
    // Since createDOM returns the text node wrapper, we can use a background image 
    // or pseudo-elements, but simplest in Lexical is usually just styling the wrapper.
    // For advanced React rendering, we'd use a DecoratorNode, but TextNode is lighter.
    
    // Let's use a small trick: text-indent or padding-left with background image
    if (this.__src && typeof this.__src === 'string') {
        dom.style.paddingLeft = '24px';
        dom.style.backgroundImage = `url(${this.__src})`;
        dom.style.backgroundSize = '18px 18px';
        dom.style.backgroundRepeat = 'no-repeat';
        dom.style.backgroundPosition = '4px center';
        dom.style.borderRadius = '12px'; // slightly more rounded to match circle
    }
    
    dom.className = 'mention-node'; 
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