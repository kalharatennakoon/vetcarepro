"""
Ollama Client
Thin wrapper around the local Ollama HTTP API for embeddings + chat generation.
Runs fully locally -> no API keys, no per-token cost.

Requires Ollama running locally (default http://localhost:11434) with:
    ollama pull nomic-embed-text
    ollama pull qwen3:8b
"""

import json
import os
import re
import requests
from dotenv import load_dotenv

load_dotenv()

OLLAMA_HOST = os.getenv('OLLAMA_HOST', 'http://localhost:11434')
OLLAMA_EMBED_MODEL = os.getenv('OLLAMA_EMBED_MODEL', 'nomic-embed-text')
OLLAMA_CHAT_MODEL = os.getenv('OLLAMA_CHAT_MODEL', 'qwen3:8b')
OLLAMA_TIMEOUT = int(os.getenv('OLLAMA_TIMEOUT', '60'))
# Thinking mode measured at ~24x slower (see generate_answer) - the normal
# OLLAMA_TIMEOUT is sized for non-thinking calls and routinely isn't enough
# once `think=True`, especially on the larger prompts (e.g. inventory/sales
# forecast explanations). Only applied when a caller actually requests
# thinking, so the default fast path's timeout budget is unaffected.
OLLAMA_THINK_TIMEOUT = int(os.getenv('OLLAMA_THINK_TIMEOUT', '240'))

EMBEDDING_DIM = 768  # must match database/migrations/add_rag_vector_store.sql


class OllamaError(Exception):
    """Raised when Ollama is unreachable or returns an error."""
    pass


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
            real latency cost (~24x slower in testing) for no accuracy benefit on
            this app's already-grounded answers - so it stays off unless a caller
            explicitly wants the reasoning text back (e.g. an admin-only "show
            reasoning" view), not on for every request.

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
                'options': {'temperature': 0.1},  # low temperature: stay grounded and consistent
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
                'options': {'temperature': 0.1},
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
_DOLLAR_WORD = re.compile(r'\bUSD\b|\bU\.S\.\s?dollars?\b|\bdollars?\b', re.IGNORECASE)


def normalize_currency(text: str) -> str:
    text = _DOLLAR_AMOUNT.sub(lambda m: f'Rs. {m.group(1)}', text)
    text = _DOLLAR_WORD.sub('LKR', text)
    return text


# qwen3:8b is trained on heavily multilingual (mostly Chinese+English) data
# and occasionally leaks a stray CJK/Hangul token into an otherwise-English
# sentence (e.g. "to 减轻 joint strain" instead of "to reduce joint strain") -
# a model-quality quirk, not a prompt problem, so no amount of "respond only
# in English" wording in the system prompt reliably prevents it. This app is
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
            'installed_models': installed
        }
    except requests.exceptions.RequestException:
        return {'ollama_reachable': False}