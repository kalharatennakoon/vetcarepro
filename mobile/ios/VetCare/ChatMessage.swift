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
}
