"""
Ollama Client
Thin wrapper around the local Ollama HTTP API for embeddings + chat generation.
Runs fully locally -> no API keys, no per-token cost.

Requires Ollama running locally (default http://localhost:11434) with:
    ollama pull nomic-embed-text
    ollama pull qwen3:8b      # text chat model
    ollama pull qwen3.5:9b    # vision model (photo guidance only)
"""

import json
import os
import re
import requests
from dotenv import load_dotenv

load_dotenv()

OLLAMA_HOST = os.getenv('OLLAMA_HOST', 'http://localhost:11434')
OLLAMA_EMBED_MODEL = os.getenv('OLLAMA_EMBED_MODEL', 'nomic-embed-text')
# Two separate models, not one doing double duty - see OLLAMA_VISION_MODEL
# below for why. OLLAMA_CHAT_MODEL handles every TEXT call in this app
# (structured answers, action-intent parsing, clinical tools, briefings,
# plain RAG generation).
OLLAMA_CHAT_MODEL = os.getenv('OLLAMA_CHAT_MODEL', 'qwen3:8b')
# Sized with headroom for two things, not just plain generation speed: (a) a
# longer "explain"/"summarize" owner/staff answer (see OWNER_SYSTEM_PROMPT
# rule 7's paragraph-plus-bullets format) can need several hundred tokens,
# and (b) OLLAMA_CHAT_MODEL and OLLAMA_VISION_MODEL are deliberately
# different models (see below) that Ollama loads/unloads on demand rather
# than keeping both resident - on memory-constrained hardware the first
# request after a swap pays a real, if usually small (single-digit seconds
# off local disk), model-load cost on top of generation time, inside this
# same timeout window. 120s covers both without reaching for the no-limit
# `timeout: 0` used for streaming.
OLLAMA_TIMEOUT = int(os.getenv('OLLAMA_TIMEOUT', '120'))
# Thinking mode measured at ~24x slower on qwen3:8b (see generate_answer) -
# the normal OLLAMA_TIMEOUT is sized for non-thinking calls and routinely
# isn't enough once `think=True`, especially on the larger prompts (e.g.
# inventory/sales forecast explanations). The multiplier is model-dependent,
# not a fixed constant - a same-shape trivial-prompt test measured ~42x on
# qwen3.5:9b - so re-check it before assuming this timeout still has margin
# under a different OLLAMA_CHAT_MODEL. Only applied when a caller actually
# requests thinking, so the default fast path's timeout budget is unaffected.
OLLAMA_THINK_TIMEOUT = int(os.getenv('OLLAMA_THINK_TIMEOUT', '240'))
# Separate vision-capable model, used only by generate_vision_answer (see
# scripts/rag/photo_guidance.py) - OLLAMA_CHAT_MODEL (qwen3:8b) is text-only.
# Deliberately NOT the same model as OLLAMA_CHAT_MODEL: qwen3.5:9b handles
# both text and vision, which would simplify this, but this deployment's
# 16GB of unified memory can't comfortably hold both models resident at
# once (a 16k-token context window on qwen3.5:9b alone was enough to OOM-
# crash Ollama outright). Splitting into two single-purpose models instead
# and letting Ollama load/unload whichever is needed on demand (its default
# ~5min idle keep_alive) keeps memory usage the same as running one model at
# a time, at the cost of an occasional swap-load delay on the first request
# after switching between chat and photo guidance - see OLLAMA_TIMEOUT.
OLLAMA_VISION_MODEL = os.getenv('OLLAMA_VISION_MODEL', 'qwen3.5:9b')
# Vision calls measured at ~195s for a single response in testing on this
# hardware, well beyond every other timeout in this file.
OLLAMA_VISION_TIMEOUT = int(os.getenv('OLLAMA_VISION_TIMEOUT', '300'))

EMBEDDING_DIM = 768  # must match database/migrations/add_rag_vector_store.sql


class OllamaError(Exception):
    """Raised when Ollama is unreachable or returns an error."""
    pass


