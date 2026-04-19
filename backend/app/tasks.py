from __future__ import annotations

import copy
from datetime import datetime, timezone
from pathlib import Path
from tempfile import TemporaryDirectory

from app.celery import app
from app.core.config import settings
from app.db.session import SessionLocal
from app.models import Track, TrackStatus
from app.services.media import process_audio_file
from app.services.storage import build_derived_object_key, delete_objects, download_file, upload_file


def _utcnow_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _get_track_stream_urls(track_id: int) -> dict[str, str]:
    base_url = f"{settings.API_PREFIX}/tracks/{track_id}/stream"
    return {
        "original": f"{base_url}?quality=original",
        "128": f"{base_url}?quality=128",
        "320": f"{base_url}?quality=320",
    }


def _load_metadata(track: Track) -> dict:
    return copy.deepcopy(track.metadata_json) if isinstance(track.metadata_json, dict) else {}


@app.task(name="app.tasks.smoke_check")
def smoke_check() -> dict[str, str]:
    """Minimal task so the worker can be started and verified safely."""
    return {
        "status": "ok",
        "broker": "rabbitmq",
        "result_backend": "redis",
    }


@app.task(name="app.tasks.process_track_upload", bind=True)
def process_track_upload(self, track_id: int) -> dict[str, object]:
    """Process an uploaded track and attach derived media assets."""
    db = SessionLocal()
    generated_keys: list[str] = []
    track: Track | None = None

    try:
        track = db.query(Track).filter(Track.id == track_id).first()
        if track is None:
            return {"status": "missing", "track_id": track_id}

        metadata_json = _load_metadata(track)
        storage = metadata_json.get("storage") if isinstance(metadata_json.get("storage"), dict) else {}
        original_object_key = storage.get("original_object_key")
        upload_info = metadata_json.get("upload") if isinstance(metadata_json.get("upload"), dict) else {}
        content_type = upload_info.get("content_type")

        if not original_object_key:
            metadata_json.setdefault("processing", {})
            metadata_json["processing"]["status"] = "rejected"
            metadata_json["processing"]["failed_at"] = _utcnow_iso()
            metadata_json["processing"]["error"] = "Original upload pointer is missing"
            track.status = TrackStatus.rejected
            track.rejection_reason = "Original upload pointer is missing"
            track.metadata_json = metadata_json
            db.add(track)
            db.commit()
            return {"status": "rejected", "track_id": track_id}

        metadata_json.setdefault("processing", {})
        metadata_json["processing"]["status"] = "processing"
        metadata_json["processing"]["task_id"] = self.request.id
        metadata_json["processing"]["started_at"] = _utcnow_iso()
        track.status = TrackStatus.processing
        track.rejection_reason = None
        track.metadata_json = metadata_json
        db.add(track)
        db.commit()

        with TemporaryDirectory() as workdir:
            original_path = Path(workdir) / Path(original_object_key).name
            download_file(original_object_key, str(original_path))

            processed_assets = process_audio_file(
                str(original_path),
                workdir,
                content_type=content_type if isinstance(content_type, str) else None,
            )

            processed_object_keys: dict[str, str] = {}
            for quality, file_path in processed_assets.derived_files.items():
                object_key = build_derived_object_key(track.user_id, track.id, quality)
                upload_file(file_path, object_key, content_type="audio/mpeg")
                processed_object_keys[quality] = object_key
                generated_keys.append(object_key)

        metadata_json = _load_metadata(track)
        metadata_json.update(
            {
                "duration_seconds": processed_assets.duration_seconds,
                "file_size_bytes": processed_assets.file_size_bytes,
                "bitrate": processed_assets.bitrate,
                "sample_rate": processed_assets.sample_rate,
                "channels": processed_assets.channels,
                "format": processed_assets.format,
            }
        )
        metadata_json.setdefault("storage", {})
        metadata_json["storage"]["bucket"] = settings.MINIO_BUCKET
        metadata_json["storage"]["original_object_key"] = original_object_key
        metadata_json["storage"]["processed_object_keys"] = processed_object_keys
        metadata_json.setdefault("processing", {})
        metadata_json["processing"]["status"] = "approved"
        metadata_json["processing"]["completed_at"] = _utcnow_iso()
        metadata_json["processing"].pop("error", None)

        stream_urls = _get_track_stream_urls(track.id)
        track.duration_seconds = processed_assets.duration_seconds
        track.file_size_bytes = processed_assets.file_size_bytes
        track.original_url = stream_urls["original"]
        track.mp3_128_url = stream_urls["128"]
        track.mp3_320_url = stream_urls["320"]
        track.waveform_data_json = processed_assets.waveform_data_json
        track.metadata_json = metadata_json
        track.status = TrackStatus.approved
        track.rejection_reason = None
        db.add(track)
        db.commit()

        return {
            "status": "approved",
            "track_id": track_id,
            "task_id": self.request.id,
        }
    except Exception as exc:
        delete_objects(generated_keys)
        if track is not None:
            metadata_json = _load_metadata(track)
            metadata_json.setdefault("processing", {})
            metadata_json["processing"]["status"] = "rejected"
            metadata_json["processing"]["failed_at"] = _utcnow_iso()
            metadata_json["processing"]["error"] = str(exc)[:500]
            if isinstance(metadata_json.get("storage"), dict):
                metadata_json["storage"]["processed_object_keys"] = {}

            track.mp3_128_url = None
            track.mp3_320_url = None
            track.waveform_data_json = None
            track.metadata_json = metadata_json
            track.status = TrackStatus.rejected
            track.rejection_reason = str(exc)[:500]
            db.add(track)
            db.commit()
        raise
    finally:
        db.close()
