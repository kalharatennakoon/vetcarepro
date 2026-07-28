//
//  PetDetailView.swift
//  VetCare
//

import SwiftUI
import QuickLook

struct PetDetailView: View {
    let pet: Pet
    let token: String

    @State private var vaccinations: [Vaccination] = []
    @State private var vaccinationsLoading = true
    @State private var vaccinationsError: String?

    @State private var labReports: [LabReport] = []
    @State private var labReportsLoading = true
    @State private var labReportsError: String?
    @State private var previewURL: URL?
    @State private var downloadingReportId: Int?
    @State private var downloadError: String?

    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                heroCard
                if pet.ageString != nil || pet.weightDisplay != nil || pet.gender != nil {
                    statsRow
                }
                detailsSection
                if pet.allergies != nil || pet.specialNeeds != nil {
                    healthSection
                }
                vaccinationsSection
                labReportsSection
            }
            .padding(20)
        }
        .background(Color.appBackground)
        .navigationTitle(pet.name)
        .navigationBarTitleDisplayMode(.large)
        .quickLookPreview($previewURL)
        .alert("Couldn't open report", isPresented: .constant(downloadError != nil)) {
            Button("OK") { downloadError = nil }
        } message: {
            Text(downloadError ?? "")
        }
        .task {
            async let v: () = loadVaccinations()
            async let l: () = loadLabReports()
            _ = await (v, l)
        }
    }

    // MARK: - Hero

    private var heroCard: some View {
        HStack(spacing: 16) {
            ZStack {
                Circle()
                    .fill(LinearGradient.brand)
                    .frame(width: 72, height: 72)
                    .shadow(color: .brand.opacity(0.28), radius: 10, y: 4)
                Image(systemName: pet.speciesSymbol)
                    .font(.system(size: 30, weight: .medium))
                    .foregroundStyle(.white)
            }

            VStack(alignment: .leading, spacing: 4) {
                Text(pet.name)
                    .font(.title2.weight(.bold))
                Text(pet.species.capitalized)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                if let breed = pet.breed {
                    Text(breed)
                        .font(.caption)
                        .foregroundStyle(.tertiary)
                }
            }

            Spacer()
        }
        .padding(20)
        .background(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .fill(Color.white)
                .shadow(color: .black.opacity(0.05), radius: 10, y: 3)
        )
    }

    // MARK: - Stats row

    private var statsRow: some View {
        HStack(spacing: 12) {
            if let age = pet.ageString {
                StatChip(icon: "calendar", label: "Age", value: age)
            }
            if let weight = pet.weightDisplay {
                StatChip(icon: "scalemass", label: "Weight", value: weight)
            }
            if let gender = pet.gender {
                StatChip(icon: "person.circle", label: "Gender", value: gender.capitalized)
            }
        }
    }

    // MARK: - Details

    private var detailsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Details")
                .font(.headline)

            VStack(spacing: 0) {
                if let dob = pet.dobFormatted {
                    DetailRow(icon: "calendar", label: "Date of Birth", value: dob)
                    Divider().padding(.leading, 46)
                }
                if let color = pet.color {
                    DetailRow(icon: "paintpalette", label: "Colour", value: color)
                    Divider().padding(.leading, 46)
                }
                DetailRow(
                    icon: pet.isNeutered ? "checkmark.shield.fill" : "shield",
                    label: "Neutered",
                    value: pet.isNeutered ? "Yes" : "No"
                )
            }
            .background(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .fill(Color.white)
                    .shadow(color: .black.opacity(0.04), radius: 8, y: 2)
            )
        }
    }

    // MARK: - Vaccinations

    private var vaccinationsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Label("Vaccinations", systemImage: "syringe.fill")
                .font(.headline)

            if vaccinationsLoading {
                HStack { Spacer(); ProgressView(); Spacer() }
                    .padding(.vertical, 16)
            } else if let error = vaccinationsError {
                HStack(spacing: 8) {
                    Image(systemName: "exclamationmark.triangle")
                        .foregroundStyle(.secondary)
                    Text(error)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                .padding(14)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(
                    RoundedRectangle(cornerRadius: 12, style: .continuous).fill(Color.white)
                )
            } else if vaccinations.isEmpty {
                Text("No vaccination records on file.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .padding(14)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(
                        RoundedRectangle(cornerRadius: 12, style: .continuous).fill(Color.white)
                    )
            } else {
                VStack(spacing: 0) {
                    ForEach(Array(vaccinations.enumerated()), id: \.element.id) { index, vax in
                        VaccinationRow(vaccination: vax)
                        if index < vaccinations.count - 1 {
                            Divider().padding(.leading, 46)
                        }
                    }
                }
                .background(
                    RoundedRectangle(cornerRadius: 14, style: .continuous)
                        .fill(Color.white)
                        .shadow(color: .black.opacity(0.04), radius: 8, y: 2)
                )
            }
        }
    }

    private func loadVaccinations() async {
        vaccinationsLoading = true
        vaccinationsError = nil
        do {
            vaccinations = try await CustomerAuthService().fetchVaccinations(petId: pet.petId, token: token)
        } catch {
            vaccinationsError = (error as? APIError)?.errorDescription ?? error.localizedDescription
        }
        vaccinationsLoading = false
    }

    // MARK: - Lab Reports

    private var labReportsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Label("Lab Reports", systemImage: "doc.text.magnifyingglass")
                .font(.headline)

            if labReportsLoading {
                HStack { Spacer(); ProgressView(); Spacer() }
                    .padding(.vertical, 16)
            } else if let error = labReportsError {
                HStack(spacing: 8) {
                    Image(systemName: "exclamationmark.triangle")
                        .foregroundStyle(.secondary)
                    Text(error)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                .padding(14)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(
                    RoundedRectangle(cornerRadius: 12, style: .continuous).fill(Color.white)
                )
            } else if labReports.isEmpty {
                Text("No lab reports on file.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .padding(14)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(
                        RoundedRectangle(cornerRadius: 12, style: .continuous).fill(Color.white)
                    )
            } else {
                VStack(spacing: 0) {
                    ForEach(Array(labReports.enumerated()), id: \.element.id) { index, report in
                        LabReportRow(
                            report: report,
                            isDownloading: downloadingReportId == report.reportId
                        ) {
                            Task { await viewReport(report) }
                        }
                        if index < labReports.count - 1 {
                            Divider().padding(.leading, 46)
                        }
                    }
                }
                .background(
                    RoundedRectangle(cornerRadius: 14, style: .continuous)
                        .fill(Color.white)
                        .shadow(color: .black.opacity(0.04), radius: 8, y: 2)
                )
            }
        }
    }

    // MARK: - Data

    private func loadLabReports() async {
        labReportsLoading = true
        labReportsError = nil
        do {
            labReports = try await CustomerAuthService().fetchLabReports(petId: pet.petId, token: token)
        } catch {
            labReportsError = (error as? APIError)?.errorDescription ?? error.localizedDescription
        }
        labReportsLoading = false
    }

    private func viewReport(_ report: LabReport) async {
        downloadingReportId = report.reportId
        do {
            previewURL = try await CustomerAuthService().downloadLabReport(
                reportId: report.reportId,
                token: token,
                fileType: report.fileType
            )
        } catch {
            downloadError = (error as? APIError)?.errorDescription ?? error.localizedDescription
        }
        downloadingReportId = nil
    }

    // MARK: - Health notes

    private var healthSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Health Notes")
                .font(.headline)

            if let allergies = pet.allergies {
                HealthNoteCard(
                    icon: "exclamationmark.circle.fill",
                    title: "Allergies",
                    text: allergies,
                    tint: .orange
                )
            }
            if let needs = pet.specialNeeds {
                HealthNoteCard(
                    icon: "heart.text.square.fill",
                    title: "Special Needs",
                    text: needs,
                    tint: Color.brand
                )
            }
        }
    }
}

