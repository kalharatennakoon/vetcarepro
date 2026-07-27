//
//  PetOwnerChatViewModel.swift
//  VetCare
//
//  Drives the pet-owner AI assistant. Uses POST /api/ai/customer-chat with
//  the owner's JWT, so the server scopes answers to their own pets only.
//

import Foundation

@MainActor
@Observable
final class PetOwnerChatViewModel {
    private(set) var messages: [ChatMessage] = []
    var input: String = ""
    private(set) var isThinking = false

    private let service: AIService
    private let token: String

    let suggestedPrompts = [
        "What vaccines has my pet had?",
        "Summarize my pet's recent medical history",
        "What aftercare should I follow after the last visit?"
    ]

    init(token: String, service: AIService? = nil) {
        self.token = token
        self.service = service ?? AIService()
        messages = [ChatMessage(
            role: .assistant,
            text: "Hi! Ask me about your pets' records, vaccination history, or care instructions. I only answer using your own pets' data, and always defer final medical judgment to your veterinarian."
        )]
    }

    var canSend: Bool {
        !input.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && !isThinking
    }

    /// True when only the intro message is present (no conversation yet).
    var isEmpty: Bool { messages.count <= 1 }

    func send(_ prompt: String? = nil) async {
        let question = (prompt ?? input).trimmingCharacters(in: .whitespacesAndNewlines)
        guard !question.isEmpty, !isThinking else { return }

        input = ""
        messages.append(ChatMessage(role: .user, text: question))
        isThinking = true
        defer { isThinking = false }

        do {
            let response = try await service.askPetOwner(question, token: token)
            messages.append(
                ChatMessage(role: .assistant, text: response.answer, sources: response.sources, isAnswer: true)
            )
        } catch {
            let reason = (error as? APIError)?.errorDescription ?? error.localizedDescription
            messages.append(
                ChatMessage(role: .assistant, text: "Sorry — I couldn't answer that right now.\n\n\(reason)")
            )
        }
    }
}
