import { useEffect } from 'react';
import { SFX_EVENT, SFX_SOCKET_EVENT, SfxEventName } from '../constants/sfx';
import { gameSocket } from '../services/socket';
import { soundManager } from '../services/soundManager';
import { useAudioStore } from '../store/audioStore';

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
    useAudioStore.getState().initStaticSounds();
    if (eventNames) {
      soundManager.preload(eventNames);
    }
  }, [eventNames]);
};

/**
 * Plays a static sound via `useAudioStore` whenever a mapped Socket.io event arrives.
 * Mount once (e.g. in `AudioController`).
 */
export const useSocketSoundEffects = (
  bindings: SocketSfxBindings = DEFAULT_SOCKET_SFX_BINDINGS
): void => {
  useEffect(() => {
    const unsubscribers = Object.entries(bindings).map(([socketEventName, binding]) =>
      gameSocket.onEvent(socketEventName, (payload) => {
        const soundName = resolveBinding(binding, payload);
        if (soundName) {
          useAudioStore.getState().playStatic(soundName);
        }
      })
    );
    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [bindings]);
};
