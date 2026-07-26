//
//  LoginView.swift
//  VetCare
//
//  Shared sign-in form for both staff and pet-owner portals. The fields adapt
//  to the AuthMode. Backend authentication is not wired up yet — submitting
//  validates input and shows a placeholder until the networking layer lands.
//

import SwiftUI

struct LoginView: View {
    let mode: AuthMode

    @State private var identifier = ""
    @State private var password = ""
    @State private var isPasswordVisible = false
    @State private var isSubmitting = false
    @State private var message: String?

    @FocusState private var focusedField: Field?

    private enum Field {
        case identifier
        case password
    }

    var body: some View {
        ZStack {
            Color.appBackground.ignoresSafeArea()

            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    header
                    fields
                    signInButton
                    if let message {
                        infoBanner(message)
                    }
                }
                .padding(.horizontal, 28)
                .padding(.top, 12)
            }
            .scrollDismissesKeyboard(.interactively)
        }
        .navigationTitle("")
        .navigationBarTitleDisplayMode(.inline)
    }

    // MARK: - Header

    private var header: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(mode.title)
                .font(.system(size: 28, weight: .bold, design: .rounded))
            Text(mode.subtitle)
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .padding(.top, 8)
    }

    // MARK: - Fields

    private var fields: some View {
        VStack(spacing: 16) {
            FieldContainer(label: mode.identifierLabel) {
                TextField(mode.identifierPrompt, text: $identifier)
                    .keyboardType(mode.keyboardType)
                    .textContentType(mode == .staff ? .emailAddress : .username)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                    .focused($focusedField, equals: .identifier)
                    .submitLabel(.next)
                    .onSubmit { focusedField = .password }
            }

            FieldContainer(label: "Password") {
                HStack {
                    Group {
                        if isPasswordVisible {
                            TextField("Your password", text: $password)
                        } else {
                            SecureField("Your password", text: $password)
                        }
                    }
                    .textContentType(.password)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                    .focused($focusedField, equals: .password)
                    .submitLabel(.go)
                    .onSubmit { Task { await signIn() } }

                    Button {
                        isPasswordVisible.toggle()
                    } label: {
                        Image(systemName: isPasswordVisible ? "eye.slash" : "eye")
                            .foregroundStyle(.secondary)
                    }
                }
            }
        }
    }

    // MARK: - Sign in

    private var signInButton: some View {
        Button {
            Task { await signIn() }
        } label: {
            ZStack {
                PillLabel(title: "Sign In", style: .filled)
                    .opacity(isSubmitting ? 0 : 1)
                if isSubmitting {
                    ProgressView()
                        .tint(.white)
                }
            }
        }
        .disabled(!isValid || isSubmitting)
        .opacity(isValid ? 1 : 0.5)
    }

    private func infoBanner(_ text: String) -> some View {
        Text(text)
            .font(.footnote)
            .foregroundStyle(.secondary)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(12)
            .background(
                RoundedRectangle(cornerRadius: 10, style: .continuous)
                    .fill(Color.brand.opacity(0.08))
            )
    }

    private var isValid: Bool {
        !identifier.trimmingCharacters(in: .whitespaces).isEmpty && !password.isEmpty
    }

    /// Validates input and stands in for the real authentication call, which
    /// will hit the backend once the networking layer is built.
    private func signIn() async {
        guard isValid, !isSubmitting else { return }
        focusedField = nil
        message = nil
        isSubmitting = true
        // Brief pause so the loading state is visible; replace with the API call.
        try? await Task.sleep(for: .milliseconds(600))
        isSubmitting = false
        message = "Sign-in isn't connected to the backend yet — that's the next step."
    }
}

/// A labeled container that gives text fields a consistent card appearance.
struct FieldContainer<Content: View>: View {
    let label: String
    @ViewBuilder let content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: 7) {
            Text(label)
                .font(.footnote.weight(.semibold))
                .foregroundStyle(.secondary)
            content
                .font(.body)
                .padding(.horizontal, 14)
                .frame(height: 50)
                .background(
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .fill(Color.white)
                        .overlay(
                            RoundedRectangle(cornerRadius: 12, style: .continuous)
                                .strokeBorder(Color.black.opacity(0.08), lineWidth: 1)
                        )
                )
        }
    }
}

#Preview("Staff") {
    NavigationStack {
        LoginView(mode: .staff)
    }
}

#Preview("Pet Owner") {
    NavigationStack {
        LoginView(mode: .petOwner)
    }
}
