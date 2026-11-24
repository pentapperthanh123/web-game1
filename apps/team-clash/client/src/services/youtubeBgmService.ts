import {
  AUDIO_FILE_URL_REGEX,
  DEFAULT_BGM_SOURCE,
  YOUTUBE_VIDEO_ID_REGEX,
} from '../../../shared/constants/clashConfig';

export interface YouTubePlayerInstance {
  playVideo: () => void;
  pauseVideo: () => void;
  stopVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead?: boolean) => void;
  setVolume: (volume: number) => void;
  getVolume: () => number;
  mute: () => void;
  unMute: () => void;
  isMuted: () => boolean;
  getPlayerState: () => number;
  destroy: () => void;
}

export interface YouTubePlayerOptions {
  videoId: string;
  width?: number | string;
  height?: number | string;
  playerVars?: {
    autoplay?: 0 | 1;
    controls?: 0 | 1;
    loop?: 0 | 1;
    playlist?: string;
    disablekb?: 0 | 1;
    fs?: 0 | 1;
    rel?: 0 | 1;
    modestbranding?: 0 | 1;
    playsinline?: 0 | 1;
    origin?: string;
    enablejsapi?: 0 | 1;
    mute?: 0 | 1;
  };
  events?: {
    onReady?: (event: { target: YouTubePlayerInstance }) => void;
    onStateChange?: (event: { data: number; target: YouTubePlayerInstance }) => void;
    onError?: (event: { data: number; target: YouTubePlayerInstance }) => void;
  };
}

export interface YouTubeNamespace {
  Player: new (elementId: string | HTMLElement, options: YouTubePlayerOptions) => YouTubePlayerInstance;
  PlayerState: {
    UNSTARTED: number;
    ENDED: number;
    PLAYING: number;
    PAUSED: number;
    BUFFERING: number;
    CUED: number;
  };
}

