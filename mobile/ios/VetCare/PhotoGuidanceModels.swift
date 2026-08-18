//
//  PhotoGuidanceModels.swift
//  VetCare
//
//  Wire models for the AI photo guidance feature. Matches the backend
//  contract:
//  POST /api/customer-auth/pets/:petId/ai-photo-guidance (multipart: photo, note)
//  -> { "status": "success", "job": { ... } }
//  GET  /api/customer-auth/ai-photo-guidance/:jobId
//  -> { "status": "success", "job": { ... } }
//  GET  /api/customer-auth/pets/:petId/ai-photo-guidance
//  -> { "status": "success", "jobs": [ ... ] }
//

import Foundation

/// A single async AI photo guidance job. Generation takes ~3 minutes (a
/// vision-capable local model), so this is a submit-then-poll flow -
/// `status` moves pending -> processing -> completed/failed server-side.
struct PhotoGuidanceJob: Codable, Identifiable {
    let jobId: Int
    let petId: String
    let status: String
    let ownerNote: String?
    let guidanceText: String?
    let errorMessage: String?
    let createdAt: String

    var id: Int { jobId }

    enum CodingKeys: String, CodingKey {
        case jobId = "job_id"
        case petId = "pet_id"
        case status
        case ownerNote = "owner_note"
        case guidanceText = "guidance_text"
        case errorMessage = "error_message"
        case createdAt = "created_at"
    }

    var isFinished: Bool { status == "completed" || status == "failed" }

    var statusDisplayName: String {
        switch status {
        case "pending": return "Waiting to start"
        case "processing": return "Analyzing photo…"
        case "completed": return "Ready"
        case "failed": return "Failed"
        default: return status.capitalized
        }
    }

    var createdAtFormatted: String {
        let iso = ISO8601DateFormatter()
        iso.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        let date = iso.date(from: createdAt) ?? ISO8601DateFormatter().date(from: createdAt)
        guard let d = date else { return String(createdAt.prefix(10)) }
        let out = DateFormatter()
        out.dateStyle = .medium
        out.timeStyle = .short
        return out.string(from: d)
    }
}

struct PhotoGuidanceJobResponse: Decodable {
    let job: PhotoGuidanceJob
}

struct PhotoGuidanceHistoryResponse: Decodable {
    let jobs: [PhotoGuidanceJob]
}
