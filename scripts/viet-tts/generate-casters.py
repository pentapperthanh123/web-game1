#!/usr/bin/env python3
"""
Generate static caster MP3 files from casters.json via Viet-TTS API.

Usage:
    python generate-casters.py [--force] [--dry-run]

Reads server/data/casters.json, synthesizes each line via local Viet-TTS,
applies ffmpeg post-processing per mood, and outputs MP3 files to
client/public/audio/casters/.
"""

import argparse
import json
import os
import shutil
import subprocess
import sys
import tempfile
import time
from pathlib import Path

import requests

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR / ".." / ".."
CASTERS_JSON_PATH = PROJECT_ROOT / "server" / "data" / "casters.json"
OUTPUT_DIR = PROJECT_ROOT / "client" / "public" / "audio" / "casters"

TTS_ENDPOINT = "http://localhost:8298/v1/audio/speech"
TTS_MODEL = "tts-1"
TTS_TIMEOUT_SECONDS = 60
TTS_MAX_RETRIES = 3
TTS_BACKOFF_BASE = 2  # seconds

VOICE_MAP = {
    "male": "cdteam",
    "female": "quynh",
}

SILENCE_DURATION_SECONDS = 0.2
SAMPLE_RATE = 24000

# ffmpeg audio filter chains keyed by (voice, mood)
# Male (cdteam - Bao): strong, resonant, hype lead
# Female (quynh - Quynh): bright, clear, crisp presence
AUDIO_FILTERS = {
    ("male", "hype"): (
        f"aresample={SAMPLE_RATE},"
        f"asetrate={SAMPLE_RATE}*0.98,"
        f"aresample={SAMPLE_RATE},"
        "atempo=1.06,"
        "equalizer=f=180:t=q:w=1.0:g=2.0,"
        "equalizer=f=3200:t=q:w=1.2:g=2.8,"
        "loudnorm=I=-12:TP=-1.5"
    ),
    ("male", "calm"): (
        f"aresample={SAMPLE_RATE},"
        f"asetrate={SAMPLE_RATE}*0.99,"
        f"aresample={SAMPLE_RATE},"
        "atempo=1.02,"
        "equalizer=f=200:t=q:w=1.0:g=1.5,"
        "loudnorm=I=-15:TP=-1.5"
    ),
    ("female", "hype"): (
        f"aresample={SAMPLE_RATE},"
        f"asetrate={SAMPLE_RATE}*1.02,"
        f"aresample={SAMPLE_RATE},"
        "atempo=1.06,"
        "equalizer=f=3500:t=q:w=1.2:g=3.0,"
        "loudnorm=I=-12:TP=-1.5"
    ),
    ("female", "calm"): (
        f"aresample={SAMPLE_RATE},"
        "atempo=1.02,"
        "equalizer=f=4000:t=q:w=1.0:g=1.8,"
        "loudnorm=I=-16:TP=-1.5"
    ),
}

# ---------------------------------------------------------------------------
# Logging helpers
# ---------------------------------------------------------------------------


def log_ok(filename: str) -> None:
    print(f"[OK] {filename}")


def log_skip(filename: str) -> None:
    print(f"[SKIP] {filename}")


def log_fail(filename: str, reason: str) -> None:
    print(f"[FAIL] {filename}: {reason}", file=sys.stderr)


def log_dry(filename: str, variant: dict) -> None:
    line_count = len(variant.get("lines", []))
    print(f"[DRY] {filename} ({line_count} line(s))")


# ---------------------------------------------------------------------------
# TTS synthesis
# ---------------------------------------------------------------------------


def synthesize(text: str, voice_key: str) -> bytes:
    """Call Viet-TTS API and return raw audio bytes. Retries up to 3× with backoff."""
    voice = VOICE_MAP.get(voice_key)
    if voice is None:
        raise ValueError(
            f"Unknown voice key '{voice_key}'; expected one of {list(VOICE_MAP)}"
        )

    payload = {"model": TTS_MODEL, "input": text, "voice": voice}

    last_error: Exception | None = None
    for attempt in range(1, TTS_MAX_RETRIES + 1):
        try:
            resp = requests.post(
                TTS_ENDPOINT,
                json=payload,
                timeout=TTS_TIMEOUT_SECONDS,
            )
            resp.raise_for_status()
            return resp.content
        except (requests.RequestException, IOError) as exc:
            last_error = exc
            if attempt < TTS_MAX_RETRIES:
                wait = TTS_BACKOFF_BASE ** attempt
                print(f"  ↻ retry {attempt}/{TTS_MAX_RETRIES} in {wait}s ({exc})")
                time.sleep(wait)

    raise RuntimeError(
        f"TTS failed after {TTS_MAX_RETRIES} attempts: {last_error}"
    ) from last_error


# ---------------------------------------------------------------------------
# ffmpeg helpers
# ---------------------------------------------------------------------------


