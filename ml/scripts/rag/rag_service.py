"""
RAG Service
Top-level orchestration: retrieve relevant chunks -> build a grounded prompt
-> generate an answer -> return answer + source citations.

This is what the Flask /api/ml/rag/chat route calls.
"""

from scripts.rag.retrieval import retrieve_chunks
from scripts.rag.ollama_client import generate_answer, OllamaError

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
