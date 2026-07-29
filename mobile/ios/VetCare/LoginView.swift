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

    @Environment(CustomerSession.self) private var session

    @State private var identifier = ""
    @State private var password = ""
    @State private var isPasswordVisible = false
    @State private var isSubmitting = false
    @State private var errorMessage: String?
    @State private var requiresSetup = false

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
                    if let errorMessage {
                        errorBanner(errorMessage)
                    }
                    setupFooter
                }
                .padding(.horizontal, 28)
                .padding(.top, 12)
                .padding(.bottom, 32)
            }
            .scrollDismissesKeyboard(.interactively)
        }
        .navigationTitle("")
        .navigationBarTitleDisplayMode(.inline)
    }

    // MARK: - Header

    private var header: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Welcome Back")
                .font(.system(size: 28, weight: .bold, design: .rounded))
            Text("Sign in to view your pets' records and care history.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .padding(.top, 8)
    }

    // MARK: - Fields

    private var fields: some View {
        VStack(spacing: 16) {
            FieldContainer(label: "Email or phone") {
                TextField("Email or phone number", text: $identifier)
                    .keyboardType(.default)
                    .textContentType(.username)
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

    private func errorBanner(_ text: String) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(alignment: .top, spacing: 8) {
                Image(systemName: "exclamationmark.circle")
                    .foregroundStyle(.red)
                Text(text)
                    .foregroundStyle(.primary)
            }
            .font(.footnote)

            if requiresSetup {
                NavigationLink(value: WelcomeRoute.verifyIdentity) {
                    HStack(spacing: 5) {
                        Image(systemName: "person.badge.key.fill")
                        Text("Set Up Your Account")
                            .fontWeight(.semibold)
                    }
                    .font(.footnote)
                    .foregroundStyle(Color.brand)
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(12)
        .background(
            RoundedRectangle(cornerRadius: 10, style: .continuous)
                .fill(Color.red.opacity(0.07))
                .overlay(
                    RoundedRectangle(cornerRadius: 10, style: .continuous)
                        .strokeBorder(Color.red.opacity(0.2), lineWidth: 1)
                )
        )
    }

    // MARK: - Setup footer

    private var setupFooter: some View {
        VStack(spacing: 12) {
            HStack { Divider() }

            VStack(spacing: 6) {
                Text("First time here?")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                Text("Verify your email and phone number to set up your password.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
            }

            NavigationLink(value: WelcomeRoute.verifyIdentity) {
                PillLabel(title: "Set Up Your Account", style: .outlined)
            }
        }
        .padding(.top, 4)
    }

    private var isValid: Bool {
        !identifier.trimmingCharacters(in: .whitespaces).isEmpty && !password.isEmpty
    }

    private func signIn() async {
        guard isValid, !isSubmitting else { return }
        focusedField = nil
        errorMessage = nil
        requiresSetup = false
        isSubmitting = true
        defer { isSubmitting = false }

        do {
            let (customer, token) = try await CustomerAuthService().login(
                identifier: identifier.trimmingCharacters(in: .whitespaces),
                password: password
            )
            session.login(customer: customer, token: token)
        } catch let apiError as APIError {
            if case .server(let status, _) = apiError, status == 403 {
                requiresSetup = true
                errorMessage = "This account hasn't been set up yet. Please verify your identity to create your password."
            } else {
                errorMessage = apiError.errorDescription
            }
        } catch {
            errorMessage = error.localizedDescription
        }
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
                        .fill(Color.cardSurface)
                        .overlay(
                            RoundedRectangle(cornerRadius: 12, style: .continuous)
                                .strokeBorder(Color.primary.opacity(0.08), lineWidth: 1)
                        )
                )
        }
    }
}

#Preview {
    NavigationStack {
        LoginView(mode: .petOwner)
    }
    .environment(CustomerSession())
}
