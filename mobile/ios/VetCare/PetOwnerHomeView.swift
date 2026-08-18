//
//  PetOwnerHomeView.swift
//  VetCare
//
//  Home screen for authenticated pet owners. Shows their pet roster and
//  quick links to AI assistant.
//

import SwiftUI

private enum PetOwnerRoute: Hashable {
    case aiAssistant
    case appointments
    case profile
    case photoGuidance
}

struct PetOwnerHomeView: View {
    @Environment(CustomerSession.self) private var session

    @State private var pets: [Pet] = []
    @State private var petsLoading = true
    @State private var petsError: String?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    greeting
                    petsSection
                    appointmentsCard
                    aiCard
                    photoGuidanceCard
                }
                .padding(20)
            }
            .background(Color.appBackground)
            .navigationTitle("")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    NavigationLink(value: PetOwnerRoute.profile) {
                        Image(systemName: "person.circle.fill")
                            .font(.title3)
                            .foregroundStyle(Color.brand)
                    }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    signOutButton
                }
            }
            .navigationDestination(for: PetOwnerRoute.self) { route in
                switch route {
                case .aiAssistant:
                    PetOwnerAIView(token: session.token ?? "")
                case .appointments:
                    AppointmentsView(token: session.token ?? "")
                case .profile:
                    ProfileView(token: session.token ?? "")
                case .photoGuidance:
                    PhotoGuidanceView(token: session.token ?? "")
                }
            }
            .navigationDestination(for: Pet.self) { pet in
                PetDetailView(pet: pet, token: session.token ?? "")
            }
            .refreshable { await loadPets(showSpinner: false) }
        }
        .task { await loadPets() }
    }

    // MARK: - Greeting

    private var greeting: some View {
        HStack(spacing: 14) {
            ZStack {
                Circle()
                    .fill(LinearGradient.brand)
                    .frame(width: 52, height: 52)
                Text(session.customer.map { String($0.firstName.prefix(1)) } ?? "?")
                    .font(.title2.weight(.bold))
                    .foregroundStyle(.white)
            }

            VStack(alignment: .leading, spacing: 2) {
                Text("Hi, \(session.customer?.firstName ?? "there")!")
                    .font(.title3.weight(.bold))
                Text("Pet Owner")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            Spacer()
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .fill(Color.cardSurface)
                .shadow(color: .black.opacity(0.04), radius: 8, y: 2)
        )
    }

    // MARK: - Sign out

    private var signOutButton: some View {
        Button {
            session.logout()
        } label: {
            HStack(spacing: 4) {
                Image(systemName: "rectangle.portrait.and.arrow.right")
                Text("Sign Out")
            }
            .font(.subheadline.weight(.medium))
            .foregroundStyle(Color.brand)
        }
    }

    // MARK: - Pets

    private var petsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("My Pets")
                .font(.headline)

            if petsLoading {
                HStack {
                    Spacer()
                    ProgressView()
                    Spacer()
                }
                .padding(.vertical, 20)
            } else if let error = petsError {
                ContentUnavailableView {
                    Label("Couldn't Load Pets", systemImage: "exclamationmark.triangle")
                } description: {
                    Text(error)
                } actions: {
                    Button("Try Again") {
                        Task { await loadPets() }
                    }
                    .buttonStyle(.glass)
                }
            } else if pets.isEmpty {
                emptyPets
            } else {
                ForEach(pets) { pet in
                    NavigationLink(value: pet) {
                        PetCard(pet: pet)
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }

    private var emptyPets: some View {
        ContentUnavailableView(
            "No Pets on File",
            systemImage: "pawprint",
            description: Text("Your pets will appear here once the clinic adds them to your account.")
        )
    }

    // MARK: - Appointments card

    private var appointmentsCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            Label("Appointments", systemImage: "calendar")
                .font(.headline)

            Text("Book a new visit, reschedule, or view your appointment history.")
                .font(.subheadline)
                .foregroundStyle(.secondary)

            NavigationLink(value: PetOwnerRoute.appointments) {
                HStack {
                    Text("Manage Appointments")
                        .font(.subheadline.weight(.semibold))
                    Spacer()
                    Image(systemName: "chevron.right")
                        .font(.subheadline)
                }
                .foregroundStyle(.white)
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
                .background(
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .fill(LinearGradient.brand)
                )
            }
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .fill(Color.cardSurface)
                .shadow(color: .black.opacity(0.04), radius: 8, y: 2)
        )
    }

    // MARK: - AI card

    private var aiCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            Label("AI Assistant", systemImage: "sparkles")
                .font(.headline)

            Text("Ask about your pets' records, vaccination history, or aftercare. Answers are scoped to your own pets only.")
                .font(.subheadline)
                .foregroundStyle(.secondary)

            NavigationLink(value: PetOwnerRoute.aiAssistant) {
                HStack {
                    Text("Ask a question")
                        .font(.subheadline.weight(.semibold))
                    Spacer()
                    Image(systemName: "chevron.right")
                        .font(.subheadline)
                }
                .foregroundStyle(.white)
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
                .background(
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .fill(LinearGradient.brand)
                )
            }
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .fill(Color.cardSurface)
                .shadow(color: .black.opacity(0.04), radius: 8, y: 2)
        )
    }

    // MARK: - Photo guidance card

    private var photoGuidanceCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            Label("AI Photo Guidance", systemImage: "camera")
                .font(.headline)

            Text("Upload a photo of your pet for general AI guidance on what to do next. Not a diagnosis - always see a vet for anything concerning.")
                .font(.subheadline)
                .foregroundStyle(.secondary)

            NavigationLink(value: PetOwnerRoute.photoGuidance) {
                HStack {
                    Text("Upload a photo")
                        .font(.subheadline.weight(.semibold))
                    Spacer()
                    Image(systemName: "chevron.right")
                        .font(.subheadline)
                }
                .foregroundStyle(.white)
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
                .background(
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .fill(LinearGradient.brand)
                )
            }
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .fill(Color.cardSurface)
                .shadow(color: .black.opacity(0.04), radius: 8, y: 2)
        )
    }

    // MARK: - Data

    /// Pull-to-refresh shows its own indicator, so it skips the inline spinner
    /// to avoid collapsing the list while reloading.
    private func loadPets(showSpinner: Bool = true) async {
        guard let token = session.token else { return }
        if showSpinner { petsLoading = true }
        petsError = nil
        do {
            pets = try await CustomerAuthService().fetchMyPets(token: token)
        } catch {
            petsError = (error as? APIError)?.errorDescription ?? error.localizedDescription
        }
        petsLoading = false
    }
}