def _generation_options(think: bool) -> dict:
    """
    Shared `options` payload for /api/chat calls. Neither num_predict nor
    num_ctx was ever set here, so every call ran on Ollama's runtime default
    context window - far smaller than either chat model's actual supported
    context. That went unnoticed on plain answers, but a thinking-mode
    response can run very long (the model drafts, critiques, and redrafts
    its own answer inside the reasoning trace before ever emitting real
    content) - observed in production truncating mid-thought, past the
    point where anything had been written to `content` yet, leaving the
    final answer empty even though a complete one existed inside the
    cut-off `thinking` text. Widen the window for thinking calls
    specifically, since that's the path long enough to hit the default
    ceiling; num_predict: -1 (no artificial output cap, stop naturally or at
    the context limit) is cheap to apply unconditionally.

    Thinking is only ever requested for OLLAMA_CHAT_MODEL (admin-only
    explain/summarize questions - see rag_service.py) - OLLAMA_VISION_MODEL
    never sees think=True in practice (scripts/rag/photo_guidance.py always
    calls generate_vision_answer with the default think=False), so this
    num_ctx bump's memory cost is bounded by whichever text model is
    currently loaded, not the (larger) vision model.

    num_ctx is deliberately a moderate bump, not a large one - a larger
    context window means a larger KV cache, and this deployment runs on a
    16GB Mac with very little free memory once a chat model is loaded. A
    first attempt at 16384 (tested against qwen3.5:9b, back when it was
    also the chat model) crashed the Ollama server outright (OOM). 8192 is a
    more conservative 2x-the-likely-default step - if truncation still
    recurs, raise this gradually rather than jumping straight back to a
    large value, and keep an eye on `ollama ps`/system memory while testing.
    """
    options = {'temperature': 0.1, 'num_predict': -1}
    if think:
        options['num_ctx'] = 8192
    return options


def embed_text(text: str) -> list:
    """
    Convert a text chunk into an embedding vector using the local Ollama
    embedding model.

    Returns:
        list[float]: embedding vector (length == EMBEDDING_DIM)
    """
    try:
        response = requests.post(
            f'{OLLAMA_HOST}/api/embeddings',
            json={'model': OLLAMA_EMBED_MODEL, 'prompt': text},
            timeout=OLLAMA_TIMEOUT
        )
        response.raise_for_status()
        embedding = response.json().get('embedding')

        if not embedding:
            raise OllamaError('Ollama returned an empty embedding')
        if len(embedding) != EMBEDDING_DIM:
            raise OllamaError(
                f'Embedding dimension mismatch: got {len(embedding)}, '
                f'expected {EMBEDDING_DIM}. Check OLLAMA_EMBED_MODEL matches the migration.'
            )
        return embedding

    except requests.exceptions.ConnectionError as e:
        raise OllamaError(
            'Could not reach Ollama. Is it running? Try: ollama serve'
        ) from e
    except requests.exceptions.RequestException as e:
        raise OllamaError(f'Ollama embedding request failed: {e}') from e


def embed_batch(texts: list) -> list:
    """Embed a list of text chunks. Ollama's embeddings endpoint is single-item,
    so this just loops - fine at our data volumes (hundreds/low-thousands of chunks)."""
    return [embed_text(t) for t in texts]


def generate_answer(system_prompt: str, user_prompt: str, think: bool = False) -> tuple:
    """
    Generate a chat completion using the local Ollama LLM.

    Args:
        system_prompt: instructions (grounding rules, safety wording, etc.)
        user_prompt: the question + retrieved context
        think: request the model's internal reasoning pass (only meaningful for
            reasoning-capable models, e.g. qwen3 - ignored harmlessly otherwise).
            Reasoning-capable models default to running this pass regardless, at
            real latency cost for no accuracy benefit on this app's already-
            grounded answers - so it stays off unless a caller explicitly wants
            the reasoning text back (e.g. an admin-only "show reasoning" view),
            not on for every request. The cost is model-dependent, not a fixed
            multiplier: ~24x slower in testing on qwen3:8b, ~42x on qwen3.5:9b
            for the same trivial-prompt shape - re-measure under whichever
            model OLLAMA_CHAT_MODEL actually points at.

    Returns:
        tuple: (answer text, reasoning text or None if `think` was False or the
            model doesn't support thinking mode)
    """
    try:
        response = requests.post(
            f'{OLLAMA_HOST}/api/chat',
            json={
                'model': OLLAMA_CHAT_MODEL,
                'messages': [
                    {'role': 'system', 'content': system_prompt},
                    {'role': 'user', 'content': user_prompt}
                ],
                'stream': False,
                'options': _generation_options(think),
                'think': think
            },
            timeout=OLLAMA_THINK_TIMEOUT if think else OLLAMA_TIMEOUT
        )
        response.raise_for_status()
        message = response.json().get('message', {})
        content = message.get('content', '').strip()
        thinking = message.get('thinking', '').strip() if think else None
        return content, (thinking or None)

    except requests.exceptions.ConnectionError as e:
        raise OllamaError(
            'Could not reach Ollama. Is it running? Try: ollama serve'
        ) from e
    except requests.exceptions.RequestException as e:
        raise OllamaError(f'Ollama chat request failed: {e}') from e


