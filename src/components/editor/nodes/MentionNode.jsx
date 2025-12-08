import React from 'react';
import {
  DecoratorNode,
  $applyNodeReplacement,
  $isNodeSelection,
  RangeSelection,
} from 'lexical';

/**
 * MentionNode implemented as a DecoratorNode.
 * DecoratorNode gives us a true atomic behaviour in the editor DOM and React rendering,
 * which prevents selection/backspace glitches that can happen with TextNode-based mentions.
 */

export class MentionNode extends DecoratorNode {
  __mention;
  __id;
  __src;

  static getType() {
    return 'mention';
  }

  static clone(node) {
    return new MentionNode(node.__mention, node.__id, node.__src, node.__key);
  }

  constructor(mentionName, id = null, src = null, key) {
    super(key);
    this.__mention = mentionName;
    this.__id = id;
    this.__src = src;
  }

  // Export a simple JSON representation
  exportJSON() {
    return {
      type: 'mention',
      version: 1,
      mention: this.__mention,
      id: this.__id,
      src: this.__src,
    };
  }

  // Import from serialized JSON
  static importJSON(serializedNode) {
    return $createMentionNode(
      serializedNode.mention,
      serializedNode.id,
      serializedNode.src
    );
  }

  // DecoratorNode: mark as inline so it flows with text
  isInline() {
    return true;
  }

  // We don't need to update DOM because React handles it via decorate()
  updateDOM() {
    return false;
  }

  /**
   * The decorate() method returns a React element that will be mounted in the editor.
   * Keep the element minimal and make sure it doesn't steal focus/selection in a way
   * that would confuse Lexical.
   */
  decorate() {
    const mention = this.__mention ?? '';
    const id = this.__id;

    // Click handler: prevent default focus/selection change and do navigation
    const onClick = (e) => {
      e.preventDefault();
      e.stopPropagation();

      // Save selected person id and navigate via hash (you can adjust this)
      if (id !== null && id !== undefined) {
        try {
          localStorage.setItem('open_person_id', String(id));
        } catch (err) {
          // ignore localStorage errors
        }
      }
      window.location.hash = 'people';
    };

    // Render a span with styling similar to your original
    return (
      <span
        role="button"
        tabIndex={-1} // not tabbable to avoid stealing keyboard focus
        onClick={onClick}
        className="mention-node"
        style={{
          backgroundColor: 'transparent',
          border: 'none',
          borderRadius: 0,
          padding: 0,
          color: 'var(--accent-600)',
          fontWeight: 600,
          display: 'inline-block',
          cursor: 'pointer',
          textDecoration: 'none',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.textDecoration = 'underline';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.textDecoration = 'none';
        }}
      >
        {mention}
      </span>
    );
  }
}

/**
 * Helper to create and insert a MentionNode.
 * Use $applyNodeReplacement to insert this node in place of the active node.
 */
export function $createMentionNode(mentionName, id = null, src = null) {
  const node = new MentionNode(mentionName, id, src);
  // Return the node replacement (call site should apply it inside an editor update)
  return $applyNodeReplacement(node);
}

export function $isMentionNode(node) {
  return node instanceof MentionNode;
}