// MARK: - Sub-components

private struct StatChip: View {
    let icon: String
    let label: String
    let value: String

    var body: some View {
        VStack(spacing: 5) {
            Image(systemName: icon)
                .font(.subheadline)
                .foregroundStyle(Color.brand)
            Text(value)
                .font(.subheadline.weight(.semibold))
            Text(label)
                .font(.caption2)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 14)
        .background(
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .fill(Color.white)
                .shadow(color: .black.opacity(0.04), radius: 6, y: 1)
        )
    }
}

private struct DetailRow: View {
    let icon: String
    let label: String
    let value: String

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.subheadline)
                .foregroundStyle(Color.brand)
                .frame(width: 22)
            Text(label)
                .font(.subheadline)
                .foregroundStyle(.secondary)
            Spacer()
            Text(value)
                .font(.subheadline.weight(.medium))
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 13)
    }
}

private struct HealthNoteCard: View {
    let icon: String
    let title: String
    let text: String
    let tint: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Label(title, systemImage: icon)
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(tint)
            Text(text)
                .font(.subheadline)
                .foregroundStyle(.primary)
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .fill(Color.white)
                .shadow(color: .black.opacity(0.04), radius: 6, y: 1)
        )
    }
}

private struct VaccinationRow: View {
    let vaccination: Vaccination

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: "syringe")
                .font(.subheadline)
                .foregroundStyle(Color.brand)
                .frame(width: 22)

            VStack(alignment: .leading, spacing: 3) {
                HStack(spacing: 6) {
                    Text(vaccination.vaccineName)
                        .font(.subheadline.weight(.medium))
                        .lineLimit(1)
                    if vaccination.adverseReaction {
                        Image(systemName: "exclamationmark.triangle.fill")
                            .font(.caption)
                            .foregroundStyle(.orange)
                    }
                }
                HStack(spacing: 6) {
                    if let type = vaccination.vaccineType {
                        Text(type)
                            .font(.caption2.weight(.medium))
                            .foregroundStyle(Color.brand)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(Capsule().fill(Color.brand.opacity(0.1)))
                    }
                    Text(vaccination.vaccinationDateFormatted)
                        .font(.caption)
                        .foregroundStyle(.tertiary)
                }
            }

            Spacer()

            if let status = vaccination.dueStatus, let dueStr = vaccination.nextDueDateFormatted {
                VStack(spacing: 1) {
                    Text(status == .past ? "Overdue" : "Due")
                        .font(.caption2.weight(.bold))
                        .foregroundStyle(status == .past ? Color.red : Color.green)
                    Text(dueStr)
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
                .multilineTextAlignment(.trailing)
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 13)
    }
}