def generate_vision_answer(system_prompt: str, user_prompt: str, image_b64: str, think: bool = False) -> tuple:
    """
    Generate a chat completion from a system prompt, a user prompt, and a
    single base64-encoded image, using OLLAMA_VISION_MODEL - a separate,
    vision-capable model from OLLAMA_CHAT_MODEL (see the constants above for
    why they're split). Mirrors generate_answer exactly except for the model
    used, the image attached to the user message (Ollama's documented
    chat-with-images shape: an `images` list on the user message dict), and
    the timeout, since vision generation is measured far slower.

    Kept as a separate function rather than added as an optional parameter
    to generate_answer, since the model, `images` field, and timeout only
    apply to this one call site (scripts/rag/photo_guidance.py).

    Returns:
        tuple: (answer text, reasoning text or None), same shape as
            generate_answer.
    """
    try:
        response = requests.post(
            f'{OLLAMA_HOST}/api/chat',
            json={
                'model': OLLAMA_VISION_MODEL,
                'messages': [
                    {'role': 'system', 'content': system_prompt},
                    {'role': 'user', 'content': user_prompt, 'images': [image_b64]}
                ],
                'stream': False,
                'options': _generation_options(think),
                'think': think
            },
            timeout=OLLAMA_THINK_TIMEOUT if think else OLLAMA_VISION_TIMEOUT
        )
        response.raise_for_status()
        message = response.json().get('message', {})
        content = message.get('content', '').strip()
        thinking = message.get('thinking', '').strip() if think else None
        return content, (thinking or None)

    except requests.exceptions.ConnectionError as e:
        raise OllamaError(
            'Could not reach Ollama. Is it running? Try: ollama serve'
        ) from e
    except requests.exceptions.RequestException as e:
        raise OllamaError(f'Ollama vision chat request failed: {e}') from e


def stream_chat(system_prompt: str, user_prompt: str, think: bool = True):
    """
    Streaming counterpart to generate_answer, for the admin-only real-time
    "show reasoning" chat view - callers that don't need token-level
    granularity should keep using generate_answer, which is simpler and
    already handles every other call site in this app.

    Args:
        system_prompt, user_prompt: same as generate_answer.
        think: same as generate_answer, default True here since a caller
            reaching for the streaming variant is specifically after the
            live thinking deltas.

    Yields:
        dict: {'type': 'thinking', 'delta': str} for each incremental piece
            of the model's reasoning pass (only while `think` is True and
              the model actually supports thinking mode),
            {'type': 'content', 'delta': str} for each incremental piece of
              the actual answer,
            {'type': 'done', 'content': str, 'thinking': str or None} - the
              full accumulated text of each, mirroring generate_answer's
              return shape - always the last event yielded.

    Raises:
        OllamaError: same conditions as generate_answer, before any events
            are yielded (connection/request failure on the initial call).
    """
    try:
        response = requests.post(
            f'{OLLAMA_HOST}/api/chat',
            json={
                'model': OLLAMA_CHAT_MODEL,
                'messages': [
                    {'role': 'system', 'content': system_prompt},
                    {'role': 'user', 'content': user_prompt}
                ],
                'stream': True,
                'options': _generation_options(think),
                'think': think
            },
            timeout=OLLAMA_THINK_TIMEOUT if think else OLLAMA_TIMEOUT,
            stream=True
        )
        response.raise_for_status()

        content_parts = []
        thinking_parts = []
        for line in response.iter_lines():
            if not line:
                continue
            chunk = json.loads(line)
            message = chunk.get('message', {})
            thinking_delta = message.get('thinking') or ''
            content_delta = message.get('content') or ''
            if thinking_delta:
                thinking_parts.append(thinking_delta)
                yield {'type': 'thinking', 'delta': thinking_delta}
            if content_delta:
                content_parts.append(content_delta)
                yield {'type': 'content', 'delta': content_delta}
            if chunk.get('done'):
                break

        yield {
            'type': 'done',
            'content': ''.join(content_parts).strip(),
            'thinking': (''.join(thinking_parts).strip() or None)
        }

    except requests.exceptions.ConnectionError as e:
        raise OllamaError(
            'Could not reach Ollama. Is it running? Try: ollama serve'
        ) from e
    except requests.exceptions.RequestException as e:
        raise OllamaError(f'Ollama chat request failed: {e}') from e


