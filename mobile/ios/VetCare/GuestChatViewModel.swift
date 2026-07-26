//
//  GuestChatViewModel.swift
//  VetCare
//
//  Drives the guest AI assistant conversation.
//

import Foundation

@MainActor
@Observable
final class GuestChatViewModel {
    private(set) var messages: [ChatMessage] = []
    var input: String = ""
    private(set) var isThinking = false

    private let service: AIService

    /// Starter questions shown on the empty state.
    let suggestedPrompts = [
        "What vaccines does a new puppy need?",
        "How often should I feed my cat?",
        "When should I bring my pet in for a check-up?",
        "What counts as a pet emergency?"
    ]

    init(service: AIService? = nil) {
        self.service = service ?? AIService()
    }

    var canSend: Bool {
        !input.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && !isThinking
    }

    var isEmpty: Bool { messages.isEmpty }

    /// Sends the given text (or the current input) and appends the reply.
    func send(_ prompt: String? = nil) async {
        let question = (prompt ?? input).trimmingCharacters(in: .whitespacesAndNewlines)
        guard !question.isEmpty, !isThinking else { return }

        input = ""
        messages.append(ChatMessage(role: .user, text: question))
        isThinking = true
        defer { isThinking = false }

        do {
            let response = try await service.askGuest(question)
            messages.append(
                ChatMessage(role: .assistant, text: response.answer, sources: response.sources)
            )
        } catch {
            let reason = (error as? APIError)?.errorDescription ?? error.localizedDescription
            messages.append(
                ChatMessage(role: .assistant, text: "Sorry — I couldn't answer that right now.\n\n\(reason)")
            )
        }
    }
}
