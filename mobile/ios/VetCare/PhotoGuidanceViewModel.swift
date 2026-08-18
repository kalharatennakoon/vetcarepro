//
//  PhotoGuidanceViewModel.swift
//  VetCare
//
//  Drives the AI photo guidance screen. Unlike PetOwnerChatViewModel's
//  binary isThinking flag, this needs a richer state machine - generation
//  takes ~3 minutes, so submitting a photo moves through several states
//  (uploading -> waiting -> completed/failed) rather than a single blocking
//  spinner, and the caller is expected to poll rather than await one call.
//

import Foundation
import PhotosUI

@MainActor
@Observable
final class PhotoGuidanceViewModel {
    enum Phase: Equatable {
        case idle
        case uploading
        case waiting(PhotoGuidanceJob)
        case completed(PhotoGuidanceJob)
        case failed(String)
    }

    private static let pollInterval: Duration = .seconds(10)

    private let token: String
    private let service: PhotoGuidanceService

    var pets: [Pet] = []
    var selectedPetId: String = ""
    var note: String = ""
    var selectedImageData: Data?
    var photosPickerItem: PhotosPickerItem? {
        didSet { loadSelectedPhoto() }
    }
    private(set) var phase: Phase = .idle
    private(set) var history: [PhotoGuidanceJob] = []
    var errorMessage: String?

    private var pollTask: Task<Void, Never>?

    init(token: String, service: PhotoGuidanceService = PhotoGuidanceService()) {
        self.token = token
        self.service = service
    }

    var canSubmit: Bool {
        !selectedPetId.isEmpty && selectedImageData != nil && !isBusy
    }

    var isBusy: Bool {
        switch phase {
        case .uploading, .waiting: return true
        case .idle, .completed, .failed: return false
        }
    }

    func loadPets() async {
        do {
            pets = try await CustomerAuthService().fetchMyPets(token: token)
            if selectedPetId.isEmpty { selectedPetId = pets.first?.id ?? "" }
            await loadHistory()
        } catch {
            errorMessage = (error as? APIError)?.errorDescription ?? error.localizedDescription
        }
    }

    func loadHistory() async {
        guard !selectedPetId.isEmpty else { return }
        history = (try? await service.history(petId: selectedPetId, token: token)) ?? []
    }

    private func loadSelectedPhoto() {
        guard let item = photosPickerItem else { return }
        Task {
            selectedImageData = try? await item.loadTransferable(type: Data.self)
        }
    }

    func submit() async {
        guard let imageData = selectedImageData, !selectedPetId.isEmpty else { return }
        errorMessage = nil
        phase = .uploading
        do {
            let trimmedNote = note.trimmingCharacters(in: .whitespacesAndNewlines)
            let job = try await service.submit(
                petId: selectedPetId,
                imageData: imageData,
                note: trimmedNote.isEmpty ? nil : trimmedNote,
                token: token
            )
            selectedImageData = nil
            photosPickerItem = nil
            note = ""
            phase = .waiting(job)
            startPolling(jobId: job.jobId)
        } catch {
            phase = .idle
            errorMessage = (error as? APIError)?.errorDescription ?? error.localizedDescription
        }
    }

    private func startPolling(jobId: Int) {
        pollTask?.cancel()
        pollTask = Task { [weak self] in
            guard let self else { return }
            while !Task.isCancelled {
                try? await Task.sleep(for: Self.pollInterval)
                if Task.isCancelled { return }
                await self.checkStatus(jobId: jobId)
                if case .waiting = self.phase {
                    continue
                } else {
                    return
                }
            }
        }
    }

    private func checkStatus(jobId: Int) async {
        do {
            let job = try await service.pollStatus(jobId: jobId, token: token)
            switch job.status {
            case "completed":
                phase = .completed(job)
                await loadHistory()
            case "failed":
                phase = .failed(job.errorMessage ?? "Something went wrong generating guidance for this photo.")
                await loadHistory()
            default:
                phase = .waiting(job)
            }
        } catch {
            // A transient network hiccup shouldn't kill the poll loop - just try again next tick.
        }
    }

    /// Call from the view's .onDisappear to stop background polling.
    func stopPolling() {
        pollTask?.cancel()
        pollTask = nil
    }

    func dismissResult() {
        phase = .idle
    }
}
