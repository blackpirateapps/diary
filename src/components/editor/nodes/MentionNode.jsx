import { TextNode, $applyNodeReplacement } from 'lexical';

export class MentionNode extends TextNode {
  __mention;
  __id;
  __src;

  static getType() {
    return 'mention';
  }

  static clone(node) {
    return new MentionNode(
      node.__mention,
      node.__id,
      node.__src,
      node.__text,
      node.__key
    );
  }

  static importJSON(serializedNode) {
    const node = $createMentionNode(
      serializedNode.mention,
      serializedNode.id,
      serializedNode.src
    );

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

    // Style (same as yours)
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

    // Click handler for navigation
    dom.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();

      localStorage.setItem('open_person_id', this.__id);
      window.location.hash = 'people';
    };

    return dom;
  }

  // IMPORTANT: This is what fully fixes the "double backspace" bug.
  // Prevents text insertion inside the mention entity.
  canInsertTextBefore() {
    return false;
  }

  canInsertTextAfter() {
    return false;
  }

  // Makes Lexical treat this as a single text entity
  isTextEntity() {
    return true;
  }
}

export function $createMentionNode(mentionName, id, src) {
  const mentionNode = new MentionNode(mentionName, id, src);

  // FIX: use "token" mode instead of "atomic/directionless/unmergeable"
  // This prevents boundary duplication and backspace bugs.
  mentionNode.setMode('token');

  return $applyNodeReplacement(mentionNode);
}

export function $isMentionNode(node) {
  return node instanceof MentionNode;
}
