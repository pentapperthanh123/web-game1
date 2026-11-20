import { spawn } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import type { Express } from 'express';
import type { Server } from 'socket.io';
import { CASTER_TTS, CASTER_TTS_FAILURE, CASTER_TTS_HTTP_STATUS, CASTER_TTS_WARM } from '../constants/casterTts.js';
import { CasterTtsService } from '../services/caster/casterTtsService.js';
import { ServerContext } from '../types/serverState.js';
import { saveLiveOpsConfigToDisk } from '../storage/jsonFileStore.js';
import { LIVE_OPS_EVENT } from '../constants/liveOps.js';

export interface VietTtsVoiceItem {
  id: string;
  name: string;
  gender: 'male' | 'female';
  category: 'esports' | 'narration' | 'character' | 'gentle' | 'speechify';
  tag: string;
  description: string;
  isCustomClone?: boolean;
  sampleUrl?: string;
  hasSample?: boolean;
}

const BUILTIN_VOICES_CATALOG: readonly VietTtsVoiceItem[] = [
  {
    id: 'nsnd-le-chuc',
    name: 'NSND Lê Chức',
    gender: 'male',
    category: 'esports',
    tag: 'Hào Hùng / Sử Thi',
    description: 'Giọng đọc phóng sự truyền hình trầm ấm, cực kỳ uy lực. Thích hợp mở màn, Boss Enrage.',
  },
  {
    id: 'cdteam',
    name: 'CD Team',
    gender: 'male',
    category: 'narration',
    tag: 'Review Phim / Trầm',
    description: 'Giọng review phim, tóm tắt câu chuyện, âm vực trầm.',
  },
  {
    id: 'nguyen-ngoc-ngan',
    name: 'Nguyễn Ngọc Ngạn',
    gender: 'male',
    category: 'narration',
    tag: 'Truyền Cảm / Độc Thoại',
    description: 'Giọng dẫn chuyện hải ngoại huyền thoại, nhấn nhá sâu lắng.',
  },
  {
    id: 'son-tung-mtp',
    name: 'Sơn Tùng M-TP',
    gender: 'male',
    category: 'character',
    tag: 'Ca Sĩ / Meme Hype',
    description: 'Giọng ca sĩ Sơn Tùng, ngữ điệu giải trí, tạo điểm nhấn vui nhộn trên livestream.',
  },
  {
    id: 'jack-sparrow',
    name: 'Jack Sparrow',
    gender: 'male',
    category: 'character',
    tag: 'Hải Tặc / Hài Hước',
    description: 'Giọng phim lồng tiếng phiêu lưu, tếu táo.',
  },
  {
    id: 'doremon',
    name: 'Doraemon',
    gender: 'male',
    category: 'character',
    tag: 'Hoạt Hình / Meme',
    description: 'Giọng hoạt hình chú mèo máy, thích hợp các câu ngắn meme vui nhộn.',
  },
  {
    id: 'diep-chi',
    name: 'MC Diệp Chi',
    gender: 'female',
    category: 'narration',
    tag: 'Truyền Hình / VTV',
    description: 'Giọng nữ MC đài truyền hình, chuẩn mực và chững chạc.',
  },
  {
    id: 'quynh',
    name: 'Quỳnh',
    gender: 'female',
    category: 'esports',
    tag: 'Trong Trẻo / Năng Động',
    description: 'Giọng nữ trong trẻo, hoạt bát, rất hợp vai Analyst đọc luật và cảm ơn quà tặng.',
  },
  {
    id: 'nu-nhe-nhang',
    name: 'Nữ Nhẹ Nhàng',
    gender: 'female',
    category: 'gentle',
    tag: 'Dịu Dàng / Ngọt Ngào',
    description: 'Giọng nữ êm ái, thanh thoát, phù hợp câu cảm ơn khán giả.',
  },
  {
    id: 'speechify_1',
    name: 'Speechify Nữ 1',
    gender: 'female',
    category: 'speechify',
    tag: 'AI Standard',
    description: 'Giọng nữ đọc AI tiêu chuẩn số 1.',
  },
  {
    id: 'speechify_2',
    name: 'Speechify Nữ 2',
    gender: 'female',
    category: 'speechify',
    tag: 'AI Standard',
    description: 'Giọng nữ đọc AI tiêu chuẩn số 2.',
  },
  {
    id: 'speechify_3',
    name: 'Speechify Nữ 3',
    gender: 'female',
    category: 'speechify',
    tag: 'AI Standard',
    description: 'Giọng nữ đọc AI tiêu chuẩn số 3.',
  },
  {
    id: 'speechify_4',
    name: 'Speechify Nữ 4',
    gender: 'female',
    category: 'speechify',
    tag: 'AI Standard',
    description: 'Giọng nữ đọc AI tiêu chuẩn số 4.',
  },
  {
    id: 'speechify_5',
    name: 'Speechify Nữ 5',
    gender: 'female',
    category: 'speechify',
    tag: 'AI Standard',
    description: 'Giọng nữ đọc AI tiêu chuẩn số 5.',
  },
  {
    id: 'speechify_6',
    name: 'Speechify Nữ 6',
    gender: 'female',
    category: 'speechify',
    tag: 'AI Standard',
    description: 'Giọng nữ đọc AI tiêu chuẩn số 6.',
  },
  {
    id: 'speechify_7',
    name: 'Speechify Nữ 7',
    gender: 'female',
    category: 'speechify',
    tag: 'AI Standard',
    description: 'Giọng nữ đọc AI tiêu chuẩn số 7.',
  },
  {
    id: 'speechify_8',
    name: 'Speechify Nữ 8',
    gender: 'female',
    category: 'speechify',
    tag: 'AI Standard',
    description: 'Giọng nữ đọc AI tiêu chuẩn số 8.',
  },
  {
    id: 'speechify_9',
    name: 'Speechify Nữ 9',
    gender: 'female',
    category: 'speechify',
    tag: 'AI Standard',
    description: 'Giọng nữ đọc AI tiêu chuẩn số 9.',
  },
  {
    id: 'speechify_10',
    name: 'Speechify Nữ 10',
    gender: 'female',
    category: 'speechify',
    tag: 'AI Standard',
    description: 'Giọng nữ đọc AI tiêu chuẩn số 10.',
  },
  {
    id: 'speechify_11',
    name: 'Speechify Nữ 11',
    gender: 'female',
    category: 'speechify',
    tag: 'AI Standard',
    description: 'Giọng nữ đọc AI tiêu chuẩn số 11.',
  },
  {
    id: 'speechify_12',
    name: 'Speechify Nữ 12',
    gender: 'female',
    category: 'speechify',
    tag: 'AI Standard',
    description: 'Giọng nữ đọc AI tiêu chuẩn số 12.',
  },
  {
    id: 'cross_lingual_prompt',
    name: 'Cross Lingual Nữ',
    gender: 'female',
    category: 'speechify',
    tag: 'Đa Ngôn Ngữ',
    description: 'Giọng đọc prompt đa ngữ tự nhiên.',
  },
  {
    id: 'zero_shot_prompt',
    name: 'Zero Shot Nữ',
    gender: 'female',
    category: 'speechify',
    tag: 'Zero-Shot AI',
    description: 'Giọng đọc AI zero-shot tự nhiên.',
  },
];

