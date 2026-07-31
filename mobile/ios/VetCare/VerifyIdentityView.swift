//
//  VerifyIdentityView.swift
//  VetCare
//
//  Step 1 of first-time account setup: the user enters the email and phone
//  number the clinic has on file. On success the server issues a short-lived
//  setupToken that is passed forward to SetPasswordView.
//

import SwiftUI

struct VerifyIdentityView: View {
    @Environment(\.dismiss) private var dismiss

    @State private var email = ""
    @State private var phone = ""
    @State private var isSubmitting = false
    @State private var errorMessage: String?

    // Navigation to step 2
    @State private var showSetPassword = false
    @State private var setupToken = ""
    @State private var verifiedFirstName = ""

    @FocusState private var focusedField: Field?
    private enum Field { case email, phone }

    var body: some View {
        ZStack {
            Color.appBackground.ignoresSafeArea()

            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    header
                    fields
                    verifyButton
                    if let errorMessage {
                        errorBanner(errorMessage)
                    }
                    supportFooter
                }
                .padding(.horizontal, 28)
                .padding(.top, 12)
            }
            .scrollDismissesKeyboard(.interactively)
        }
        .navigationTitle("")
        .navigationBarTitleDisplayMode(.inline)
        .navigationDestination(isPresented: $showSetPassword) {
            SetPasswordView(setupToken: setupToken, firstName: verifiedFirstName)
        }
        .sensoryFeedback(trigger: errorMessage) { _, newValue in
            newValue != nil ? .error : nil
        }
    }

    // MARK: - Header

    private var header: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Set Up Your Account")
                .font(.system(size: 28, weight: .bold, design: .rounded))
            Text("Enter the email and phone number the clinic has on file for you.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .padding(.top, 8)
    }

    // MARK: - Fields

    private var fields: some View {
        VStack(spacing: 16) {
            FieldContainer(label: "Email Address") {
                TextField("name@example.com", text: $email)
                    .keyboardType(.emailAddress)
                    .textContentType(.emailAddress)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                    .focused($focusedField, equals: .email)
                    .submitLabel(.next)
                    .onSubmit { focusedField = .phone }
            }

            FieldContainer(label: "Phone Number") {
                TextField("+947XXXXXXXX", text: $phone)
                    .keyboardType(.phonePad)
                    .textContentType(.telephoneNumber)
                    .focused($focusedField, equals: .phone)
                    .submitLabel(.go)
                    .onSubmit { Task { await verify() } }
            }
        }
    }

    // MARK: - Verify button

    private var verifyButton: some View {
        Button {
            Task { await verify() }
        } label: {
            ZStack {
                PillLabel(title: "Verify & Continue", style: .filled)
                    .opacity(isSubmitting ? 0 : 1)
                if isSubmitting {
                    ProgressView().tint(.white)
                }
            }
        }
        .disabled(!isValid || isSubmitting)
        .opacity(isValid ? 1 : 0.5)
    }

    // MARK: - Footer

    private var supportFooter: some View {
        VStack(spacing: 4) {
            Text("Already have a password?")
                .font(.caption2)
                .foregroundStyle(.secondary)
            Button {
                dismiss()
            } label: {
                Text("Back to Sign In")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(Color.brand)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.top, 4)
    }

    // MARK: - Error banner

    private func errorBanner(_ text: String) -> some View {
        HStack(alignment: .top, spacing: 8) {
            Image(systemName: "exclamationmark.circle")
                .foregroundStyle(.red)
            Text(text)
                .foregroundStyle(.primary)
        }
        .font(.footnote)
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

    // MARK: - Logic

    private var isValid: Bool {
        !email.trimmingCharacters(in: .whitespaces).isEmpty &&
        !phone.trimmingCharacters(in: .whitespaces).isEmpty
    }

    private func verify() async {
        guard isValid, !isSubmitting else { return }
        focusedField = nil
        errorMessage = nil
        isSubmitting = true
        defer { isSubmitting = false }

        do {
            let result = try await CustomerAuthService().verifyIdentity(
                email: email.trimmingCharacters(in: .whitespaces),
                phone: phone.trimmingCharacters(in: .whitespaces)
            )
            setupToken = result.setupToken
            verifiedFirstName = result.firstName
            showSetPassword = true
        } catch {
            errorMessage = (error as? APIError)?.errorDescription ?? error.localizedDescription
        }
    }
}

#Preview {
    NavigationStack {
        VerifyIdentityView()
    }
}
