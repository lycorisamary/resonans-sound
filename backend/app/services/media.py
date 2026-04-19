from __future__ import annotations

import math
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from mutagen import File as MutagenFile
from pydub import AudioSegment

from app.core.config import settings


@dataclass(frozen=True)
class ProcessedMediaAssets:
    duration_seconds: int
    file_size_bytes: int
    bitrate: int | None
    sample_rate: int
    channels: int
    format: str
    waveform_data_json: dict[str, Any]
    derived_files: dict[str, str]


def _detect_bitrate_kbps(file_path: str) -> int | None:
    audio_file = MutagenFile(file_path)
    bitrate = getattr(getattr(audio_file, "info", None), "bitrate", None)
    if bitrate is None:
        return None
    return int(round(bitrate / 1000))


def _detect_format(file_path: str, fallback_content_type: str | None = None) -> str:
    extension = Path(file_path).suffix.lower().lstrip(".")
    if extension:
        return extension

    if fallback_content_type and "/" in fallback_content_type:
        return fallback_content_type.split("/", 1)[1]

    return "unknown"


def generate_waveform_data(audio: AudioSegment) -> dict[str, Any]:
    mono_audio = audio.set_channels(1)
    sample_array = mono_audio.get_array_of_samples()
    total_samples = len(sample_array)
    target_points = max(1, int(settings.WAVEFORM_SAMPLES))
    max_possible_value = float(1 << (8 * mono_audio.sample_width - 1))

    if total_samples == 0:
        peaks: list[float] = []
    else:
        step = max(1, total_samples // target_points)
        peaks = []
        for start in range(0, total_samples, step):
            chunk = sample_array[start:start + step]
            if not chunk:
                continue
            peak = max(abs(int(sample)) for sample in chunk)
            peaks.append(round(min(1.0, peak / max_possible_value), 4))
            if len(peaks) >= target_points:
                break

    return {
        "version": 1,
        "samples": peaks,
        "sample_count": len(peaks),
        "duration_seconds": int(math.ceil(len(audio) / 1000)) if len(audio) else 0,
    }


def process_audio_file(original_path: str, workdir: str, content_type: str | None = None) -> ProcessedMediaAssets:
    audio = AudioSegment.from_file(original_path)
    derived_files: dict[str, str] = {}

    for bitrate in settings.AUDIO_BITRATES:
        output_path = os.path.join(workdir, f"{bitrate}.mp3")
        audio.export(output_path, format="mp3", bitrate=f"{bitrate}k")
        derived_files[str(bitrate)] = output_path

    duration_seconds = int(math.ceil(len(audio) / 1000)) if len(audio) else 0

    return ProcessedMediaAssets(
        duration_seconds=duration_seconds,
        file_size_bytes=os.path.getsize(original_path),
        bitrate=_detect_bitrate_kbps(original_path),
        sample_rate=audio.frame_rate,
        channels=audio.channels,
        format=_detect_format(original_path, fallback_content_type=content_type),
        waveform_data_json=generate_waveform_data(audio),
        derived_files=derived_files,
    )
