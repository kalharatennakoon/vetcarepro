//
//  WelcomeView.swift
//  VetCare
//
//  Landing screen offering the three entry points that mirror the web app:
//  staff sign-in, pet-owner sign-in, and a guest experience.
//

import SwiftUI

struct WelcomeView: View {
    var body: some View {
        ZStack {
            Color.appBackground.ignoresSafeArea()

            VStack(spacing: 0) {
                Spacer()
                brandmark
                Spacer()
                actions
            }
            .padding(.horizontal, 28)
            .padding(.bottom, 40)
        }
        .toolbar(.hidden, for: .navigationBar)
    }

    // MARK: - Brand mark

    private var brandmark: some View {
        VStack(spacing: 18) {
            ZStack {
                Circle()
                    .fill(LinearGradient.brand)
                    .frame(width: 104, height: 104)
                    .shadow(color: .brand.opacity(0.35), radius: 16, y: 8)
                Image(systemName: "pawprint.fill")
                    .font(.system(size: 46, weight: .semibold))
                    .foregroundStyle(.white)
            }

            VStack(spacing: 6) {
                Text("VetCare Pro")
                    .font(.system(size: 32, weight: .bold, design: .rounded))
                    .foregroundStyle(.primary)
                Text("Smart veterinary clinic management")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
            }
        }
    }

    // MARK: - Actions

    private var actions: some View {
        VStack(spacing: 14) {
            // Primary: pet owner
            NavigationLink(value: WelcomeRoute.login(.petOwner)) {
                PillLabel(title: "Sign In — Pet Owner", style: .filled)
            }

            // Divider
            HStack(spacing: 10) {
                Rectangle()
                    .fill(Color.black.opacity(0.1))
                    .frame(height: 1)
                Text("or")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.secondary)
                Rectangle()
                    .fill(Color.black.opacity(0.1))
                    .frame(height: 1)
            }

            // Secondary: guest
            NavigationLink(value: WelcomeRoute.guest) {
                PillLabel(title: "Continue as Guest", style: .outlined)
            }

            // AI note
            VStack(spacing: 6) {
                Image(systemName: "wand.and.stars")
                    .font(.subheadline)
                    .foregroundStyle(Color.brand)
                Text("Ask our **AI Assistant** general pet care questions\n(no account needed)")
                    .font(.caption)
                    .foregroundStyle(Color.brand)
                    .multilineTextAlignment(.center)
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 12)
            .frame(maxWidth: .infinity)
            .background(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .fill(Color.brand.opacity(0.10))
                    .overlay(
                        RoundedRectangle(cornerRadius: 12, style: .continuous)
                            .strokeBorder(Color.brand.opacity(0.30), lineWidth: 1)
                    )
            )

            // Staff login — demoted to small link
            VStack(spacing: 6) {
                Divider()
                    .padding(.top, 4)
                Text("Your account and pet records are kept private and secure.")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                NavigationLink(value: WelcomeRoute.login(.staff)) {
                    Text("Clinic Staff Login")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(.secondary)
                        .underline()
                }
            }
        }
    }
}

/// A full-width pill-shaped label used for the primary navigation actions.
struct PillLabel: View {
    enum Style {
        case filled
        case outlined
    }

    let title: String
    let style: Style

    var body: some View {
        Text(title)
            .font(.headline)
            .frame(maxWidth: .infinity)
            .frame(height: 54)
            .foregroundStyle(style == .filled ? Color.white : Color.brand)
            .background(background)
            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
    }

    @ViewBuilder
    private var background: some View {
        switch style {
        case .filled:
            LinearGradient.brand
        case .outlined:
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .strokeBorder(Color.brand, lineWidth: 1.5)
                .background(Color.white.clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous)))
        }
    }
}

#Preview {
    NavigationStack {
        WelcomeView()
    }
}
