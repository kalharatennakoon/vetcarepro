//
//  ProfileView.swift
//  VetCare
//

import SwiftUI

struct ProfileView: View {
    @Environment(CustomerSession.self) private var session
    let token: String

    @State private var showEdit = false

    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                headerCard
                accountCard
                contactCard
            }
            .padding(20)
        }
        .background(Color.appBackground)
        .navigationTitle("My Profile")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button("Edit") { showEdit = true }
                    .fontWeight(.semibold)
                    .foregroundStyle(Color.brand)
            }
        }
        .sheet(isPresented: $showEdit) {
            EditProfileView(token: token)
        }
    }

    // MARK: - Header

    private var headerCard: some View {
        VStack(spacing: 14) {
            ZStack {
                Circle()
                    .fill(LinearGradient.brand)
                    .frame(width: 72, height: 72)
                Text(session.customer?.initials ?? "?")
                    .font(.title.weight(.bold))
                    .foregroundStyle(.white)
            }
            VStack(spacing: 4) {
                Text(session.customer?.fullName ?? "")
                    .font(.title3.weight(.bold))
                if let since = session.customer?.memberSince {
                    Text("Member since \(since)")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
            }
        }
        .padding(24)
        .frame(maxWidth: .infinity)
        .background(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .fill(Color.cardSurface)
                .shadow(color: .black.opacity(0.04), radius: 8, y: 2)
        )
    }

    // MARK: - Account info (staff-managed, read-only)

    private var accountCard: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text("Account Info")
                .font(.headline)
                .padding(.bottom, 14)

            if let c = session.customer {
                ProfileRow(label: "Full Name", value: c.fullName)
                profileDivider
                ProfileRow(label: "Email", value: c.email ?? "—")
                profileDivider
                ProfileRow(label: "Phone", value: c.phone)
                if let nic = c.nic, !nic.isEmpty {
                    profileDivider
                    ProfileRow(label: "NIC", value: nic)
                }
            }

            Label("Contact the clinic to update name, email, phone or NIC.", systemImage: "info.circle")
                .font(.caption)
                .foregroundStyle(.secondary)
                .padding(.top, 14)
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .fill(Color.cardSurface)
                .shadow(color: .black.opacity(0.04), radius: 8, y: 2)
        )
    }

    // MARK: - Contact details (self-editable)

    private var contactCard: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text("Contact Details")
                .font(.headline)
                .padding(.bottom, 14)

            if let c = session.customer {
                ProfileRow(label: "Alternate Phone",   value: c.alternatePhone ?? "—")
                profileDivider
                ProfileRow(label: "Address",           value: c.address ?? "—")
                profileDivider
                ProfileRow(label: "City",              value: c.city ?? "—")
                profileDivider
                ProfileRow(label: "Preferred Contact", value: c.preferredContactDisplay)
                profileDivider
                ProfileRow(label: "Emergency Contact", value: c.emergencyContact ?? "—")
                profileDivider
                ProfileRow(label: "Emergency Phone",   value: c.emergencyPhone ?? "—")
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .fill(Color.cardSurface)
                .shadow(color: .black.opacity(0.04), radius: 8, y: 2)
        )
    }

    private var profileDivider: some View {
        Divider().padding(.vertical, 8)
    }
}

// MARK: - ProfileRow

private struct ProfileRow: View {
    let label: String
    let value: String

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Text(label)
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .frame(width: 136, alignment: .leading)
            Text(value)
                .font(.subheadline)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
    }
}

// MARK: - EditProfileView

struct EditProfileView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(CustomerSession.self) private var session

    let token: String

    @State private var alternatePhone = ""
    @State private var address = ""
    @State private var city = ""
    @State private var preferredContactMethod = ""
    @State private var emergencyContact = ""
    @State private var emergencyPhone = ""

    @State private var saving = false
    @State private var saveError: String? = nil
    @State private var showErrorAlert = false
    @State private var showSuccessAlert = false

    var body: some View {
        NavigationStack {
            Form {
                Section("Phone & Location") {
                    TextField("Alternate Phone", text: $alternatePhone)
                        .keyboardType(.phonePad)
                    TextField("Address", text: $address)
                    TextField("City", text: $city)
                }

                Section("Preferred Contact Method") {
                    Picker("Method", selection: $preferredContactMethod) {
                        Text("Not set").tag("")
                        Text("Phone").tag("phone")
                        Text("Email").tag("email")
                        Text("SMS").tag("sms")
                    }
                    .pickerStyle(.menu)
                }

                Section("Emergency") {
                    TextField("Emergency Contact Name", text: $emergencyContact)
                    TextField("Emergency Phone", text: $emergencyPhone)
                        .keyboardType(.phonePad)
                }
            }
            .navigationTitle("Edit Profile")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    if saving {
                        ProgressView()
                    } else {
                        Button("Save") { Task { await save() } }
                            .fontWeight(.semibold)
                    }
                }
            }
        }
        .onAppear { prefill() }
        .alert("Profile Updated", isPresented: $showSuccessAlert) {
            Button("Done") { dismiss() }
        } message: {
            Text("Your contact details have been saved successfully.")
        }
        .alert("Couldn't Save Profile", isPresented: $showErrorAlert) {
            Button("OK") { }
        } message: {
            if let err = saveError { Text(err) }
        }
    }

    private func prefill() {
        guard let c = session.customer else { return }
        alternatePhone         = c.alternatePhone ?? ""
        address                = c.address ?? ""
        city                   = c.city ?? ""
        preferredContactMethod = c.preferredContactMethod ?? ""
        emergencyContact       = c.emergencyContact ?? ""
        emergencyPhone         = c.emergencyPhone ?? ""
    }

    private func save() async {
        saving = true
        let trim: (String) -> String? = { s in
            let t = s.trimmingCharacters(in: .whitespaces)
            return t.isEmpty ? nil : t
        }
        do {
            let updated = try await CustomerAuthService().updateProfile(
                UpdateProfileRequest(
                    alternatePhone:         trim(alternatePhone),
                    address:                trim(address),
                    city:                   trim(city),
                    preferredContactMethod: preferredContactMethod.isEmpty ? nil : preferredContactMethod,
                    emergencyContact:       trim(emergencyContact),
                    emergencyPhone:         trim(emergencyPhone)
                ),
                token: token
            )
            session.updateCustomer(updated)
            showSuccessAlert = true
        } catch {
            saveError = (error as? APIError)?.errorDescription ?? error.localizedDescription
            showErrorAlert = true
        }
        saving = false
    }
}

#Preview {
    NavigationStack {
        ProfileView(token: "preview")
            .environment(CustomerSession())
    }
}
