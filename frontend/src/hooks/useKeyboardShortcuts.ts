import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { notifyShortcut } from '../utils/notifications';

interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean; // Command key on Mac
  action: () => void;
  description: string;
  global?: boolean; // Can be triggered from any input field
}

/**
 * Keyboard shortcuts hook for power users
 * Inspired by Linear's keyboard-first approach
 */
export const useKeyboardShortcuts = (shortcuts?: ShortcutConfig[]) => {
  const navigate = useNavigate();

  // Default global shortcuts
  const defaultShortcuts: ShortcutConfig[] = [
    {
      key: 'd',
      ctrl: true,
      description: 'Go to Dashboard',
      action: () => {
        navigate('/dashboard');
        notifyShortcut('Dashboard', 'Ctrl+D');
      },
    },
    {
      key: 'g',
      ctrl: true,
      description: 'Go to Workflow Graph',
      action: () => {
        navigate('/workflow-graph');
        notifyShortcut('Workflow Graph', 'Ctrl+G');
      },
    },
    {
      key: 's',
      ctrl: true,
      shift: true,
      description: 'Go to Settings',
      action: () => {
        navigate('/settings');
        notifyShortcut('Settings', 'Ctrl+Shift+S');
      },
    },
    {
      key: 'k',
      ctrl: true,
      description: 'Quick Search (Command Palette)',
      action: () => {
        // TODO: Implement command palette
        notifyShortcut('Quick Search', 'Ctrl+K');
      },
    },
    {
      key: '/',
      ctrl: true,
      description: 'Show Keyboard Shortcuts',
      action: () => {
        showShortcutsHelp();
      },
    },
    {
      key: 'Escape',
      description: 'Close Modal/Clear Search',
      action: () => {
        // Clear any active search or close modals
        const searchInputs = document.querySelectorAll('input[type="text"], input[type="search"]');
        searchInputs.forEach((input) => {
          if (input instanceof HTMLInputElement) {
            input.value = '';
            input.blur();
          }
        });
      },
      global: true,
    },
  ];

  const allShortcuts = [...defaultShortcuts, ...(shortcuts || [])];

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Don't trigger shortcuts when typing in input fields (unless global)
    const target = event.target as HTMLElement;
    const isInputField = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);

    for (const shortcut of allShortcuts) {
      // Skip if we're in an input field and shortcut is not global
      if (isInputField && !shortcut.global) continue;

      // Guard against undefined key (can happen with some browser extensions or special events)
      if (!event.key || !shortcut.key) continue;
      const matchesKey = event.key.toLowerCase() === shortcut.key.toLowerCase();
      const matchesCtrl = shortcut.ctrl ? event.ctrlKey || event.metaKey : !event.ctrlKey && !event.metaKey;
      const matchesShift = shortcut.shift ? event.shiftKey : !event.shiftKey;
      const matchesAlt = shortcut.alt ? event.altKey : !event.altKey;

      if (matchesKey && matchesCtrl && matchesShift && matchesAlt) {
        event.preventDefault();
        shortcut.action();
        break;
      }
    }
  }, [allShortcuts]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  return allShortcuts;
};

// Helper to show shortcuts help modal
const showShortcutsHelp = () => {
  const shortcuts = [
    { keys: 'Ctrl+D', action: 'Go to Dashboard' },
    { keys: 'Ctrl+G', action: 'Go to Workflow Graph' },
    { keys: 'Ctrl+Shift+S', action: 'Go to Settings' },
    { keys: 'Ctrl+K', action: 'Quick Search (Coming Soon)' },
    { keys: 'Ctrl+/', action: 'Show This Help' },
    { keys: 'Escape', action: 'Clear Search / Close Modal' },
    { keys: '?', action: 'Show Keyboard Shortcuts' },
  ];

  // Create a simple modal
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: white;
    padding: 32px;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.3);
    z-index: 10000;
    max-width: 500px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto;
  `;

  modal.innerHTML = `
    <h2 style="margin-top: 0; font-size: 24px; font-weight: 600;">⌨️ Keyboard Shortcuts</h2>
    <div style="margin-top: 24px;">
      ${shortcuts.map(s => `
        <div style="display: flex; justify-content: space-between; margin-bottom: 16px; align-items: center;">
          <span style="color: #595959;">${s.action}</span>
          <kbd style="
            background: #f0f0f0;
            padding: 4px 8px;
            border-radius: 4px;
            font-family: monospace;
            font-size: 12px;
            font-weight: 600;
            border: 1px solid #d9d9d9;
          ">${s.keys}</kbd>
        </div>
      `).join('')}
    </div>
    <button id="closeShortcutsModal" style="
      margin-top: 24px;
      padding: 10px 24px;
      background: #667eea;
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      width: 100%;
    ">Got it</button>
  `;

  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.5);
    z-index: 9999;
  `;

  document.body.appendChild(overlay);
  document.body.appendChild(modal);

  const closeModal = () => {
    document.body.removeChild(modal);
    document.body.removeChild(overlay);
  };

  modal.querySelector('#closeShortcutsModal')?.addEventListener('click', closeModal);
  overlay.addEventListener('click', closeModal);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  }, { once: true });
};

export default useKeyboardShortcuts;
