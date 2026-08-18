//
//  PhotoGuidanceView.swift
//  VetCare
//
//  AI photo guidance for pet owners. Submit a photo of a pet for general,
//  non-diagnostic AI guidance. Generation runs in the background (~3 min)
//  via ml/scripts/rag/photo_guidance.py; this view polls every 10 seconds
//  until the job finishes.
//

import SwiftUI
import PhotosUI

struct PhotoGuidanceView: View {
    @Environment(CustomerSession.self) private var session
    let token: String

    // Pet selection
    @State private var pets: [Pet] = []
    @State private var selectedPetId: String = ""
    @State private var petsLoading = true

    // Photo picker
    @State private var photoItem: PhotosPickerItem? = nil
    @State private var photoImage: Image? = nil
    @State private var photoData: Data? = nil

    // Note
    @State private var note: String = ""

    // Submission
    @State private var submitting = false
    @State private var submitError: String? = nil
    @State private var showSubmitError = false

    // Job tracking
    @State private var currentJob: PhotoGuidanceJob? = nil
    @State private var history: [PhotoGuidanceJob] = []
    @State private var pollTask: Task<Void, Never>? = nil

    private var canSubmit: Bool {
        !selectedPetId.isEmpty && photoData != nil && !submitting
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                if petsLoading {
                    HStack { Spacer(); ProgressView(); Spacer() }
                        .padding(.vertical, 40)
                } else if pets.isEmpty {
                    ContentUnavailableView(
                        "No Pets on File",
                        systemImage: "pawprint",
                        description: Text("Your pets will appear here once the clinic adds them to your account.")
                    )
                    .padding(.top, 40)
                } else {
                    bannerCard
                    formCard
                    if let job = currentJob {
                        jobCard(job)
                    }
                    if !history.isEmpty {
                        historyCard
                    }
                }
            }
            .padding(20)
        }
        .background(Color.appBackground)
        .navigationTitle("AI Visual Care Guidance")
        .navigationBarTitleDisplayMode(.large)
        .task { await loadInitial() }
        .onChange(of: selectedPetId) { _, _ in Task { await loadHistory() } }
        .onChange(of: photoItem) { _, _ in Task { await loadPhotoData() } }
        .onDisappear { pollTask?.cancel() }
        .alert("Submission Failed", isPresented: $showSubmitError) {
            Button("OK") { }
        } message: {
            if let err = submitError { Text(err) }
        }
    }

    // MARK: - Banner

    private var bannerCard: some View {
        HStack(alignment: .top, spacing: 8) {
            Image(systemName: "exclamationmark.shield")
                .font(.caption)
                .foregroundStyle(.secondary)
            Text("This is general visual guidance only — not a diagnosis. Always visit a vet for anything concerning. Photos you upload are used only to generate this guidance and are handled as personal data under Sri Lanka's Personal Data Protection Act (PDPA).")
                .font(.caption)
                .foregroundStyle(.secondary)
            Spacer(minLength: 0)
        }
        .padding(10)
        .frame(maxWidth: .infinity)
        .background(
            RoundedRectangle(cornerRadius: 10, style: .continuous)
                .fill(Color.cardSurface)
                .overlay(
                    RoundedRectangle(cornerRadius: 10, style: .continuous)
                        .strokeBorder(Color.primary.opacity(0.06), lineWidth: 1)
                )
        )
    }

    // MARK: - Submission form

    private var formCard: some View {
        VStack(alignment: .leading, spacing: 16) {

            // Pet picker
            VStack(alignment: .leading, spacing: 6) {
                Text("Pet")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                Picker("Pet", selection: $selectedPetId) {
                    ForEach(pets) { pet in
                        Text(pet.name).tag(pet.petId)
                    }
                }
                .pickerStyle(.menu)
                .tint(Color.brand)
                .frame(maxWidth: .infinity, alignment: .leading)
            }

            Divider()

            // Photo picker tap area
            PhotosPicker(
                selection: $photoItem,
                matching: .images,
                photoLibrary: .shared()
            ) {
                photoPickerLabel
            }
            .buttonStyle(.plain)

            Divider()

            // Optional note
            VStack(alignment: .leading, spacing: 6) {
                Text("Note (optional)")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                TextField("Describe what you're seeing…", text: $note, axis: .vertical)
                    .lineLimit(3...6)
                    .font(.subheadline)
            }

            Divider()

            // Submit button
            Button {
                Task { await submit() }
            } label: {
                ZStack {
                    HStack(spacing: 8) {
                        Image(systemName: "arrow.up.doc.fill")
                        Text("Upload for AI Guidance")
                    }
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(canSubmit ? .white : .secondary)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 13)
                    .background(
                        RoundedRectangle(cornerRadius: 12, style: .continuous)
                            .fill(canSubmit ? AnyShapeStyle(LinearGradient.brand) : AnyShapeStyle(Color.secondary.opacity(0.12)))
                    )
                    .opacity(submitting ? 0 : 1)

                    if submitting { ProgressView().tint(Color.brand) }
                }
            }
            .disabled(!canSubmit)
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .fill(Color.cardSurface)
                .shadow(color: .black.opacity(0.04), radius: 8, y: 2)
        )
    }

    @ViewBuilder
    private var photoPickerLabel: some View {
        if let image = photoImage {
            ZStack(alignment: .topTrailing) {
                image
                    .resizable()
                    .scaledToFill()
                    .frame(maxWidth: .infinity)
                    .frame(height: 200)
                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))

                Image(systemName: "pencil.circle.fill")
                    .font(.title2)
                    .foregroundStyle(Color.brand)
                    .background(Circle().fill(.white).padding(2))
                    .padding(8)
            }
        } else {
            VStack(spacing: 10) {
                Image(systemName: "camera.fill")
                    .font(.largeTitle)
                    .foregroundStyle(Color.brand)
                Text("Tap to choose a photo")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
            .frame(maxWidth: .infinity)
            .frame(height: 140)
            .background(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .fill(Color.brand.opacity(0.06))
                    .overlay(
                        RoundedRectangle(cornerRadius: 12, style: .continuous)
                            .strokeBorder(
                                Color.brand.opacity(0.25),
                                style: StrokeStyle(lineWidth: 1.5, dash: [6])
                            )
                    )
            )
        }
    }

    // MARK: - Current job status card

    @ViewBuilder
    private func jobCard(_ job: PhotoGuidanceJob) -> some View {
        VStack(alignment: .leading, spacing: 14) {
            Label("Current Analysis", systemImage: "brain")
                .font(.headline)

            HStack(spacing: 10) {
                statusIcon(for: job.status)
                VStack(alignment: .leading, spacing: 2) {
                    Text(job.statusDisplay)
                        .font(.subheadline.weight(.medium))
                    if let date = job.createdAtDisplay {
                        Text("Submitted \(date)")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
                Spacer()
            }

            if job.status == "pending" || job.status == "processing" {
                HStack(spacing: 8) {
                    ProgressView().scaleEffect(0.8)
                    Text("Vision analysis takes around 3 minutes. Checking automatically every 10 s.")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                .padding(10)
                .background(
                    RoundedRectangle(cornerRadius: 10, style: .continuous)
                        .fill(Color.brand.opacity(0.06))
                )
            }

            if job.status == "completed", let text = job.guidanceText {
                Divider()
                Text(text)
                    .font(.subheadline)
            }

            if job.status == "failed" {
                HStack(spacing: 8) {
                    Image(systemName: "exclamationmark.triangle")
                        .foregroundStyle(.red)
                    Text(job.errorMessage ?? "Analysis failed. Please try again.")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
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

    // MARK: - History

    private var historyCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("Past Guidance")
                .font(.headline)

            ForEach(Array(history.enumerated()), id: \.element.id) { index, job in
                VStack(alignment: .leading, spacing: 10) {
                    HStack(spacing: 8) {
                        statusIcon(for: job.status)
                        VStack(alignment: .leading, spacing: 1) {
                            Text(job.statusDisplay)
                                .font(.caption.weight(.semibold))
                            if let date = job.createdAtDisplay {
                                Text(date)
                                    .font(.caption2)
                                    .foregroundStyle(.secondary)
                            }
                        }
                        Spacer()
                    }
                    if let text = job.guidanceText {
                        Text(text)
                            .font(.caption)
                            .padding(10)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(
                                RoundedRectangle(cornerRadius: 8, style: .continuous)
                                    .fill(Color.appBackground)
                            )
                    }
                    if job.status == "failed" {
                        Text(job.errorMessage ?? "Analysis failed.")
                            .font(.caption)
                            .foregroundStyle(.red)
                    }
                }

                if index < history.count - 1 {
                    Divider()
                }
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

    // MARK: - Helpers

    private func statusIconValues(for status: String) -> (String, Color) {
        switch status {
        case "pending":    return ("clock", .secondary)
        case "processing": return ("arrow.clockwise", Color.brand)
        case "completed":  return ("checkmark.circle.fill", .green)
        default:           return ("xmark.circle.fill", .red)
        }
    }

    private func statusIcon(for status: String) -> some View {
        let (icon, color) = statusIconValues(for: status)
        return Image(systemName: icon)
            .font(.title3)
            .foregroundStyle(color)
    }

    // MARK: - Data

    private func loadInitial() async {
        petsLoading = true
        do {
            pets = try await CustomerAuthService().fetchMyPets(token: token)
            if let first = pets.first, selectedPetId.isEmpty {
                selectedPetId = first.petId
                await loadHistory()
            }
        } catch { }
        petsLoading = false
    }

    private func loadPhotoData() async {
        guard let item = photoItem else {
            photoData = nil
            photoImage = nil
            return
        }
        if let raw = try? await item.loadTransferable(type: Data.self),
           let ui = UIImage(data: raw),
           let jpeg = ui.jpegData(compressionQuality: 0.82) {
            photoData = jpeg
            photoImage = Image(uiImage: UIImage(data: jpeg) ?? ui)
        }
    }

    private func submit() async {
        guard let data = photoData, !selectedPetId.isEmpty else { return }
        submitting = true
        let trimmedNote = note.trimmingCharacters(in: .whitespacesAndNewlines)
        do {
            let job = try await CustomerAuthService().submitPhotoGuidance(
                petId: selectedPetId,
                imageData: data,
                note: trimmedNote.isEmpty ? nil : trimmedNote,
                token: token
            )
            currentJob = job
            photoItem = nil
            photoData = nil
            photoImage = nil
            note = ""
            startPolling(jobId: job.jobId)
        } catch {
            submitError = (error as? APIError)?.errorDescription ?? error.localizedDescription
            showSubmitError = true
        }
        submitting = false
    }

    private func loadHistory() async {
        guard !selectedPetId.isEmpty else { return }
        if let jobs = try? await CustomerAuthService().listPhotoGuidanceHistory(petId: selectedPetId, token: token) {
            history = jobs
        }
    }

    private func startPolling(jobId: Int) {
        pollTask?.cancel()
        pollTask = Task {
            while !Task.isCancelled {
                try? await Task.sleep(for: .seconds(10))
                guard !Task.isCancelled else { break }
                guard let updated = try? await CustomerAuthService().getPhotoGuidanceStatus(jobId: jobId, token: token)
                else { break }
                currentJob = updated
                if updated.isFinished {
                    await loadHistory()
                    break
                }
            }
        }
    }
}

#Preview {
    NavigationStack {
        PhotoGuidanceView(token: "preview-token")
            .environment(CustomerSession())
    }
}
