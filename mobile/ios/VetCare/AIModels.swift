//
//  AIModels.swift
//  VetCare
//
//  Wire models for the AI assistant endpoints. Matches the backend contract:
//  POST /api/ai/public-chat  { "question": "..." }
//  -> { "success": true, "answer": "...", "sources": [...], "chunks_used": N }
//

import Foundation

/// A single prior turn, sent back on the pet-owner endpoint so the assistant
/// has enough context to keep filling in a multi-turn disambiguation (e.g.
/// answering "Max" after being asked which pet is meant). There is no
/// server-side conversation session - see rag_service.py's docstring.
struct ChatHistoryTurn: Encodable {
    let role: String
    let content: String
}

/// Round-trips an in-progress pet disambiguation ("which pet do you mean?")
/// across turns. For the pet-owner endpoint this is always exactly
/// {"type": "general_qa_disambiguation", "original_question": "..."} - see
/// rag_service.py's _route_to_generation, the only pending_intent shape it
/// ever returns for role='pet_owner' (the richer shapes with `slots`/`stage`
/// belong to action_intent.py/clinical_tools.py/pet_health_intent.py, which
/// are staff/admin-only and never reached via this endpoint).
struct PendingIntent: Codable, Equatable {
    let type: String
    let originalQuestion: String

    enum CodingKeys: String, CodingKey {
        case type
        case originalQuestion = "original_question"
    }
}

/// A disambiguation choice ("Loki" / "Max") offered alongside `answer` when
/// the question needs clarifying. Tapping one re-submits `value` as the next
/// question (round-tripping `pendingIntent` from the same response) while
/// showing `display` in the chat bubble - mirrors the web widget's
/// handleOptionClick.
struct ChatOption: Decodable, Identifiable, Hashable {
    let label: String
    let value: String
    let display: String

    var id: String { value }
}

/// Request body for any AI chat endpoint.
struct ChatRequest: Encodable {
    let question: String
    var history: [ChatHistoryTurn]?
    var pendingIntent: PendingIntent?

    enum CodingKeys: String, CodingKey {
        case question
        case history
        case pendingIntent = "pending_intent"
    }
}

/// Response envelope returned by the AI chat endpoints.
struct ChatResponse: Decodable {
    let answer: String
    let sources: [ChatSource]
    let chunksUsed: Int
    let options: [ChatOption]
    let pendingIntent: PendingIntent?

    enum CodingKeys: String, CodingKey {
        case answer
        case sources
        case chunksUsed = "chunks_used"
        case options
        case pendingIntent = "pending_intent"
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        answer = try container.decode(String.self, forKey: .answer)
        sources = (try? container.decode([ChatSource].self, forKey: .sources)) ?? []
        chunksUsed = (try? container.decode(Int.self, forKey: .chunksUsed)) ?? 0
        options = (try? container.decode([ChatOption].self, forKey: .options)) ?? []
        pendingIntent = try? container.decode(PendingIntent.self, forKey: .pendingIntent)
    }
}

/// A single grounding citation. For guest mode these are always FAQ entries.
struct ChatSource: Decodable, Identifiable, Hashable {
    let sourceType: String
    let sourceID: String
    let question: String?
    let category: String?

    var id: String { "\(sourceType)#\(sourceID)" }

    /// Short label suitable for a citation chip.
    var label: String {
        if let question, !question.isEmpty { return question }
        return "\(sourceType) \(sourceID)"
    }

    private enum CodingKeys: String, CodingKey {
        case sourceType = "source_type"
        case sourceID = "source_id"
        case metadata
    }

    /// The `metadata` blob varies by source type; we only surface a couple of
    /// display-friendly fields and tolerate anything else.
    private struct Metadata: Decodable {
        let question: String?
        let category: String?
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        sourceType = (try? container.decode(String.self, forKey: .sourceType)) ?? "source"

        // source_id is a VARCHAR server-side, but decode defensively either way.
        if let string = try? container.decode(String.self, forKey: .sourceID) {
            sourceID = string
        } else if let int = try? container.decode(Int.self, forKey: .sourceID) {
            sourceID = String(int)
        } else {
            sourceID = ""
        }

        let metadata = try? container.decode(Metadata.self, forKey: .metadata)
        question = metadata?.question
        category = metadata?.category
    }
}
