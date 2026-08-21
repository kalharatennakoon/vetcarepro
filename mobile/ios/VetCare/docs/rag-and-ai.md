# RAG and AI — How the VetCare Pro Assistant Works

## The Problem

A standard AI model is trained on general internet data. It does not know:

- Your pet's vaccination history
- Your clinic's specific FAQ articles
- Any private or clinic-specific information

So if you ask *"What vaccines has Bella had?"*, a general AI has no idea. It would either make something up or say "I don't know."

**RAG (Retrieval-Augmented Generation) solves this** by finding relevant information first and giving it to the AI right before it answers.

---

## Key Concepts

### Chunk

A large document (e.g. a 10-page clinic FAQ) is split into small, manageable pieces called **chunks**. Each chunk is typically 1–3 paragraphs.

```
FAQ Document
    ├── Chunk 1: "Dogs need a rabies vaccine every 3 years..."
    ├── Chunk 2: "Cats need an annual FVRCP booster..."
    ├── Chunk 3: "Flea prevention is recommended year-round..."
    └── Chunk 4: "Emergency signs include difficulty breathing..."
```

Chunking allows the system to retrieve only the *relevant* pieces instead of feeding the entire document into every request.

---

### Embedding

An **embedding model** is a special AI model that converts any piece of text into a list of numbers called a **vector**. These numbers capture the *meaning* of the text — not the exact words.

```
"Dogs need rabies vaccine"  →  [0.82, 0.14, 0.67, 0.33, ...]
"Is my dog up to date?"     →  [0.79, 0.18, 0.71, 0.30, ...]
"Flea prevention tips"      →  [0.12, 0.91, 0.05, 0.88, ...]
```

Texts with **similar meaning** produce vectors with **similar numbers**, even if they use completely different words.

---

### Vector

A **vector** is just a list of numbers (e.g. hundreds or thousands of them) that represents the meaning of a piece of text in a mathematical space. You can measure how "close" two vectors are — the closer they are, the more similar the meaning.

This is how the system finds a chunk about "rabies vaccines" when you ask "is my dog up to date on shots?" — the words are different, but the meaning vectors are close.

---

### Vector Database

All chunk vectors are pre-computed and stored in a **vector database**. When a question comes in, the database finds the chunks whose vectors are closest to the question's vector. This is called a **similarity search**.

```
Vector DB
    ├── Chunk 1 vector: [0.82, 0.14, 0.67, ...]
    ├── Chunk 2 vector: [0.45, 0.71, 0.22, ...]
    ├── Chunk 3 vector: [0.12, 0.91, 0.05, ...]
    └── Chunk 4 vector: [0.33, 0.55, 0.89, ...]
```

---

## The Full RAG Flow

Here is exactly what happens when a user asks a question in the VetCare app:

```
User asks: "What vaccines does my dog need?"
         │
         ▼
1. EMBED the question
   → embedding model converts the question into a vector
   → [0.79, 0.18, 0.71, 0.30, ...]

         │
         ▼
2. SEARCH the vector database
   → find chunks whose vectors are closest to the question vector
   → Chunk 1 matches: "Dogs need rabies vaccine every 3 years..."
   → Chunk 2 matches: "Cats need annual FVRCP booster..."

         │
         ▼
3. BUILD a prompt for the AI model
   → combine the question + the retrieved chunks:

   "Answer this question using only the information below.

    [Chunk 1 text]
    [Chunk 2 text]

    Question: What vaccines does my dog need?"

         │
         ▼
4. AI GENERATES an answer
   → reads the chunks and writes a response grounded in them
   → "Based on our records, dogs need a rabies vaccine every 3 years..."

         │
         ▼
5. SERVER sends the response back to the app:
   {
     "answer": "Based on our records...",
     "sources": [ Chunk 1, Chunk 2 ],
     "chunks_used": 2
   }
```

`chunks_used` tells the app how many chunks were retrieved. `sources` is the list of original documents those chunks came from — displayed in the UI as citation chips under the assistant's reply.

---

## Two Scopes in VetCare Pro

The app has two AI chat modes, each hitting a different backend endpoint with a different data boundary.

| Mode | Endpoint | What the AI can see |
|---|---|---|
| Guest | `POST /api/ai/public-chat` | Clinic FAQ articles only |
| Pet Owner | `POST /api/ai/customer-chat` | That owner's own pets' records only |

The pet owner's **JWT token** is attached to the request. The server reads it, identifies the owner, and restricts the vector search to only that owner's data. The app itself does not enforce this — it is enforced entirely server-side.

---

## Why the AI Sometimes Says "General Veterinary Knowledge"

The answer footer in the chat UI shows one of two things:

- **"From our clinic FAQs"** — the vector search found matching chunks and the answer is grounded in them.
- **"General veterinary knowledge"** — no FAQ chunk was close enough to the question, so the AI fell back to its own trained knowledge.

This distinction is surfaced in the UI so users know whether the answer comes from a specific clinic source or from the model's general knowledge.

---

## Glossary

| Term | Meaning |
|---|---|
| **RAG** | Retrieval-Augmented Generation — find relevant chunks, feed them to the AI, AI answers using them |
| **Chunk** | A small piece of a document stored separately for retrieval |
| **Embedding** | Converting text into a vector using a special model |
| **Vector** | A list of numbers representing the meaning of text |
| **Vector DB** | A database that stores vectors and supports similarity search |
| **Similarity search** | Finding vectors (and their source chunks) that are numerically close to a query vector |
| **chunks_used** | How many chunks were retrieved and fed into the AI for a given answer |
| **sources** | The original documents the retrieved chunks came from |
