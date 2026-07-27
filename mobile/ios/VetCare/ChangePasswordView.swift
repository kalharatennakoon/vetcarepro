//
//  ChangePasswordView.swift
//  VetCare
//
//  Shown on first login when password_must_change is true.
//  Calls POST /api/customer-auth/change-password-first-login, then clears
//  the flag in CustomerSession so the home screen takes over.
//

import SwiftUI

struct ChangePasswordView: View {
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
                .padding(.top, 40)
            }
            .scrollDismissesKeyboard(.interactively)
        }
    }

    // MARK: - Header

    private var header: some View {
        VStack(alignment: .leading, spacing: 8) {
            ZStack {
                Circle()
                    .fill(Color.brand.opacity(0.12))
                    .frame(width: 56, height: 56)
                Image(systemName: "lock.rotation")
                    .font(.system(size: 24, weight: .semibold))
                    .foregroundStyle(Color.brand)
            }
            .padding(.bottom, 4)

            Text("Set your password")
                .font(.system(size: 28, weight: .bold, design: .rounded))
            Text("Your account was given a temporary password. Please choose a new one before continuing.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
    }

    // MARK: - Fields

    private var fields: some View {
        VStack(spacing: 16) {
            FieldContainer(label: "New password") {
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

            FieldContainer(label: "Confirm password") {
                HStack {
                    Group {
                        if isConfirmVisible {
                            TextField("Repeat new password", text: $confirmPassword)
                        } else {
                            SecureField("Repeat new password", text: $confirmPassword)
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

    // MARK: - Save

    private var saveButton: some View {
        Button {
            Task { await save() }
        } label: {
            ZStack {
                PillLabel(title: "Save password", style: .filled)
                    .opacity(isSubmitting ? 0 : 1)
                if isSubmitting {
                    ProgressView().tint(.white)
                }
            }
        }
        .disabled(!isValid || isSubmitting)
        .opacity(isValid ? 1 : 0.5)
    }

    private var isValid: Bool {
        newPassword.count >= 6 && newPassword == confirmPassword
    }

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

    private func save() async {
        guard isValid, !isSubmitting, let token = session.token else { return }
        focusedField = nil
        errorMessage = nil
        isSubmitting = true
        defer { isSubmitting = false }

        do {
            try await CustomerAuthService().changePasswordFirstLogin(newPassword: newPassword, token: token)
            session.customerDidChangePassword()
        } catch {
            errorMessage = (error as? APIError)?.errorDescription ?? error.localizedDescription
        }
    }
}

#Preview {
    ChangePasswordView()
        .environment(CustomerSession())
}
