/**
 * Custom hook for keyboard navigation and shortcuts
 * Handles global and context-specific keyboard events
 */

import { useEffect, useRef, useCallback } from 'react';
import {
  SHORTCUTS,
  isTypingContext,
  type ShortcutAction,
} from '@/lib/keyboardShortcuts';

export type ShortcutHandler = () => void;
export type ShortcutHandlers = Partial<Record<ShortcutAction, ShortcutHandler>>;

interface UseKeyboardNavigationOptions {
  /**
   * Handlers for specific shortcut actions
   */
  handlers: ShortcutHandlers;
  /**
   * Whether keyboard shortcuts are enabled
   */
  enabled?: boolean;
}

/**
 * Hook for handling keyboard shortcuts
 * Supports command sequences like 'g i' for multi-key shortcuts
 */
export function useKeyboardNavigation({
  handlers,
  enabled = true,
}: UseKeyboardNavigationOptions) {
  const commandBufferRef = useRef<string>('');
  const commandTimerRef = useRef<number | null>(null);
  /**
   * Clear command buffer after timeout
   */
  const clearCommandBuffer = useCallback(() => {
    commandBufferRef.current = '';
    if (commandTimerRef.current) {
      window.clearTimeout(commandTimerRef.current);
      commandTimerRef.current = null;
    }
  }, []);

  /**
   * Set command buffer timeout
   */
  const setCommandTimeout = useCallback(() => {
    clearCommandBuffer();
    commandTimerRef.current = window.setTimeout(() => {
      clearCommandBuffer();
    }, 1000); // 1 second to complete command sequence
  }, [clearCommandBuffer]);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Skip if user is typing in input/textarea
      if (isTypingContext(event.target)) return;

      // If a dialog is open, ignore all shortcuts except CLOSE_MODAL
      const isDialogOpen =
        !!document.querySelector(
          '[data-slot="dialog-content"][data-state="open"]'
        ) ||
        !!document.querySelector(
          '[data-slot="dialog-overlay"][data-state="open"]'
        ) ||
        !!document.querySelector('[data-slot="dialog-content"]');

      // Skip if modifiers are pressed (except Shift for Shift+key combos)
      const hasModifiers = event.ctrlKey || event.altKey || event.metaKey;

      // Build current key with command buffer
      const currentKey = event.key.toLowerCase();
      const commandSequence = commandBufferRef.current
        ? `${commandBufferRef.current} ${currentKey}`
        : currentKey;

      // Try to match shortcuts
      for (const [action, definition] of Object.entries(SHORTCUTS)) {
        const shortcutAction = action as ShortcutAction;

        if (isDialogOpen && shortcutAction !== 'CLOSE_MODAL') continue;

        // Check if we have a handler for this action
        if (!handlers[shortcutAction]) continue;

        // Check if event matches any of the shortcut keys
        const matched = definition.keys.some((key) => {
          // Handle multi-key sequences (kept for extensibility)
          if (key.includes(' ')) {
            return commandSequence === key;
          }

          // Handle Shift+ combinations
          if (key.startsWith('Shift+')) {
            const baseKey = key.replace('Shift+', '').toLowerCase();
            return event.shiftKey && currentKey === baseKey && !hasModifiers;
          }

          // Handle single keys
          // - Allow Shift for non-letter keys like '?' or 'Enter'
          // - Keep Shift blocked for A-Z shortcuts to avoid accidental triggers
          const isSingleLetter = /^[a-z]$/i.test(key);
          if (isSingleLetter && event.shiftKey) return false;

          return !hasModifiers && currentKey === key.toLowerCase();
        });

        if (matched) {
          event.preventDefault();
          event.stopPropagation();
          clearCommandBuffer();
          handlers[shortcutAction]!();
          return;
        }
      }

      // Check if this could be the start of a command sequence
      const isCommandStart = Object.values(SHORTCUTS).some((def) =>
        def.keys.some((key) => key.startsWith(commandSequence))
      );

      if (isCommandStart && !hasModifiers) {
        commandBufferRef.current = commandSequence;
        setCommandTimeout();
      } else {
        clearCommandBuffer();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearCommandBuffer();
    };
  }, [handlers, enabled, clearCommandBuffer, setCommandTimeout]);

  return {
    clearCommandBuffer,
  };
}
