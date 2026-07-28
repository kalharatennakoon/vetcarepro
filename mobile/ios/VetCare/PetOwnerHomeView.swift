//
//  PetOwnerHomeView.swift
//  VetCare
//
//  Home screen for authenticated pet owners. Shows their pet roster and
//  quick links to AI assistant.
//

import SwiftUI

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
                    aiCard
                }
                .padding(20)
            }
            .background(Color.appBackground)
            .navigationTitle("")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    signOutButton
                }
            }
            .navigationDestination(for: String.self) { _ in
                PetOwnerAIView(token: session.token ?? "")
            }
            .navigationDestination(for: Pet.self) { pet in
                PetDetailView(pet: pet, token: session.token ?? "")
            }
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
                HStack(spacing: 8) {
                    Image(systemName: "exclamationmark.triangle")
                        .foregroundStyle(.secondary)
                    Text(error)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                .padding(16)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .fill(Color.cardSurface)
                )
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
        VStack(spacing: 10) {
            Image(systemName: "pawprint")
                .font(.system(size: 32))
                .foregroundStyle(Color.brand.opacity(0.4))
            Text("No pets on file")
                .font(.subheadline.weight(.medium))
            Text("Your pets will appear here once the clinic adds them to your account.")
                .font(.caption)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding(24)
        .frame(maxWidth: .infinity)
        .background(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .fill(Color.cardSurface)
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

            NavigationLink(value: "guestAI") {
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

    // MARK: - Data

    private func loadPets() async {
        guard let token = session.token else { return }
        petsLoading = true
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
