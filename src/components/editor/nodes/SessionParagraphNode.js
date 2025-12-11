import { ParagraphNode } from 'lexical';

export class SessionParagraphNode extends ParagraphNode {
  static getType() {
    return 'session-paragraph';
  }

  static clone(node) {
    return new SessionParagraphNode(node.__sessionId, node.__key);
  }

  constructor(sessionId, key) {
    super(key);
    this.__sessionId = sessionId;
  }

  // View
  createDOM(config) {
    const dom = super.createDOM(config);
    if (this.__sessionId !== undefined) {
      dom.dataset.sessionId = this.__sessionId;
    }
    return dom;
  }

  updateDOM(prevNode, dom, config) {
    const isUpdated = super.updateDOM(prevNode, dom, config);
    if (prevNode.__sessionId !== this.__sessionId) {
      dom.dataset.sessionId = this.__sessionId;
      return true;
    }
    return isUpdated;
  }

  // JSON Serialization for saving/loading
  static importJSON(serializedNode) {
    const node = $createSessionParagraphNode(serializedNode.sessionId);
    node.setFormat(serializedNode.format);
    node.setIndent(serializedNode.indent);
    node.setDirection(serializedNode.direction);
    return node;
  }

  exportJSON() {
    return {
      ...super.exportJSON(),
      sessionId: this.__sessionId,
      type: 'session-paragraph',
      version: 1,
    };
  }

  getSessionId() {
    return this.__sessionId;
  }

  setSessionId(sessionId) {
    const self = this.getWritable();
    self.__sessionId = sessionId;
  }
}

export function $createSessionParagraphNode(sessionId) {
  return new SessionParagraphNode(sessionId);
}

export function $isSessionParagraphNode(node) {
  return node instanceof SessionParagraphNode;
}