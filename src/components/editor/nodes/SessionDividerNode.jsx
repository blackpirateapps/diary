import React from 'react';
import { DecoratorNode } from 'lexical';
import { Clock } from 'lucide-react';

// The React Component for the Divider
const SessionDividerComponent = ({ startTime, duration }) => {
  return (
    <div className="flex items-center gap-3 py-6 select-none" contentEditable={false}>
      <div className="h-px bg-gray-200 dark:bg-gray-800 flex-1" />
      <div className="flex items-center gap-2 text-[10px] font-medium text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-gray-900 px-3 py-1 rounded-full border border-gray-100 dark:border-gray-800">
        <Clock size={12} className="text-[var(--accent-500)]" />
        <span>{startTime}</span>
        <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-700" />
        <span>{duration}</span>
      </div>
      <div className="h-px bg-gray-200 dark:bg-gray-800 flex-1" />
    </div>
  );
};

export class SessionDividerNode extends DecoratorNode {
  static getType() {
    return 'session-divider';
  }

  static clone(node) {
    return new SessionDividerNode(node.__startTime, node.__duration, node.__sessionId, node.__key);
  }

  constructor(startTime, duration, sessionId, key) {
    super(key);
    this.__startTime = startTime;
    this.__duration = duration;
    this.__sessionId = sessionId;
  }

  createDOM() {
    return document.createElement('div');
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

  exportJSON() {
    return {
      type: 'session-divider',
      startTime: this.__startTime,
      duration: this.__duration,
      sessionId: this.__sessionId,
      version: 1,
    };
  }

  static importJSON(serializedNode) {
    return $createSessionDividerNode(
      serializedNode.startTime,
      serializedNode.duration,
      serializedNode.sessionId
    );
  }
}

export function $createSessionDividerNode(startTime, duration, sessionId) {
  return new SessionDividerNode(startTime, duration, sessionId);
}

export function $isSessionDividerNode(node) {
  return node instanceof SessionDividerNode;
}