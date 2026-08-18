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

    // Round-trips an in-progress pet disambiguation ("which pet do you
    // mean?") across turns - there's no server-side conversation session, so
    // this (plus recent message history) is how the assistant remembers what
    // it already asked. Same stateless pattern as the web widget.
    private var pendingIntent: PendingIntent?

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

    /// - Parameters:
    ///   - prompt: the question actually sent to the server. Defaults to the
    ///     typed input.
    ///   - displayText: what's shown in the user's chat bubble, if different
    ///     from `prompt` - used when a disambiguation option's `value` (e.g.
    ///     "pet Max") isn't what should appear on screen (its `display`, e.g.
    ///     "Max"). Defaults to `prompt` for a normal typed/tapped message.
    func send(_ prompt: String? = nil, displayText: String? = nil) async {
        let question = (prompt ?? input).trimmingCharacters(in: .whitespacesAndNewlines)
        guard !question.isEmpty, !isThinking else { return }

        // Last few turns give the assistant enough context to keep filling
        // in a multi-turn disambiguation (e.g. answering "Max" after being
        // asked which pet is meant). messages[0] is always the fixed intro
        // bubble, never a real turn, so it's excluded the same way the web
        // widget excludes its `intro`-flagged message.
        let history = messages.dropFirst().suffix(6).map {
            ChatHistoryTurn(role: $0.role == .user ? "user" : "assistant", content: $0.text)
        }

        input = ""
        messages.append(ChatMessage(role: .user, text: displayText ?? question))
        isThinking = true
        defer { isThinking = false }

        do {
            let response = try await service.askPetOwner(
                question, token: token, history: Array(history), pendingIntent: pendingIntent
            )
            pendingIntent = response.pendingIntent
            messages.append(
                ChatMessage(
                    role: .assistant, text: response.answer, sources: response.sources,
                    isAnswer: true, context: .petOwner, options: response.options
                )
            )
        } catch {
            let reason = (error as? APIError)?.errorDescription ?? error.localizedDescription
            messages.append(
                ChatMessage(role: .assistant, text: "Sorry — I couldn't answer that right now.\n\n\(reason)")
            )
        }
    }

    /// Handles a tap on one of a message's disambiguation `options` -
    /// resubmits the option's value as the next question (showing its
    /// display text in the bubble instead) and hides that message's buttons,
    /// mirroring the web widget's handleOptionClick.
    func selectOption(_ option: ChatOption, from message: ChatMessage) async {
        if let index = messages.firstIndex(where: { $0.id == message.id }) {
            messages[index].optionsResolved = true
        }
        await send(option.value, displayText: option.display)
    }
}