private struct LabReportRow: View {
    let report: LabReport
    let isDownloading: Bool
    let onView: () -> Void

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: report.typeIcon)
                .font(.subheadline)
                .foregroundStyle(Color.brand)
                .frame(width: 22)

            VStack(alignment: .leading, spacing: 3) {
                Text(report.reportName)
                    .font(.subheadline.weight(.medium))
                    .lineLimit(1)
                HStack(spacing: 6) {
                    Text(report.typeDisplayName)
                        .font(.caption2.weight(.medium))
                        .foregroundStyle(Color.brand)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(Capsule().fill(Color.brand.opacity(0.1)))
                    Text(report.formattedDate)
                        .font(.caption)
                        .foregroundStyle(.tertiary)
                }
            }

            Spacer()

            Button(action: onView) {
                if isDownloading {
                    ProgressView().frame(width: 28, height: 28)
                } else {
                    Image(systemName: "eye.circle.fill")
                        .font(.title3)
                        .foregroundStyle(Color.brand)
                }
            }
            .disabled(isDownloading)
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 13)
    }
}

#Preview {
    NavigationStack {
        PetDetailView(
            pet: Pet(
                petId: "preview-1",
                name: "Bella",
                species: "dog",
                breed: "Golden Retriever",
                gender: "female",
                dateOfBirth: "2019-03-15",
                color: "Golden",
                weightCurrent: "28.50",
                isNeutered: true,
                allergies: "Chicken, beef",
                specialNeeds: nil
            ),
            token: ""
        )
    }
}
