//
//  Theme.swift
//  VetCare
//
//  Shared colors and styling for the VetCare Pro app.
//

import SwiftUI

extension Color {
    /// Primary brand color for VetCare Pro — a calm medical teal.
    static let brand = Color(red: 0.07, green: 0.49, blue: 0.55)

    /// Darker brand shade, used for gradients and pressed states.
    static let brandDark = Color(red: 0.05, green: 0.35, blue: 0.41)

    /// Soft neutral background for full-screen views.
    static let appBackground = Color(red: 0.96, green: 0.97, blue: 0.98)
}

extension LinearGradient {
    /// Top-to-bottom brand gradient used for the logo mark and primary buttons.
    static let brand = LinearGradient(
        colors: [.brand, .brandDark],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )
}
