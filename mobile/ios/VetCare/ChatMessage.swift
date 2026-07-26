//
//  ChatMessage.swift
//  VetCare
//
//  A single message shown in an AI assistant conversation.
//

import Foundation

struct ChatMessage: Identifiable, Equatable {
    enum Role {
        case user
        case assistant
    }

    let id = UUID()
    let role: Role
    var text: String
    var sources: [ChatSource] = []

    /// True for a successful assistant reply. Drives the guest "source" footer
    /// (FAQ citations vs. a "general knowledge" note) and keeps it off error
    /// messages. Left false for user messages and error replies.
    var isAnswer: Bool = false
}