def _run_ffmpeg(args: list[str], description: str) -> None:
    """Run an ffmpeg command, raising RuntimeError on failure."""
    result = subprocess.run(
        ["ffmpeg", "-y", *args],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        raise RuntimeError(
            f"ffmpeg ({description}) failed (code {result.returncode}):\n"
            f"  {result.stderr.strip()}"
        )


def apply_audio_filter(src_wav: str, dst_wav: str, voice: str, mood: str) -> None:
    """Apply voice- and mood-based audio filters via ffmpeg and standardize rate/channels."""
    af = AUDIO_FILTERS.get((voice, mood), AUDIO_FILTERS.get(("male", "hype")))
    _run_ffmpeg(
        ["-i", src_wav, "-af", af, "-ar", str(SAMPLE_RATE), "-ac", "1", dst_wav],
        description=f"voice={voice},mood={mood}",
    )


def generate_silence(dst_wav: str) -> None:
    """Generate 200ms silence WAV file at 24kHz mono."""
    _run_ffmpeg(
        [
            "-f", "lavfi",
            "-i", f"anullsrc=r={SAMPLE_RATE}:cl=mono",
            "-t", str(SILENCE_DURATION_SECONDS),
            "-f", "wav",
            dst_wav,
        ],
        description="silence",
    )


def concat_wavs(wav_paths: list[str], dst_wav: str) -> None:
    """Concatenate multiple WAV files using ffmpeg concat demuxer."""
    with tempfile.NamedTemporaryFile(
        mode="w", suffix=".txt", delete=False, encoding="utf-8"
    ) as flist:
        for p in wav_paths:
            safe = p.replace("\\", "/")
            flist.write(f"file '{safe}'\n")
        list_path = flist.name

    try:
        _run_ffmpeg(
            ["-f", "concat", "-safe", "0", "-i", list_path, "-c", "copy", dst_wav],
            description="concat",
        )
    finally:
        if os.path.exists(list_path):
            try:
                os.unlink(list_path)
            except OSError:
                pass


def wav_to_mp3(src_wav: str, dst_mp3: str) -> None:
    """Encode a WAV file to MP3 via libmp3lame."""
    _run_ffmpeg(
        ["-i", src_wav, "-codec:a", "libmp3lame", "-q:a", "2", dst_mp3],
        description="wav→mp3",
    )


# ---------------------------------------------------------------------------
# Core generation
# ---------------------------------------------------------------------------


def process_variant(variant: dict, output_path: Path) -> None:
    """Synthesize, post-process, and save a single variant as MP3."""
    lines: list[dict] = variant.get("lines", [])
    if not lines:
        raise ValueError("Variant has no lines")

    with tempfile.TemporaryDirectory(prefix="viet_tts_") as tmpdir:
        processed_wavs: list[str] = []

        for idx, line in enumerate(lines):
            raw_wav = os.path.join(tmpdir, f"raw_{idx}.wav")
            filtered_wav = os.path.join(tmpdir, f"filtered_{idx}.wav")

            # 1. Synthesize line via API
            audio_bytes = synthesize(line["text"], line["voice"])
            with open(raw_wav, "wb") as f:
                f.write(audio_bytes)

            # 2. Apply voice & mood audio filter
            voice = line.get("voice", "male")
            mood = line.get("mood", "calm")
            apply_audio_filter(raw_wav, filtered_wav, voice, mood)
            processed_wavs.append(filtered_wav)

        # 3. Concatenate (with 200ms silence gaps) or use single processed audio
        if len(processed_wavs) == 1:
            final_wav = processed_wavs[0]
        else:
            silence_wav = os.path.join(tmpdir, "silence.wav")
            generate_silence(silence_wav)

            # Interleave audio files with silence
            interleaved: list[str] = []
            for i, wav in enumerate(processed_wavs):
                interleaved.append(wav)
                if i < len(processed_wavs) - 1:
                    interleaved.append(silence_wav)

            final_wav = os.path.join(tmpdir, "concat.wav")
            concat_wavs(interleaved, final_wav)

        # 4. Save to temporary output then atomically replace target MP3
        tmp_mp3 = os.path.join(tmpdir, "output.mp3")
        wav_to_mp3(final_wav, tmp_mp3)

        # Ensure parent directory exists
        output_path.parent.mkdir(parents=True, exist_ok=True)
        if output_path.exists():
            output_path.unlink()
        shutil.move(tmp_mp3, str(output_path))


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def load_casters_json() -> dict:
    """Load and return casters.json."""
    if not CASTERS_JSON_PATH.exists():
        print(f"[FAIL] casters.json: file not found at {CASTERS_JSON_PATH}", file=sys.stderr)
        sys.exit(1)

    with open(CASTERS_JSON_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    if not isinstance(data, dict):
        print("[FAIL] casters.json: root must be a JSON object", file=sys.stderr)
        sys.exit(1)

    return data


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Generate caster MP3 audio from casters.json via Viet-TTS."
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Overwrite existing files instead of skipping.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="List files that would be generated without calling TTS.",
    )
    args = parser.parse_args()

    data = load_casters_json()
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    total = 0
    ok_count = 0
    skip_count = 0
    fail_count = 0

    for event_key, variants in data.items():
        if not isinstance(variants, list):
            log_fail(event_key, "expected an array of variants")
            fail_count += 1
            continue

        for variant in variants:
            variant_id = variant.get("id", "unknown")
            filename = f"{variant_id}.mp3"
            output_path = OUTPUT_DIR / filename
            total += 1

            # Dry-run mode
            if args.dry_run:
                log_dry(filename, variant)
                continue

            # Skip existing files unless --force
            if output_path.exists() and not args.force:
                log_skip(filename)
                skip_count += 1
                continue

            # Generate MP3
            try:
                process_variant(variant, output_path)
                log_ok(filename)
                ok_count += 1
            except Exception as exc:
                log_fail(filename, str(exc))
                fail_count += 1

    # Print summary
    if args.dry_run:
        print(f"\nDry run: {total} file(s) would be generated.")
    else:
        print(
            f"\nDone: {ok_count} OK, {skip_count} skipped, {fail_count} failed "
            f"(of {total} total)"
        )

    if fail_count > 0:
        sys.exit(1)


if __name__ == "__main__":
    main()
