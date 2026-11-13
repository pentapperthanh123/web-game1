import { useEffect } from 'react';
import { SFX_EVENT, SFX_SOCKET_EVENT, SfxEventName } from '../constants/sfx';
import { gameSocket } from '../services/socket';
import { soundManager, playSound } from '../services/soundManager';

/** Static sound, or a resolver that picks one from the payload (null = stay silent). */
export type SocketSfxBinding = SfxEventName | ((payload: unknown) => SfxEventName | null);

export type SocketSfxBindings = Readonly<Record<string, SocketSfxBinding>>;

export const DEFAULT_SOCKET_SFX_BINDINGS: SocketSfxBindings = {
  [SFX_SOCKET_EVENT.CHAT]: SFX_EVENT.CHAT_POP,
};

const resolveBinding = (binding: SocketSfxBinding, payload: unknown): SfxEventName | null =>
  typeof binding === 'function' ? binding(payload) : binding;

/** Downloads the given sounds (all by default) once the component mounts. */
export const useSoundPreload = (eventNames?: readonly SfxEventName[]): void => {
  useEffect(() => {
    soundManager.preload(eventNames);
  }, [eventNames]);
};

/**
 * Plays a sound whenever a mapped Socket.io event arrives. Mount once (e.g. in App).
 * Pass a stable (module-level or memoized) bindings object to avoid re-subscribing.
 */
export const useSocketSoundEffects = (
  bindings: SocketSfxBindings = DEFAULT_SOCKET_SFX_BINDINGS
): void => {
  useEffect(() => {
    const unsubscribers = Object.entries(bindings).map(([socketEventName, binding]) =>
      gameSocket.onEvent(socketEventName, (payload) => {
        const soundName = resolveBinding(binding, payload);
        if (soundName) playSound(soundName);
      })
    );
    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [bindings]);
};
