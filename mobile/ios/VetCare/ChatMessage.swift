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

    /// Which AI mode produced this message. Drives the source footer label
    /// and icon — guest answers cite FAQs, pet-owner answers cite pet records.
    enum Context {
        case guest
        case petOwner
    }

    let id = UUID()
    let role: Role
    var text: String
    var sources: [ChatSource] = []
    var isAnswer: Bool = false
    var context: Context = .guest
}
