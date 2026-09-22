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

# Context window for every OLLAMA_CHAT_MODEL call - see _generation_options
# for why this is one shared value rather than per-call.
OLLAMA_NUM_CTX = int(os.getenv('OLLAMA_NUM_CTX', '8192'))
# OLLAMA_VISION_MODEL gets its own, deliberately left at Ollama's own default
# rather than raised to match: qwen3.5:9b is the larger model, and a 16k
# window on it was enough to OOM-crash the Ollama server outright on this
# 16GB deployment (see OLLAMA_VISION_MODEL above). Photo guidance is also a
# single-turn call with a short prompt, so it has far more headroom to spare
# than the chat path. Raise gradually (and watch `ollama ps`/system memory)
# if photo answers ever start coming back clipped.
OLLAMA_VISION_NUM_CTX = int(os.getenv('OLLAMA_VISION_NUM_CTX', '4096'))

EMBEDDING_DIM = 768  # must match database/migrations/add_rag_vector_store.sql


class OllamaError(Exception):
    """Raised when Ollama is unreachable or returns an error."""
    pass


def _generation_options(num_ctx: int) -> dict:
    """
    Shared `options` payload for /api/chat calls.

    num_ctx used to be set only on thinking calls, on the reasoning that
    thinking was the one path long enough to overrun Ollama's default
    window. Both halves of that turned out to be wrong, and both halves
    produced silently cut-off answers:

    1. Ollama does not fail, or even flag, a call that outgrows its window.
       It evicts tokens from the FRONT of the context and carries on,
       reporting done_reason "stop" exactly as it would for a clean finish.
       Measured against qwen3:8b: a 4054-token prompt sent with num_ctx 512
       came back with prompt_eval_count 258 and a confidently wrong answer,
       because the front of the prompt - the system prompt first, then the
       retrieved context - had been dropped before the model ever saw it.
       An answer that runs long therefore loses the very rules telling it
       how to finish, and stops mid-thought.
    2. Non-thinking calls overrun the default window routinely, so exempting
       them protected nothing. OWNER_SYSTEM_PROMPT alone measures 2752
       tokens, and a real pet-owner question prompt measures 3602 - inside
       Ollama's 4096 default that leaves under 500 tokens for the entire
       answer, and pet-owner answers are never given thinking mode, so they
       never got the wider window either. The explain/summarize reshape pass
       (rag_service._reshape_explain_summarize) is a non-thinking call too,
       and it is the one whose output IS the displayed answer.

    So: one window, applied to every call. That also stops Ollama
    evicting and reloading the whole 5.6GB model twice per admin
    explain/summarize turn - it keys its loaded instance partly on num_ctx,
    so the old think-only bump made a single turn's generate-then-reshape
    pair thrash the model in and out of memory (visible as "Stopping..." in
    `ollama ps` between the two calls).

    OLLAMA_NUM_CTX stays a moderate 8192 rather than a large value: a wider
    window means a larger KV cache, and this deployment runs on a 16GB Mac
    with very little free memory once a chat model is loaded (16384, tested
    against qwen3.5:9b back when it was also the chat model, crashed the
    Ollama server outright). 8192 is the value the thinking path already ran
    on, so applying it everywhere raises no peak beyond what that path
    already required. Raise it gradually if needed, watching `ollama ps` and
    system memory - and note that _overflowed below now reports when a call
    actually needed more, rather than leaving it to be guessed at.

    num_predict: -1 means no artificial output cap - stop at a natural end
    or at the context limit, never at an arbitrary token count.
    """
    return {'temperature': 0.1, 'num_predict': -1, 'num_ctx': num_ctx}


def _overflowed(payload: dict, num_ctx: int) -> bool:
    """
    Whether a finished /api/chat call actually used up its whole context
    window - i.e. whether Ollama silently dropped tokens off the front (see
    _generation_options). Ollama reports no flag for this, but it does
    report what it processed: prompt_eval_count + eval_count reaching the
    window is the tell, since a call that finished on its own terms stops
    well short of it. Measured on a healthy staff answer: 1814 + 1110 of
    8192.
    """
    used = (payload.get('prompt_eval_count') or 0) + (payload.get('eval_count') or 0)
    return used >= num_ctx


