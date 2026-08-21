//
//  AuthMode.swift
//  VetCare
//
//  Describes which portal the user is signing in to. Staff and pet owners
//  authenticate against separate backend endpoints (/api/auth vs
//  /api/customer-auth), so the login form adapts its labels to the mode.
//

import SwiftUI

enum AuthMode: Hashable {
    case staff
    case petOwner

    /// Title shown at the top of the login screen.
    var title: String {
        switch self {
        case .staff: return "Staff Sign In"
        case .petOwner: return "Pet Owner Sign In"
        }
    }

    /// Short helper line beneath the title.
    var subtitle: String {
        switch self {
        case .staff: return "For veterinarians, receptionists, and admins."
        case .petOwner: return "Access your pets' records and care."
        }
    }

    /// Label for the identifier field. Pet owners may log in with email or phone.
    var identifierLabel: String {
        switch self {
        case .staff: return "Email"
        case .petOwner: return "Email or phone"
        }
    }

    /// Placeholder text for the identifier field.
    var identifierPrompt: String {
        switch self {
        case .staff: return "you@propet.lk"
        case .petOwner: return "Email or phone number"
        }
    }

    /// Keyboard best suited to the identifier field.
    var keyboardType: UIKeyboardType {
        switch self {
        case .staff: return .emailAddress
        case .petOwner: return .default
        }
    }
}
