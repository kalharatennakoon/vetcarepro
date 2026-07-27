//
//  AIService.swift
//  VetCare
//
//  High-level access to the AI assistant. Each scope maps to a backend
//  endpoint that enforces its own data boundary server-side.
//

import Foundation

struct AIService {
    private let client: APIClient

    init(client: APIClient = APIClient()) {
        self.client = client
    }

    /// Guest scope: general pet-care questions only, grounded in public FAQs.
    /// No clinic or customer data is accessible. → POST /api/ai/public-chat
    func askGuest(_ question: String) async throws -> ChatResponse {
        try await client.post(
            "ai/public-chat",
            body: ChatRequest(question: question),
            as: ChatResponse.self
        )
    }

    /// Pet-owner scope: answers are grounded in the signed-in owner's own
    /// pets and records only. The server enforces the scope from the JWT.
    /// → POST /api/ai/customer-chat
    func askPetOwner(_ question: String, token: String) async throws -> ChatResponse {
        try await client.post(
            "ai/customer-chat",
            body: ChatRequest(question: question),
            bearerToken: token,
            as: ChatResponse.self
        )
    }
}
