import JGO from './JGO/index.js';

// Export for UMD builds (will be global in browser)
if (typeof window !== 'undefined') {
  window.JGO = JGO;
}

// Also export as default for ESM usage
export default JGO;

// Re-export named exports for tree-shaking
export * from './JGO/index.js';
