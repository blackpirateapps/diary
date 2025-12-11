import React from 'react';
import { DecoratorNode } from 'lexical';
import { Clock } from 'lucide-react';

// The React Component for the Divider
const SessionDividerComponent = ({ startTime, duration }) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '12px 0',
        margin: '16px 0',
        borderTop: '2px solid #e5e7eb',
        color: '#6b7280',
        fontSize: '0.875rem',
        fontWeight: '500',
      }}
    >
      <Clock size={14} />
      <span>
        {new Date(startTime).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })}
      </span>
      <span>• {duration}</span>
    </div>
  );
};

export class SessionDividerNode extends DecoratorNode {
  __startTime;
  __duration;

  static getType() {
    return 'session-divider';
  }

  static clone(node) {
    return new SessionDividerNode(node.__startTime, node.__duration, node.__key);
  }

  constructor(startTime, duration, key) {
    super(key);
    this.__startTime = startTime;
    this.__duration = duration;
  }

  createDOM() {
    const div = document.createElement('div');
    div.style.userSelect = 'none';
    return div;
  }

  updateDOM() {
    return false;
  }

  decorate() {
    return (
      <SessionDividerComponent
        startTime={this.__startTime}
        duration={this.__duration}
      />
    );
  }

  static importJSON(serializedNode) {
    return $createSessionDividerNode(
      serializedNode.startTime,
      serializedNode.duration
    );
  }

  exportJSON() {
    return {
      startTime: this.__startTime,
      duration: this.__duration,
      type: 'session-divider',
      version: 1,
    };
  }

  isInline() {
    return false;
  }

  isIsolated() {
    return true;
  }
}

export function $createSessionDividerNode(startTime, duration) {
  return new SessionDividerNode(startTime, duration);
}

export function $isSessionDividerNode(node) {
  return node instanceof SessionDividerNode;
}