interface AudioGenerationState {
  isRunning: boolean;
  startedAt: number;
  completedAt: number | null;
  lastLine: string;
  exitCode: number | null;
  logs: string[];
}

const generationState: AudioGenerationState = {
  isRunning: false,
  startedAt: 0,
  completedAt: null,
  lastLine: '',
  exitCode: null,
  logs: [],
};

function findSampleAudioFile(samplesDir: string, customVoicesDir: string, voiceId: string): string | null {
  const sanitizedId = path.basename(voiceId.trim());
  if (!sanitizedId) return null;

  // 1. Check custom clone .wav in voices directory
  const customWav = path.join(customVoicesDir, sanitizedId.endsWith('.wav') ? sanitizedId : `${sanitizedId}.wav`);
  if (existsSync(customWav)) return customWav;

  // 2. Check samples dir for exact name, .mp3, or .wav
  const exactPath = path.join(samplesDir, sanitizedId);
  if (existsSync(exactPath)) return exactPath;

  const mp3Path = path.join(samplesDir, `${sanitizedId}.mp3`);
  if (existsSync(mp3Path)) return mp3Path;

  const wavPath = path.join(samplesDir, `${sanitizedId}.wav`);
  if (existsSync(wavPath)) return wavPath;

  return null;
}

function scanCustomWavVoices(voicesDir: string): VietTtsVoiceItem[] {
  if (!existsSync(voicesDir)) return [];
  try {
    const files = readdirSync(voicesDir);
    return files
      .filter((file) => file.toLowerCase().endsWith('.wav'))
      .map((file) => ({
        id: file,
        name: file.replace(/\.wav$/i, ''),
        gender: 'male',
        category: 'esports',
        tag: 'Custom Clone .wav',
        description: `Giọng mẫu riêng từ ${file} trong thư mục voices/`,
        isCustomClone: true,
      }));
  } catch {
    return [];
  }
}

