import { StrictMode } from 'react';
import { startArenaAmbience } from './services/arenaAmbience';
import { createRoot } from 'react-dom/client';
import './i18n';
import './index.css';
import App from './App';
import { startRoundResultReporter } from './services/roundResultReporter';
import { restoreMatchSnapshot } from './store/matchSnapshot';

// STRICT: Browser speechSynthesis is permanently disabled to eliminate all "chị Google" voices.
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  try {
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak = () => {};
  } catch {
    // Ignore any browser security restrictions
  }
}

// Suppress Three.js core deprecation warning triggered internally by @react-three/fiber
const originalConsoleWarn = console.warn;
console.warn = (...args: unknown[]) => {
  if (
    typeof args[0] === 'string' &&
    args[0].includes('THREE.Clock: This module has been deprecated')
  ) {
    return;
  }
  originalConsoleWarn.apply(console, args);
};

// Before the first render: every component (intro card, caster, HUD) must start from the restored
// round. Restoring in an effect ran after the children's effects, so the intro card kept round 1.
restoreMatchSnapshot();
startRoundResultReporter();
startArenaAmbience();

const rootElement = document.getElementById('root');

if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}