# This clinic operates in Sri Lanka and bills exclusively in LKR - small local
# chat models can still default to '$'/'USD'/'dollars' from their training data
# even when a system prompt explicitly says not to (same failure mode as the
# imperial-units aside stripped in rag_service.py's _strip_imperial_units).
# Rather than keep tuning prompt wording per-model, normalize deterministically
# as a model-agnostic safety net - a no-op when the model already gets it right.
# Lives here (not in rag_service.py, where _strip_imperial_units lives) so both
# rag_service.py and clinical_tools.py can share it without a circular import
# between them.
_DOLLAR_AMOUNT = re.compile(r'\$\s?([\d,]+(?:\.\d+)?)')
_DOLLAR_WORD = re.compile(r'\bUSD\b|\bU\.?S\.?\s?dollars?\b|\bdollars?\b', re.IGNORECASE)


def normalize_currency(text: str) -> str:
    text = _DOLLAR_AMOUNT.sub(lambda m: f'Rs. {m.group(1)}', text)
    text = _DOLLAR_WORD.sub('LKR', text)
    return text


# Small local chat models trained on heavily multilingual (mostly Chinese+
# English) data - both qwen3:8b and qwen3.5:9b exhibit this - occasionally
# leak a stray CJK/Hangul token into an otherwise-English sentence (e.g. "to 减轻
# joint strain" instead of "to reduce joint strain") - a model-quality
# quirk, not a prompt problem, so no amount of "respond only in English"
# wording in the system prompt reliably prevents it. This app is
# English-only end to end, so any run of these characters is always a leak,
# never intended content. Same model-agnostic-safety-net pattern as
# normalize_currency above: strip deterministically after generation rather
# than trusting the prompt alone - a no-op when the model already stays in
# English.
# CJK punctuation, Hiragana/Katakana, CJK Extension A, CJK Unified
# Ideographs, Hangul syllables, CJK compatibility ideographs, fullwidth forms.
_NON_ENGLISH_SCRIPT = re.compile(
    '[\u3000-\u303f\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff'
    '\uac00-\ud7af\uf900-\ufaff\uff00-\uffef]+'
)
_DOUBLE_SPACE = re.compile(r' {2,}')
_SPACE_BEFORE_PUNCT = re.compile(r' +([,.!?;:])')


def strip_non_english(text: str) -> str:
    text = _NON_ENGLISH_SCRIPT.sub(' ', text)
    text = _SPACE_BEFORE_PUNCT.sub(r'\1', text)
    text = _DOUBLE_SPACE.sub(' ', text)
    return text.strip()


def check_health() -> dict:
    """Check whether Ollama is up and the required models are pulled."""
    try:
        response = requests.get(f'{OLLAMA_HOST}/api/tags', timeout=5)
        response.raise_for_status()
        installed = [m['name'] for m in response.json().get('models', [])]

        def is_installed(model_name):
            # Ollama tags may include version suffixes, so compare by base name.
            return any(m.startswith(model_name.split(':')[0]) for m in installed)

        return {
            'ollama_reachable': True,
            'embed_model_installed': is_installed(OLLAMA_EMBED_MODEL),
            'chat_model_installed': is_installed(OLLAMA_CHAT_MODEL),
            'vision_model_installed': is_installed(OLLAMA_VISION_MODEL),
            'installed_models': installed
        }
    except requests.exceptions.RequestException:
        return {'ollama_reachable': False}