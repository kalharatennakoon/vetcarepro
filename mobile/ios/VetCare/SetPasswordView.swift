//
//  SetPasswordView.swift
//  VetCare
//
//  Step 2 of first-time account setup: the user sets their password using the
//  setupToken issued by VerifyIdentityView. On success the server clears
//  password_must_change, returns a session token, and the app logs in.
//

import SwiftUI

struct SetPasswordView: View {
    let setupToken: String
    let firstName: String

    @Environment(CustomerSession.self) private var session

    @State private var newPassword = ""
    @State private var confirmPassword = ""
    @State private var isNewVisible = false
    @State private var isConfirmVisible = false
    @State private var isSubmitting = false
    @State private var errorMessage: String?

    @FocusState private var focusedField: Field?
    private enum Field { case new, confirm }

    var body: some View {
        ZStack {
            Color.appBackground.ignoresSafeArea()

            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    header
                    fields
                    saveButton
                    if let errorMessage {
                        errorBanner(errorMessage)
                    }
                }
                .padding(.horizontal, 28)
                .padding(.top, 12)
            }
            .scrollDismissesKeyboard(.interactively)
        }
        .navigationTitle("")
        .navigationBarTitleDisplayMode(.inline)
        .sensoryFeedback(trigger: errorMessage) { _, newValue in
            newValue != nil ? .error : nil
        }
    }

    // MARK: - Header

    private var header: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Set Your Password")
                .font(.system(size: 28, weight: .bold, design: .rounded))
            Text(firstName.isEmpty
                 ? "Your identity is verified. Choose a password to finish setting up your account."
                 : "Hi \(firstName), your identity is verified. Choose a password to finish setting up your account.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .padding(.top, 8)
    }

    // MARK: - Fields

    private var fields: some View {
        VStack(spacing: 16) {
            FieldContainer(label: "New Password") {
                HStack {
                    Group {
                        if isNewVisible {
                            TextField("At least 6 characters", text: $newPassword)
                        } else {
                            SecureField("At least 6 characters", text: $newPassword)
                        }
                    }
                    .textContentType(.newPassword)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                    .focused($focusedField, equals: .new)
                    .submitLabel(.next)
                    .onSubmit { focusedField = .confirm }

                    Button { isNewVisible.toggle() } label: {
                        Image(systemName: isNewVisible ? "eye.slash" : "eye")
                            .foregroundStyle(.secondary)
                    }
                }
            }

            FieldContainer(label: "Confirm Password") {
                HStack {
                    Group {
                        if isConfirmVisible {
                            TextField("Re-enter your password", text: $confirmPassword)
                        } else {
                            SecureField("Re-enter your password", text: $confirmPassword)
                        }
                    }
                    .textContentType(.newPassword)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                    .focused($focusedField, equals: .confirm)
                    .submitLabel(.go)
                    .onSubmit { Task { await save() } }

                    Button { isConfirmVisible.toggle() } label: {
                        Image(systemName: isConfirmVisible ? "eye.slash" : "eye")
                            .foregroundStyle(.secondary)
                    }
                }
            }

            if !confirmPassword.isEmpty && newPassword != confirmPassword {
                HStack(spacing: 6) {
                    Image(systemName: "xmark.circle.fill")
                    Text("Passwords don't match")
                }
                .font(.caption)
                .foregroundStyle(.red)
                .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
    }

    // MARK: - Save button

    private var saveButton: some View {
        Button {
            Task { await save() }
        } label: {
            ZStack {
                PillLabel(title: "Set Password & Continue", style: .filled)
                    .opacity(isSubmitting ? 0 : 1)
                if isSubmitting {
                    ProgressView().tint(.white)
                }
            }
        }
        .disabled(!isValid || isSubmitting)
        .opacity(isValid ? 1 : 0.5)
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
        newPassword.count >= 6 && newPassword == confirmPassword
    }

    private func save() async {
        guard isValid, !isSubmitting else { return }
        focusedField = nil
        errorMessage = nil
        isSubmitting = true
        defer { isSubmitting = false }

        do {
            let (customer, token) = try await CustomerAuthService().setFirstPassword(
                setupToken: setupToken,
                newPassword: newPassword
            )
            session.login(customer: customer, token: token)
        } catch {
            errorMessage = (error as? APIError)?.errorDescription ?? error.localizedDescription
        }
    }
}

#Preview {
    NavigationStack {
        SetPasswordView(setupToken: "preview-token", firstName: "Nishantha")
            .environment(CustomerSession())
    }
}
