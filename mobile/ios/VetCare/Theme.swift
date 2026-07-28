//
//  Theme.swift
//  VetCare
//
//  Shared colors and styling for the VetCare Pro app.
//

import SwiftUI
import UIKit

extension Color {
    /// Primary brand color for VetCare Pro — a calm medical teal.
    static let brand = Color(red: 0.07, green: 0.49, blue: 0.55)

    /// Darker brand shade, used for gradients and pressed states.
    static let brandDark = Color(red: 0.05, green: 0.35, blue: 0.41)

    /// Grouped view background — light gray in light mode, near-black in dark mode.
    static let appBackground = Color(UIColor.systemGroupedBackground)

    /// Card / elevated surface — white in light mode, elevated dark in dark mode.
    static let cardSurface = Color(UIColor.secondarySystemGroupedBackground)
}

extension LinearGradient {
    /// Top-to-bottom brand gradient used for the logo mark and primary buttons.
    static let brand = LinearGradient(
        colors: [.brand, .brandDark],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )
}
