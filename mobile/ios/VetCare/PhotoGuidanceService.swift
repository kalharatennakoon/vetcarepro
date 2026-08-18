//
//  PhotoGuidanceService.swift
//  VetCare
//
//  Network calls for the AI photo guidance feature (submit a photo, poll
//  the async job, fetch history). Same thin-wrapper-over-APIClient shape as
//  AIService/CustomerAuthService.
//

import Foundation

struct PhotoGuidanceService {
    private let client = APIClient()

    /// Submits a photo (+ optional note) of one of the customer's own pets.
    /// Resolves as soon as the job is recorded server-side - the guidance
    /// itself is generated in the background (~3 minutes) and fetched via
    /// pollStatus.
    func submit(petId: String, imageData: Data, note: String?, token: String) async throws -> PhotoGuidanceJob {
        var fields: [String: String] = [:]
        if let note, !note.isEmpty {
            fields["note"] = note
        }
        let response = try await client.postMultipart(
            "customer-auth/pets/\(petId)/ai-photo-guidance",
            fields: fields,
            fileField: "photo",
            fileData: imageData,
            fileName: "pet-photo.jpg",
            mimeType: "image/jpeg",
            bearerToken: token,
            as: PhotoGuidanceJobResponse.self
        )
        return response.job
    }

    func pollStatus(jobId: Int, token: String) async throws -> PhotoGuidanceJob {
        let response = try await client.get(
            "customer-auth/ai-photo-guidance/\(jobId)",
            bearerToken: token,
            as: PhotoGuidanceJobResponse.self
        )
        return response.job
    }

    func history(petId: String, token: String) async throws -> [PhotoGuidanceJob] {
        let response = try await client.get(
            "customer-auth/pets/\(petId)/ai-photo-guidance",
            bearerToken: token,
            as: PhotoGuidanceHistoryResponse.self
        )
        return response.jobs
    }
}
