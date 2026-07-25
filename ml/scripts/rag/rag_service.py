"""
RAG Service
Top-level orchestration: retrieve relevant chunks -> build a grounded prompt
-> generate an answer -> return answer + source citations.

This is what the Flask /api/ml/rag/chat route calls.
"""

from scripts.rag.retrieval import retrieve_chunks
from scripts.rag.ollama_client import generate_answer, OllamaError
from scripts.rag.structured_query import try_structured_answer

SYSTEM_PROMPT = """You are the VetCare Pro AI assistant, a decision-support tool \
for a veterinary clinic. You must follow these rules strictly:

1. Answer ONLY using the information given in the "Context" section below. \
If the context does not contain enough information to answer, say so plainly \
- do not guess or use outside knowledge.
2. You are NOT a veterinarian. Never state a diagnosis as fact. When discussing \
medical matters, use phrasing like "based on the available records, this may \
help the veterinarian review..." rather than definitive medical conclusions.
3. Keep answers concise and clear. If summarizing a pet's history, use plain, \
owner-friendly language unless the audience is clinic staff.
4. Never invent record details, dates, medications, or dosages that are not in \
the context.
5. The context you're given is a small SAMPLE of matching records (not the full \
dataset). If asked for a count, total, or complete list (e.g. "how many...", \
"list all..."), do NOT calculate or guess a number from the sample - say that \
you can only see a partial sample and the person should check the relevant \
page in the app (e.g. Pets, Disease Cases) for an exact count.
"""


def answer_question(question: str, role: str, customer_id: str = None, top_k: int = 5) -> dict:
    """
    Full RAG pipeline: retrieve -> generate -> return grounded answer + citations.

    Returns:
        dict: {
            'answer': str,
            'sources': [{'source_type', 'source_id', 'metadata'}, ...],
            'chunks_used': int
        }
    """
    # Counting/listing questions ("how many pets are named X") are unreliable
    # with pure semantic retrieval - answer them exactly via SQL when we can.
    structured = try_structured_answer(question, role=role, customer_id=customer_id)
    if structured is not None:
        return structured

    chunks = retrieve_chunks(question, role=role, customer_id=customer_id, top_k=top_k)

    if not chunks:
        return {
            'answer': (
                "I couldn't find any relevant clinic records or information to "
                "answer that. Please rephrase, or check with clinic staff directly."
            ),
            'sources': [],
            'chunks_used': 0
        }

    context_block = '\n\n---\n\n'.join(
        f"[Source {i+1}: {c['source_type']} #{c['source_id']}]\n{c['content']}"
        for i, c in enumerate(chunks)
    )

    user_prompt = f"""Context:
{context_block}

Question: {question}

Answer using only the context above, and mention which source(s) you used (e.g. "Source 1")."""

    try:
        answer_text = generate_answer(SYSTEM_PROMPT, user_prompt)
    except OllamaError as e:
        return {
            'answer': f"AI assistant is currently unavailable: {str(e)}",
            'sources': [],
            'chunks_used': 0,
            'error': True
        }

    return {
        'answer': answer_text,
        'sources': [
            {
                'source_type': c['source_type'],
                'source_id': c['source_id'],
                'metadata': c.get('metadata', {})
            }
            for c in chunks
        ],
        'chunks_used': len(chunks)
    }


EXPLAIN_SYSTEM_PROMPT = """You are the VetCare Pro AI assistant. You will be given \
the raw output of one of the clinic's existing machine learning models (disease \
outbreak risk, sales forecasting, or inventory demand forecasting). Your job is to \
explain that output in clear, plain language for clinic staff.

Rules:
1. Base your explanation ONLY on the numbers/fields given to you. Do not invent \
figures that are not present.
2. Do not present the model's output as a certainty - use language like "the model \
estimates" or "based on current trends".
3. Keep it concise: 2-4 sentences, plain English, no jargon unless you also explain it.
4. If the data looks incomplete or you can't make sense of it, say so rather than \
guessing.
"""


def explain_ml_output(output_type: str, data: dict) -> str:
    """
    Translate a raw ML model output (outbreak risk, sales forecast, inventory
    forecast, etc.) into a plain-language explanation.

    Args:
        output_type: a short label, e.g. 'outbreak_risk', 'sales_forecast',
                      'inventory_forecast' - included in the prompt for context.
        data: the raw JSON/dict output from the ML model.

    Returns:
        str: plain-language explanation
    """
    import json

    user_prompt = f"""Model output type: {output_type}

Raw data:
{json.dumps(data, indent=2, default=str)}

Explain this output in plain language for clinic staff."""

    try:
        return generate_answer(EXPLAIN_SYSTEM_PROMPT, user_prompt)
    except OllamaError as e:
        return f"Could not generate an explanation right now: {str(e)}"