/**
 * Overlay → server: `caster:warm` { lang, texts } asks for lines to be generated ahead of time.
 */
export function registerCasterSocketHandlers(io: Server, casterTts: CasterTtsService): void {
  io.on('connection', (socket) => {
    socket.on(CASTER_TTS_WARM.SOCKET_EVENT, (payload: unknown) => {
      if (!payload || typeof payload !== 'object') return;
      const { texts, lang, role } = payload as Record<string, unknown>;
      casterTts.warm(texts, lang, role);
    });
  });
}

/** Registers Caster TTS synthesis & Viet-TTS Studio Management routes. */
export function registerCasterRoutes(
  app: Express,
  casterTts: CasterTtsService,
  serverRoot?: string,
  ctx?: ServerContext
): void {
  const repoRoot = serverRoot ? path.resolve(serverRoot, '..') : process.cwd();
  const voicesDir = path.join(repoRoot, 'scripts', 'viet-tts', 'voices');
  const samplesDir = path.join(repoRoot, 'server', 'data', 'viet-tts-samples');
  const generatorScriptPath = path.join(repoRoot, 'scripts', 'generateCasterAudio.mjs');
  const vietTtsBaseUrl = (process.env.VIET_TTS_URL || 'http://localhost:8298').replace(/\/+$/, '');

  // 1. GET /api/caster/tts?text=... (Standard Live Caster Route)
  app.get(CASTER_TTS.ROUTE, async (req, res) => {
    const result = await casterTts.synthesize(req.query.text, req.query.lang, {
      role: req.query.role,
      intensity: req.query.intensity,
      rate: req.query.rate,
      pitch: req.query.pitch,
    });
    if (result.audio) {
      res.set('Content-Type', CASTER_TTS.AUDIO_CONTENT_TYPE);
      res.set('Cache-Control', CASTER_TTS.CACHE_CONTROL);
      res.set(
        CASTER_TTS.VOICE_HEADER,
        result.isPrimaryVoice ? CASTER_TTS.VOICE_HEADER_PRIMARY : CASTER_TTS.VOICE_HEADER_FALLBACK
      );
      res.send(result.audio);
      return;
    }
    const failure = result.failure ?? CASTER_TTS_FAILURE.PROVIDER_ERROR;
    res.status(CASTER_TTS_HTTP_STATUS[failure]).json({ error: failure, provider: casterTts.providerName });
  });

  // 2. GET /api/caster/voices — List all Viet-TTS voices & current settings
  app.get('/api/caster/voices', (_req, res) => {
    const customVoices = scanCustomWavVoices(voicesDir);
    const allVoices: VietTtsVoiceItem[] = [...customVoices, ...BUILTIN_VOICES_CATALOG].map((v) => {
      const sampleFile = findSampleAudioFile(samplesDir, voicesDir, v.id);
      return {
        ...v,
        sampleUrl: `/api/caster/sample/${encodeURIComponent(v.id)}`,
        hasSample: Boolean(sampleFile),
      };
    });

    const currentMale = ctx?.state.casterConfig?.voiceMale || process.env.VIET_TTS_VOICE_MALE || 'cdteam';
    const currentFemale = ctx?.state.casterConfig?.voiceFemale || process.env.VIET_TTS_VOICE_FEMALE || 'quynh';

    res.json({
      success: true,
      voices: allVoices,
      current: {
        voiceMale: currentMale,
        voiceFemale: currentFemale,
        vietTtsUrl: vietTtsBaseUrl,
      },
    });
  });

  // 3. GET /api/caster/sample/:voiceId — Stream official sample audio file
  app.get('/api/caster/sample/:voiceId', (req, res) => {
    const rawVoiceId = req.params.voiceId;
    if (!rawVoiceId || typeof rawVoiceId !== 'string') {
      res.status(400).json({ error: 'Missing voiceId' });
      return;
    }

    const sampleFilePath = findSampleAudioFile(samplesDir, voicesDir, rawVoiceId);
    if (!sampleFilePath || !existsSync(sampleFilePath)) {
      res.status(404).json({ error: `Audio sample not found for voice '${rawVoiceId}'` });
      return;
    }

    const ext = path.extname(sampleFilePath).toLowerCase();
    const contentType = ext === '.mp3' ? 'audio/mpeg' : 'audio/wav';

    res.set('Content-Type', contentType);
    res.set('Cache-Control', 'public, max-age=86400');
    res.sendFile(sampleFilePath);
  });

  // 4. POST /api/caster/test-voice — Synthesize or fallback to sample audio
  app.post('/api/caster/test-voice', async (req, res) => {
    const text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
    const voice = typeof req.body?.voice === 'string' ? req.body.voice.trim() : '';
    const speed = typeof req.body?.speed === 'number' && req.body.speed > 0 ? req.body.speed : 1.0;

    if (!voice) {
      res.status(400).json({ error: 'Missing required field: voice' });
      return;
    }

    // Helper: Stream pre-recorded sample file
    const streamSampleFallback = () => {
      const sampleFilePath = findSampleAudioFile(samplesDir, voicesDir, voice);
      if (sampleFilePath && existsSync(sampleFilePath)) {
        const ext = path.extname(sampleFilePath).toLowerCase();
        res.set('Content-Type', ext === '.mp3' ? 'audio/mpeg' : 'audio/wav');
        res.sendFile(sampleFilePath);
        return true;
      }
      return false;
    };

    // If text is empty or request specifically asks for sample, stream sample immediately
    if (!text || req.body?.mode === 'sample') {
      if (streamSampleFallback()) return;
      res.status(404).json({ error: `Audio sample not found for voice '${voice}'` });
      return;
    }

    if (text.length > 250) {
      res.status(400).json({ error: 'Text exceeds maximum preview length of 250 characters' });
      return;
    }

    try {
      const isCustomWav = voice.toLowerCase().endsWith('.wav');
      const customWavPath = path.join(voicesDir, voice);

      if (isCustomWav && existsSync(customWavPath)) {
        const formData = new FormData();
        formData.append('text', text);
        formData.append('speed', String(speed));
        const wavBlob = new Blob([readFileSync(customWavPath)], { type: 'audio/wav' });
        formData.append('audio_file', wavBlob, path.basename(customWavPath));

        const cloneRes = await fetch(`${vietTtsBaseUrl}/v1/tts`, {
          method: 'POST',
          body: formData,
          signal: AbortSignal.timeout(60_000),
        });

        if (cloneRes.ok) {
          const audioBuf = Buffer.from(await cloneRes.arrayBuffer());
          res.set('Content-Type', 'audio/wav');
          res.send(audioBuf);
          return;
        }
      }

      // Built-in voice synthesis via OpenAI-compatible endpoint
      const speechRes = await fetch(`${vietTtsBaseUrl}/v1/audio/speech`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'tts-1',
          input: text,
          voice,
          speed,
          response_format: 'mp3',
        }),
        signal: AbortSignal.timeout(60_000),
      });

      if (!speechRes.ok) {
        if (streamSampleFallback()) return;
        const errText = await speechRes.text().catch(() => '');
        res.status(502).json({
          error: `Viet-TTS server returned HTTP ${speechRes.status}`,
          detail: errText.slice(0, 160),
        });
        return;
      }

      const audioBuf = Buffer.from(await speechRes.arrayBuffer());
      res.set('Content-Type', 'audio/mpeg');
      res.send(audioBuf);
    } catch (error) {
      if (streamSampleFallback()) return;
      const message = error instanceof Error ? error.message : String(error);
      res.status(503).json({
        error: 'Cannot connect to Viet-TTS server',
        detail: message,
      });
    }
  });

  // 4. POST /api/caster/config — Save selected primary male / female voice
  app.post('/api/caster/config', (req, res) => {
    const { voiceMale, voiceFemale } = req.body || {};
    if (ctx) {
      if (typeof voiceMale === 'string' && voiceMale.trim()) {
        ctx.state.casterConfig.voiceMale = voiceMale.trim();
        process.env.VIET_TTS_VOICE_MALE = voiceMale.trim();
      }
      if (typeof voiceFemale === 'string' && voiceFemale.trim()) {
        ctx.state.casterConfig.voiceFemale = voiceFemale.trim();
        process.env.VIET_TTS_VOICE_FEMALE = voiceFemale.trim();
      }
      saveLiveOpsConfigToDisk(ctx.state);
      ctx.io.emit(LIVE_OPS_EVENT.GAME_CASTER_CONFIG, ctx.state.casterConfig);
    }
    res.json({
      success: true,
      config: ctx?.state.casterConfig,
    });
  });

  // 5. POST /api/caster/generate-audio — Trigger offline batch generation
  app.post('/api/caster/generate-audio', (req, res) => {
    if (generationState.isRunning) {
      res.status(409).json({
        error: 'Generation is already in progress',
        state: generationState,
      });
      return;
    }

    if (!existsSync(generatorScriptPath)) {
      res.status(500).json({ error: `Generator script not found at ${generatorScriptPath}` });
      return;
    }

    const force = Boolean(req.body?.force);
    const args = [generatorScriptPath, '--clean'];
    if (force) args.push('--force');

    const voiceMale = ctx?.state.casterConfig?.voiceMale || process.env.VIET_TTS_VOICE_MALE || 'cdteam';
    const voiceFemale = ctx?.state.casterConfig?.voiceFemale || process.env.VIET_TTS_VOICE_FEMALE || 'quynh';

    generationState.isRunning = true;
    generationState.startedAt = Date.now();
    generationState.completedAt = null;
    generationState.lastLine = 'Bắt đầu sinh âm thanh...';
    generationState.exitCode = null;
    generationState.logs = [`[START] node ${path.basename(generatorScriptPath)} ${args.slice(1).join(' ')}`];

    const child = spawn(process.execPath, args, {
      cwd: repoRoot,
      env: {
        ...process.env,
        VIET_TTS_VOICE_MALE: voiceMale,
        VIET_TTS_VOICE_FEMALE: voiceFemale,
      },
    });

    child.stdout.on('data', (chunk: Buffer) => {
      const text = chunk.toString('utf-8');
      const lines = text.split(/\r?\n/).filter(Boolean);
      for (const line of lines) {
        generationState.lastLine = line;
        generationState.logs.push(line);
        if (generationState.logs.length > 300) generationState.logs.shift();
      }
    });

    child.stderr.on('data', (chunk: Buffer) => {
      const text = chunk.toString('utf-8');
      const lines = text.split(/\r?\n/).filter(Boolean);
      for (const line of lines) {
        generationState.lastLine = `[STDERR] ${line}`;
        generationState.logs.push(`[STDERR] ${line}`);
      }
    });

    child.on('close', (code) => {
      generationState.isRunning = false;
      generationState.completedAt = Date.now();
      generationState.exitCode = code;
      const durationSec = ((generationState.completedAt - generationState.startedAt) / 1000).toFixed(1);
      generationState.logs.push(`[EXIT] Hoàn tất sau ${durationSec}s với exit code ${code}`);
    });

    res.json({
      success: true,
      message: 'Batch audio generation started',
      state: generationState,
    });
  });

  // 6. GET /api/caster/generate-status — Poll generation progress
  app.get('/api/caster/generate-status', (_req, res) => {
    res.json(generationState);
  });
}