def _chat_request(model: str, system_prompt: str, user_prompt: str, think: bool,
                  num_ctx: int, timeout: int, images: list = None) -> dict:
    """
    One blocking /api/chat call, returning Ollama's parsed response body
    (not just the message) so callers can also see the token counts
    _overflowed needs. Shared by generate_answer and generate_vision_answer,
    which differ only in model, the optional `images` list on the user
    message, and the timeout.
    """
    user_message = {'role': 'user', 'content': user_prompt}
    if images:
        user_message['images'] = images

    response = requests.post(
        f'{OLLAMA_HOST}/api/chat',
        json={
            'model': model,
            'messages': [{'role': 'system', 'content': system_prompt}, user_message],
            'stream': False,
            'options': _generation_options(num_ctx),
            'think': think
        },
        timeout=timeout
    )
    response.raise_for_status()
    return response.json()


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
        payload = _chat_request(
            OLLAMA_CHAT_MODEL, system_prompt, user_prompt, think,
            OLLAMA_NUM_CTX, OLLAMA_THINK_TIMEOUT if think else OLLAMA_TIMEOUT
        )
        message = payload.get('message', {})
        content = message.get('content', '').strip()
        thinking = message.get('thinking', '').strip() if think else None

        # The window ran out (see _overflowed), so this answer is cut off -
        # and on a thinking call the reasoning pass is what ate the room:
        # measured on one staff answer, 3788 characters of thinking against
        # 1016 of actual answer. Retrying without it hands the whole window
        # back to the answer itself, which is the part the user reads.
        # Costs one extra call, only on a turn that would otherwise have
        # been cut off, and a non-thinking call is the fast path anyway
        # (~24x, see above). A retry that comes back empty is discarded -
        # a truncated answer still beats none.
        if _overflowed(payload, OLLAMA_NUM_CTX):
            if think:
                print(
                    f'[ollama] answer hit the {OLLAMA_NUM_CTX}-token context window - '
                    'retrying without thinking mode so the answer itself has room'
                )
                retry = _chat_request(
                    OLLAMA_CHAT_MODEL, system_prompt, user_prompt, False,
                    OLLAMA_NUM_CTX, OLLAMA_TIMEOUT
                )
                retry_content = retry.get('message', {}).get('content', '').strip()
                if retry_content:
                    content = retry_content
            else:
                # Nothing to drop on a non-thinking call, so nothing to
                # retry - but say so rather than serving the cut-off answer
                # in silence, which is what made this class of bug so hard
                # to place. A recurring warning here means OLLAMA_NUM_CTX
                # needs raising (or that prompt needs shortening).
                print(
                    f'[ollama] answer hit the {OLLAMA_NUM_CTX}-token context window and was '
                    'cut off - consider raising OLLAMA_NUM_CTX'
                )

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
        payload = _chat_request(
            OLLAMA_VISION_MODEL, system_prompt, user_prompt, think,
            OLLAMA_VISION_NUM_CTX, OLLAMA_THINK_TIMEOUT if think else OLLAMA_VISION_TIMEOUT,
            images=[image_b64]
        )
        message = payload.get('message', {})
        content = message.get('content', '').strip()
        thinking = message.get('thinking', '').strip() if think else None
        if _overflowed(payload, OLLAMA_VISION_NUM_CTX):
            # No retry here, unlike generate_answer: photo guidance never
            # asks for thinking mode, so there's no reasoning pass to drop
            # and nothing a second identical call would do differently.
            # Worth saying out loud though - it means OLLAMA_VISION_NUM_CTX
            # needs raising.
            print(
                f'[ollama] vision answer hit the {OLLAMA_VISION_NUM_CTX}-token context '
                'window and was cut off - consider raising OLLAMA_VISION_NUM_CTX'
            )
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
                'options': _generation_options(OLLAMA_NUM_CTX),
                'think': think
            },
            timeout=OLLAMA_THINK_TIMEOUT if think else OLLAMA_TIMEOUT,
            stream=True
        )
        response.raise_for_status()

        content_parts = []
        thinking_parts = []
        # The streamed chunk carrying done=True also carries the token
        # counts _overflowed reads, same as a blocking response body.
        final_chunk = {}
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
                final_chunk = chunk
                break

        content = ''.join(content_parts).strip()
        thinking = ''.join(thinking_parts).strip() or None

        # Same cut-off recovery as generate_answer - see the comment there.
        # The reasoning already streamed to the client is kept as-is (it's
        # genuinely what the model thought, and re-streaming a second
        # reasoning pass over the top of it would only confuse); only the
        # answer is regenerated, via a plain blocking call since there are
        # no thinking deltas left to watch.
        if think and _overflowed(final_chunk, OLLAMA_NUM_CTX):
            print(
                f'[ollama] streamed answer hit the {OLLAMA_NUM_CTX}-token context window - '
                'retrying without thinking mode so the answer itself has room'
            )
            try:
                retry = _chat_request(
                    OLLAMA_CHAT_MODEL, system_prompt, user_prompt, False,
                    OLLAMA_NUM_CTX, OLLAMA_TIMEOUT
                )
                retry_content = retry.get('message', {}).get('content', '').strip()
                if retry_content:
                    content = retry_content
            except requests.exceptions.RequestException as e:
                # Keep the truncated answer rather than failing the whole
                # turn - the caller already has something to show.
                print(f'[ollama] cut-off retry failed, keeping the truncated answer: {e}')

        yield {'type': 'done', 'content': content, 'thinking': thinking}

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