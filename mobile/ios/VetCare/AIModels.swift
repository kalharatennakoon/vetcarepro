//
//  AIModels.swift
//  VetCare
//
//  Wire models for the AI assistant endpoints. Matches the backend contract:
//  POST /api/ai/public-chat  { "question": "..." }
//  -> { "success": true, "answer": "...", "sources": [...], "chunks_used": N }
//

import Foundation

/// Request body for any AI chat endpoint.
struct ChatRequest: Encodable {
    let question: String
}

/// Response envelope returned by the AI chat endpoints.
struct ChatResponse: Decodable {
    let answer: String
    let sources: [ChatSource]
    let chunksUsed: Int

    enum CodingKeys: String, CodingKey {
        case answer
        case sources
        case chunksUsed = "chunks_used"
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        answer = try container.decode(String.self, forKey: .answer)
        sources = (try? container.decode([ChatSource].self, forKey: .sources)) ?? []
        chunksUsed = (try? container.decode(Int.self, forKey: .chunksUsed)) ?? 0
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
