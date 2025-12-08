// MentionNode.jsx
import {
  TextNode,
  $applyNodeReplacement,
} from 'lexical';

// Keep the exported helpers since BackspaceFixPlugin imports $isMentionNode
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
    // Preserve text content as fallback
    const node = $createMentionNode(serializedNode.mention, serializedNode.id, serializedNode.src);
    node.setTextContent(serializedNode.text);
    node.setFormat(serializedNode.format);
    node.setDetail(serializedNode.detail);
    node.setMode(serializedNode.mode);
    node.setStyle(serializedNode.style);
    return node;
  }

  constructor(mentionName, id, src, text, key) {
    // default text is the mention label
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

    // Ensure the mention renders as an inline atomic-ish span visually.
    // We do NOT make it contentEditable=false at the DOM level because it is a text node;
    // instead we keep styling and click behavior. The BackspaceFixPlugin will guard deletion.
    dom.style.backgroundColor = 'transparent';
    dom.style.border = 'none';
    dom.style.borderRadius = '0';
    dom.style.padding = '0';
    dom.style.color = 'var(--accent-600)';
    dom.style.fontWeight = '600';
    dom.style.display = 'inline-block';
    dom.style.cursor = 'pointer';
    dom.style.textDecoration = 'none';

    dom.onmouseenter = () => {
      dom.style.textDecoration = 'underline';
    };
    dom.onmouseleave = () => {
      dom.style.textDecoration = 'none';
    };

    dom.className = 'mention-node';

    dom.onclick = (e) => {
      // Stop propagation so clicks do not move the caret unexpectedly on some IMEs
      e.preventDefault();
      e.stopPropagation();

      try {
        localStorage.setItem('open_person_id', this.__id);
      } catch (err) {
        // ignore storage errors
      }
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
  // Keep it as a TextNode with the mention text content so it integrates with formatting and selection.
  // Do not attempt to force 'atomic' mode here — handle deletion behavior at plugin layer (more reliable across IMEs).
  return $applyNodeReplacement(mentionNode);
}

export function $isMentionNode(node) {
  return node instanceof MentionNode;
}