// MARK: - Pet card

private struct PetCard: View {
    let pet: Pet

    var body: some View {
        HStack(spacing: 14) {
            ZStack {
                Circle()
                    .fill(Color.brand.opacity(0.1))
                    .frame(width: 44, height: 44)
                Image(systemName: pet.speciesSymbol)
                    .font(.system(size: 20))
                    .foregroundStyle(Color.brand)
            }

            VStack(alignment: .leading, spacing: 2) {
                Text(pet.name)
                    .font(.subheadline.weight(.semibold))

                HStack(spacing: 6) {
                    Text(pet.species.capitalized)
                    if let breed = pet.breed {
                        Text("·")
                            .foregroundStyle(.tertiary)
                        Text(breed)
                    }
                }
                .font(.caption)
                .foregroundStyle(.secondary)

                if let age = pet.ageString {
                    Text(age)
                        .font(.caption2)
                        .foregroundStyle(.tertiary)
                }
            }

            Spacer()

            if let gender = pet.gender {
                Text(gender.capitalized)
                    .font(.caption2.weight(.medium))
                    .foregroundStyle(Color.brand)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(Capsule().fill(Color.brand.opacity(0.1)))
            }

            Image(systemName: "chevron.right")
                .font(.caption.weight(.semibold))
                .foregroundStyle(.tertiary)
        }
        .padding(14)
        .background(
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .fill(Color.cardSurface)
                .shadow(color: .black.opacity(0.04), radius: 6, y: 1)
        )
    }
}

#Preview {
    PetOwnerHomeView()
        .environment(CustomerSession())
}