declare global {
  interface Window {
    YT?: YouTubeNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }

  interface ImportMetaEnv {
    readonly VITE_YOUTUBE_BGM_URL?: string;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

const CONTAINER_ID = 'team-clash-yt-bgm-container';
const TARGET_ID = 'team-clash-yt-bgm-target';
const YOUTUBE_IFRAME_API_URL = 'https://www.youtube.com/iframe_api';

export function extractYouTubeVideoId(url: string | undefined): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim().replace(/^["']|["']$/g, '');
  if (!trimmed) return null;

  // Direct 11-char YouTube ID (e.g. "n8X9_MgEdqc")
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  const match = trimmed.match(YOUTUBE_VIDEO_ID_REGEX);
  if (!match || !match[1]) return null;
  return match[1];
}

export function extractAudioFileUrl(url: string | undefined): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim().replace(/^["']|["']$/g, '');
  return AUDIO_FILE_URL_REGEX.test(trimmed) ? trimmed : null;
}

/**
 * Background music player. Plays a local/direct audio file (default: client/public/audio/bgm.mp3)
 * through an <audio> element, or a YouTube link through a hidden iframe player.
 */
export class YouTubeBgmService {
  private player: YouTubePlayerInstance | null = null;
  private currentVideoId: string | null = null;
  private localAudio: HTMLAudioElement | null = null;
  private localAudioUrl: string | null = null;
  private isApiReady = false;
  private isPlayerReady = false;
  private isUnlocked = false;
  private shouldPlayOnReady = false;
  private desiredVolume = 65; // 0 to 100
  private isMuted = false;
  private hasErrored = false;
  private fallbackCallbacks: Array<() => void> = [];
  private playSuccessCallbacks: Array<() => void> = [];

  constructor() {
    const envUrl =
      (import.meta.env.VITE_YOUTUBE_BGM_URL as string | undefined) || DEFAULT_BGM_SOURCE;
    this.localAudioUrl = extractAudioFileUrl(envUrl);
    this.currentVideoId = this.localAudioUrl ? null : extractYouTubeVideoId(envUrl);
    if (typeof window !== 'undefined') {
      setTimeout(() => this.init(), 100);
    }
  }

  public init(): void {
    if (typeof window === 'undefined') return;
    if (this.localAudioUrl) {
      this.ensureLocalAudio();
      return;
    }
    if (!this.currentVideoId) return;

    this.ensureContainer();
    this.loadYouTubeApi();
  }

  private ensureLocalAudio(): HTMLAudioElement | null {
    if (!this.localAudioUrl || typeof Audio === 'undefined') return null;
    if (this.localAudio) return this.localAudio;

    const audio = new Audio(this.localAudioUrl);
    audio.loop = true;
    audio.preload = 'auto';
    audio.volume = this.desiredVolume / 100;
    audio.muted = this.isMuted;
    audio.addEventListener('ended', () => {
      audio.currentTime = 0;
      audio.play().catch(() => {});
    });
    audio.addEventListener('error', () => {
      console.warn('[Bgm] Local audio failed to load:', this.localAudioUrl);
      this.triggerFallback();
    });
    this.localAudio = audio;
    return audio;
  }

  private playLocalAudio(): void {
    const audio = this.ensureLocalAudio();
    if (!audio) return;
    audio.play().then(
      () => this.playSuccessCallbacks.forEach((cb) => cb()),
      (err: unknown) => {
        // NotAllowedError = autoplay blocked until first user gesture; unlock() retries later.
        if (err instanceof DOMException && err.name === 'NotAllowedError') return;
        console.warn('[Bgm] Local audio play error:', err);
        this.triggerFallback();
      }
    );
  }

  private releaseLocalAudio(): void {
    if (!this.localAudio) return;
    this.localAudio.pause();
    this.localAudio.removeAttribute('src');
    this.localAudio.load();
    this.localAudio = null;
  }

  public onPlaySuccess(cb: () => void): () => void {
    this.playSuccessCallbacks.push(cb);
    return () => {
      this.playSuccessCallbacks = this.playSuccessCallbacks.filter((fn) => fn !== cb);
    };
  }

  public onFallback(cb: () => void): () => void {
    this.fallbackCallbacks.push(cb);
    return () => {
      this.fallbackCallbacks = this.fallbackCallbacks.filter((fn) => fn !== cb);
    };
  }

  private triggerFallback(): void {
    this.hasErrored = true;
    this.fallbackCallbacks.forEach((cb) => cb());
  }

  public hasValidSource(): boolean {
    return Boolean(this.currentVideoId || this.localAudioUrl) && !this.hasErrored;
  }

  public getVideoId(): string | null {
    return this.currentVideoId;
  }

  public setCustomUrl(url: string | undefined): void {
    const nextAudioUrl = extractAudioFileUrl(url);
    const nextVideoId = nextAudioUrl ? null : extractYouTubeVideoId(url);
    if (nextVideoId === this.currentVideoId && nextAudioUrl === this.localAudioUrl) return;

    this.pause();
    this.releaseLocalAudio();
    this.currentVideoId = nextVideoId;
    this.localAudioUrl = nextAudioUrl;
    this.hasErrored = false;

    if (nextAudioUrl) {
      this.ensureLocalAudio();
      return;
    }

    if (!nextVideoId) {
      this.triggerFallback();
      return;
    }

    if (this.isPlayerReady && this.player) {
      try {
        this.player.destroy();
        this.player = null;
        this.isPlayerReady = false;
      } catch {
        // Destroy cleanup
      }
    }

    this.ensureContainer();
    this.loadYouTubeApi();
  }

  private ensureContainer(): void {
    if (typeof document === 'undefined') return;

    let container = document.getElementById(CONTAINER_ID);
    if (!container) {
      container = document.createElement('div');
      container.id = CONTAINER_ID;
      container.style.position = 'fixed';
      container.style.bottom = '0px';
      container.style.right = '0px';
      container.style.width = '240px';
      container.style.height = '180px';
      container.style.opacity = '0.05';
      container.style.pointerEvents = 'none';
      container.style.zIndex = '1';
      document.body.appendChild(container);
    }

    let target = document.getElementById(TARGET_ID);
    if (!target) {
      target = document.createElement('div');
      target.id = TARGET_ID;
      container.appendChild(target);
    }
  }

  private loadYouTubeApi(): void {
    if (window.YT && window.YT.Player) {
      this.isApiReady = true;
      this.createPlayer();
      return;
    }

    const existingScript = document.querySelector(`script[src="${YOUTUBE_IFRAME_API_URL}"]`);
    if (!existingScript) {
      const script = document.createElement('script');
      script.src = YOUTUBE_IFRAME_API_URL;
      script.async = true;
      document.head.appendChild(script);
    }

    const previousCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof previousCallback === 'function') {
        previousCallback();
      }
      this.isApiReady = true;
      this.createPlayer();
    };
  }

  private createPlayer(): void {
    if (!this.isApiReady || !window.YT || !this.currentVideoId) return;

    try {
      this.player = new window.YT.Player(TARGET_ID, {
        videoId: this.currentVideoId,
        width: 240,
        height: 180,
        playerVars: {
          autoplay: 1,
          controls: 0,
          disablekb: 1,
          fs: 0,
          rel: 0,
          loop: 1,
          playlist: this.currentVideoId,
          modestbranding: 1,
          playsinline: 1,
          enablejsapi: 1,
          origin: typeof window !== 'undefined' ? window.location.origin : undefined,
        },
        events: {
          onReady: (event) => {
            this.isPlayerReady = true;
            this.syncPlayerSettings();
            try {
              event.target.unMute();
              event.target.setVolume(this.desiredVolume);
              event.target.playVideo();
            } catch {
              // Browser may defer playback until first click
            }
          },
          onStateChange: (event) => {
            if (window.YT && event.data === window.YT.PlayerState.PLAYING) {
              try {
                event.target.unMute();
                event.target.setVolume(this.desiredVolume);
              } catch {
                // Volume sync tolerance
              }
              this.playSuccessCallbacks.forEach((cb) => cb());
            }
            if (window.YT && event.data === window.YT.PlayerState.ENDED) {
              event.target.seekTo(0);
              event.target.playVideo();
            }
          },
          onError: (event) => {
            console.warn('[YouTubeBgm] Playback error code:', event.data);
            this.triggerFallback();
          },
        },
      });
    } catch (err) {
      console.warn('[YouTubeBgm] Failed to initialize YT player:', err);
      this.triggerFallback();
    }
  }

  public unlock(): void {
    this.isUnlocked = true;
    this.shouldPlayOnReady = true;
    if (this.localAudioUrl) {
      this.playLocalAudio();
      return;
    }
    if (this.player && this.isPlayerReady) {
      try {
        this.player.unMute();
        this.player.setVolume(this.desiredVolume);
        this.player.playVideo();
      } catch (err) {
        console.warn('[YouTubeBgm] Unlock error:', err);
        this.triggerFallback();
      }
    }
  }

  private syncPlayerSettings(): void {
    if (!this.player || !this.isPlayerReady) return;

    try {
      this.player.setVolume(this.desiredVolume);
      if (this.isMuted) {
        this.player.mute();
      } else {
        this.player.unMute();
      }
    } catch {
      // Sync tolerance
    }
  }

  public play(): void {
    this.isUnlocked = true;
    this.shouldPlayOnReady = true;

    if (this.localAudioUrl) {
      this.playLocalAudio();
      return;
    }

    if (!this.isPlayerReady || !this.player) {
      if (!this.hasValidSource()) {
        this.triggerFallback();
      }
      return;
    }

    try {
      this.syncPlayerSettings();
      this.player.unMute();
      this.player.playVideo();
    } catch {
      this.triggerFallback();
    }
  }

  public pause(): void {
    this.shouldPlayOnReady = false;
    this.localAudio?.pause();
    if (!this.player || !this.isPlayerReady) return;

    try {
      this.player.pauseVideo();
    } catch {
      // Pause tolerance
    }
  }

  public setVolume(percent: number): void {
    this.desiredVolume = Math.max(0, Math.min(100, Math.round(percent)));
    if (this.localAudio) {
      this.localAudio.volume = this.desiredVolume / 100;
    }
    if (this.player && this.isPlayerReady) {
      try {
        this.player.setVolume(this.desiredVolume);
      } catch {
        // Volume set tolerance
      }
    }
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (this.localAudio) {
      this.localAudio.muted = muted;
    }
    if (this.player && this.isPlayerReady) {
      try {
        if (muted) {
          this.player.mute();
        } else {
          this.player.unMute();
        }
      } catch {
        // Mute toggle tolerance
      }
    }
  }

  public destroy(): void {
    this.releaseLocalAudio();
    if (this.player && this.isPlayerReady) {
      try {
        this.player.destroy();
      } catch {
        // Destruction tolerance
      }
      this.player = null;
      this.isPlayerReady = false;
    }
  }
}

export const youtubeBgmService = new YouTubeBgmService();

