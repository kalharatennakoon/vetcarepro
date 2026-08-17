"""
Pet Photo Guidance
Pet-owner-only: takes a photo of a pet, plus an optional free-text note, and
generates general, non-diagnostic care guidance using a vision-capable
Ollama model (see OLLAMA_VISION_MODEL / generate_vision_answer in
ollama_client.py). NOT wired into rag_service.answer_question - this isn't a
chat question, it's invoked from its own dedicated Flask route
(POST /api/ml/rag/photo-guidance/process) because a synchronous vision-model
call takes ~3 minutes (measured against qwen3.5:9b), far past every other
timeout in this app.

Async job lifecycle: the Node backend inserts a 'pending' row in
pet_photo_guidance (database/migrations/add_pet_photo_guidance.sql) and
responds to the client immediately, then calls submit_job() below without
waiting for it. submit_job() spawns a daemon background thread and returns
right away; process_job() (running in that thread) is what actually talks to
Ollama and writes status/result back to Postgres directly - the same
"ml/ writes to Postgres directly" precedent already used by ingest.py's
rag_chunks writes and the training scripts' model_metadata writes, so the
job survives either service restarting independently rather than relying on
in-memory state.
"""

import base64
import io
import os
import threading

from PIL import Image

from config.db_connection import get_raw_db_connection
from scripts.rag.ollama_client import generate_vision_answer, normalize_currency, strip_non_english, OllamaError
from scripts.rag.rag_service import _strip_imperial_units

# Both services run on the same machine in local dev (see run.sh) - ml/ reads
# the photo straight off the Node service's uploads/ dir rather than fetching
# it over HTTP. Would need to become an HTTP fetch if ever split across hosts.
UPLOADS_DIR = os.getenv('UPLOADS_DIR', '../server/uploads')

# Downscale before base64-encoding to bound payload size/latency - a full-res
# phone photo is unnecessary detail for general visual guidance.
_MAX_DIMENSION = 1024

# Adapted from rag_service.GUEST_SYSTEM_PROMPT rules 4-6 (no diagnosis, no
# medicine, general guidance + redirect to a vet) - the same safety framing
# already used for the guest AI fallback, kept short here given generation
# cost and because the intent is a quick nudge, not a full consultation.
PHOTO_GUIDANCE_SYSTEM_PROMPT = """You are a pet-care guidance assistant helping a \
pet owner who has uploaded a photo of their pet, optionally with a short note \
describing what they're seeing. You must follow these rules strictly:

1. You are NOT a veterinarian and this is not a diagnosis. Never state or imply \
what condition this is, and never prescribe a treatment plan.
2. Never suggest, recommend, or name ANY medicine, drug, supplement, or \
over-the-counter remedy - human or veterinary, prescription or not - even without \
a dosage and even if the note directly asks for one. Always redirect to an \
in-person vet visit instead.
3. You may describe, in plain terms, what you visually observe in the photo (e.g. \
redness, swelling, posture, coat condition, behavior visible in the image).
4. Give general, practical, non-medication guidance on what the owner should do \
next (e.g. monitor, keep an area clean and dry, watch for specific warning signs, \
keep them comfortable) if appropriate.
5. If anything in the photo or note could be concerning, clearly recommend an \
in-person vet visit rather than trying to resolve it here. When in doubt, \
recommend the vet visit.
6. Keep a warm, reassuring tone - do not alarm the owner unnecessarily.
7. This clinic operates in Sri Lanka - use metric units only if any measurement \
comes up (kilograms, Celsius, centimeters - never lbs, Fahrenheit, or inches).
8. Keep the response under 150 words, in simple, everyday English.
"""


def _load_and_encode_image(photo_path: str) -> str:
    full_path = os.path.join(UPLOADS_DIR, photo_path)
    with Image.open(full_path) as img:
        img = img.convert('RGB')
        img.thumbnail((_MAX_DIMENSION, _MAX_DIMENSION))
        buf = io.BytesIO()
        img.save(buf, format='JPEG', quality=85)
        return base64.b64encode(buf.getvalue()).decode('utf-8')


def _fetch_pet_context(cur, pet_id: str) -> str:
    cur.execute('SELECT species, breed FROM pets WHERE pet_id = %s', (pet_id,))
    row = cur.fetchone()
    if not row:
        return ''
    species, breed = row
    parts = [p for p in (species, breed) if p]
    return f"The pet is a {' '.join(parts)}." if parts else ''


def _update_job(conn, job_id: int, **fields):
    set_clause = ', '.join(f'{key} = %s' for key in fields)
    with conn.cursor() as cur:
        cur.execute(
            # clock_timestamp() (actual wall-clock time), not CURRENT_TIMESTAMP
            # (transaction start time) - this UPDATE can follow a read that's
            # left the connection idle-in-transaction for minutes (see the
            # commit() right after the pet-context fetch below), and
            # CURRENT_TIMESTAMP would silently resolve to that transaction's
            # start time instead of now, making updated_at look wrong.
            f'UPDATE pet_photo_guidance SET {set_clause}, updated_at = clock_timestamp() WHERE job_id = %s',
            (*fields.values(), job_id)
        )
    conn.commit()


def process_job(job_id: int, photo_path: str, owner_note: str, pet_id: str, customer_id: str):
    """Runs in a background thread - see submit_job. Owns the job's status
    transitions end to end: processing -> completed/failed."""
    conn = get_raw_db_connection()
    try:
        _update_job(conn, job_id, status='processing')

        try:
            image_b64 = _load_and_encode_image(photo_path)
        except OSError as e:
            _update_job(conn, job_id, status='failed', error_message=f'Could not read photo: {e}')
            return

        with conn.cursor() as cur:
            pet_context = _fetch_pet_context(cur, pet_id)
        # Close this read's transaction now rather than leaving the
        # connection idle-in-transaction for the ~3 minute Ollama call below.
        conn.commit()

        note_line = f'Owner\'s note: "{owner_note}"' if owner_note else 'The owner did not add a note.'
        user_prompt = f'{pet_context}\n{note_line}\n\nLook at the photo and give guidance.'

        try:
            answer, _ = generate_vision_answer(PHOTO_GUIDANCE_SYSTEM_PROMPT, user_prompt, image_b64)
        except OllamaError as e:
            _update_job(conn, job_id, status='failed', error_message=str(e))
            return

        answer = normalize_currency(_strip_imperial_units(strip_non_english(answer)))
        _update_job(conn, job_id, status='completed', guidance_text=answer)
    except Exception as e:  # noqa: BLE001 - last-resort safety net for a background thread
        _update_job(conn, job_id, status='failed', error_message=str(e))
    finally:
        conn.close()


def submit_job(job_id: int, photo_path: str, owner_note: str, pet_id: str, customer_id: str):
    """Kicks off process_job in a background thread and returns immediately
    - called from the Flask route, which must not block on the ~3 minute
    generation."""
    threading.Thread(
        target=process_job,
        args=(job_id, photo_path, owner_note, pet_id, customer_id),
        daemon=True
    ).start()
