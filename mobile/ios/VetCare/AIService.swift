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
}
