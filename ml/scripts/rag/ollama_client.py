"""
Ollama Client
Thin wrapper around the local Ollama HTTP API for embeddings + chat generation.
Runs fully locally -> no API keys, no per-token cost.

Requires Ollama running locally (default http://localhost:11434) with:
    ollama pull nomic-embed-text
    ollama pull qwen2.5:7b-instruct
"""

import os
import re
import requests
from dotenv import load_dotenv

load_dotenv()

OLLAMA_HOST = os.getenv('OLLAMA_HOST', 'http://localhost:11434')
OLLAMA_EMBED_MODEL = os.getenv('OLLAMA_EMBED_MODEL', 'nomic-embed-text')
OLLAMA_CHAT_MODEL = os.getenv('OLLAMA_CHAT_MODEL', 'qwen2.5:7b-instruct')
OLLAMA_TIMEOUT = int(os.getenv('OLLAMA_TIMEOUT', '60'))

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


def generate_answer(system_prompt: str, user_prompt: str) -> str:
    """
    Generate a chat completion using the local Ollama LLM.

    Args:
        system_prompt: instructions (grounding rules, safety wording, etc.)
        user_prompt: the question + retrieved context

    Returns:
        str: the model's answer text
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
                # Reasoning-capable models (e.g. qwen3) default to an internal
                # "thinking" pass before answering - Ollama keeps it out of
                # `content` either way, but it adds real latency (~24x slower
                # in testing) for no accuracy benefit here: every answer this
                # app generates is already grounded in retrieved context or
                # live model output, never open-ended reasoning. Ignored
                # harmlessly by models that don't support thinking mode.
                'think': False
            },
            timeout=OLLAMA_TIMEOUT
        )
        response.raise_for_status()
        message = response.json().get('message', {})
        return message.get('content', '').strip()

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