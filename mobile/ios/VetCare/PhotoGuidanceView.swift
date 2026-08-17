//
//  PhotoGuidanceView.swift
//  VetCare
//
//  Lets a pet owner upload a photo of their pet and get general, AI
//  guidance on what to do next (never a diagnosis, never a named medicine -
//  see ml/scripts/rag/photo_guidance.py). Generation takes ~3 minutes, so
//  this screen submits then polls rather than blocking, unlike the AI chat
//  screen's synchronous request/response.
//

import SwiftUI
import PhotosUI

struct PhotoGuidanceView: View {
    let token: String

    @State private var viewModel: PhotoGuidanceViewModel

    init(token: String) {
        self.token = token
        _viewModel = State(initialValue: PhotoGuidanceViewModel(token: token))
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                disclaimer
                submitCard
                resultCard
                historyCard
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 16)
        }
        .background(Color.appBackground)
        .navigationTitle("AI Photo Guidance")
        .navigationBarTitleDisplayMode(.large)
        .task { await viewModel.loadPets() }
        .onDisappear { viewModel.stopPolling() }
    }

    // MARK: - Disclaimer

    private var disclaimer: some View {
        HStack(alignment: .top, spacing: 8) {
            Image(systemName: "info.circle")
                .foregroundStyle(.orange)
            Text("This is general guidance, not a diagnosis or medical advice. Always see a veterinarian for anything concerning.")
                .font(.caption)
                .foregroundStyle(.secondary)
            Spacer(minLength: 0)
        }
        .padding(10)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: 10, style: .continuous)
                .fill(Color.orange.opacity(0.1))
        )
    }

    // MARK: - Submit form

    private var submitCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            Label("Submit a Photo", systemImage: "camera")
                .font(.headline)

            if viewModel.pets.isEmpty {
                Text("No pets on file. Please contact the clinic.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            } else {
                Picker("Pet", selection: $viewModel.selectedPetId) {
                    ForEach(viewModel.pets) { pet in
                        Text(pet.name).tag(pet.petId)
                    }
                }
                .pickerStyle(.menu)
                .onChange(of: viewModel.selectedPetId) {
                    Task { await viewModel.loadHistory() }
                }
            }

            PhotosPicker(selection: $viewModel.photosPickerItem, matching: .images) {
                if let data = viewModel.selectedImageData, let uiImage = UIImage(data: data) {
                    Image(uiImage: uiImage)
                        .resizable()
                        .scaledToFill()
                        .frame(height: 180)
                        .frame(maxWidth: .infinity)
                        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                } else {
                    VStack(spacing: 8) {
                        Image(systemName: "photo.badge.plus")
                            .font(.system(size: 28))
                        Text("Choose a Photo")
                            .font(.subheadline.weight(.medium))
                    }
                    .foregroundStyle(Color.brand)
                    .frame(height: 140)
                    .frame(maxWidth: .infinity)
                    .background(
                        RoundedRectangle(cornerRadius: 14, style: .continuous)
                            .fill(Color.brand.opacity(0.08))
                    )
                }
            }
            .disabled(viewModel.isBusy)

            TextField(
                "What are you noticing? (optional)",
                text: $viewModel.note,
                axis: .vertical
            )
            .lineLimit(2...4)
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(
                RoundedRectangle(cornerRadius: 10, style: .continuous)
                    .fill(Color.appBackground)
            )
            .disabled(viewModel.isBusy)

            if let errorMessage = viewModel.errorMessage {
                Text(errorMessage)
                    .font(.footnote)
                    .foregroundStyle(.red)
            }

            Button {
                Task { await viewModel.submit() }
            } label: {
                HStack {
                    Spacer()
                    if case .uploading = viewModel.phase {
                        ProgressView().tint(.white)
                    } else {
                        Text("Get AI Guidance")
                            .font(.subheadline.weight(.semibold))
                    }
                    Spacer()
                }
                .foregroundStyle(.white)
                .padding(.vertical, 12)
                .background(
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .fill(viewModel.canSubmit ? AnyShapeStyle(LinearGradient.brand) : AnyShapeStyle(Color.gray.opacity(0.3)))
                )
            }
            .disabled(!viewModel.canSubmit)
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .fill(Color.cardSurface)
                .shadow(color: .black.opacity(0.04), radius: 8, y: 2)
        )
    }

    // MARK: - Latest result

    @ViewBuilder
    private var resultCard: some View {
        switch viewModel.phase {
        case .idle, .uploading:
            EmptyView()
        case .waiting(let job):
            statusCard(job: job, waiting: true)
        case .completed(let job):
            statusCard(job: job, waiting: false)
        case .failed(let message):
            VStack(alignment: .leading, spacing: 8) {
                Label("Latest Result", systemImage: "wand.and.stars")
                    .font(.headline)
                Text(message)
                    .font(.subheadline)
                    .foregroundStyle(.red)
            }
            .padding(16)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .fill(Color.cardSurface)
                    .shadow(color: .black.opacity(0.04), radius: 8, y: 2)
            )
        }
    }

    private func statusCard(job: PhotoGuidanceJob, waiting: Bool) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Label("Latest Result", systemImage: "wand.and.stars")
                .font(.headline)

            HStack(spacing: 6) {
                if waiting { ProgressView().controlSize(.small) }
                Text(job.statusDisplayName)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(waiting ? Color.brand : .green)
            }

            if waiting {
                Text("This can take a few minutes. Feel free to leave this screen - your result will be waiting here when you come back.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            } else if let text = job.guidanceText {
                Text(text)
                    .font(.subheadline)
                    .foregroundStyle(.primary)
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

    @ViewBuilder
    private var historyCard: some View {
        if !viewModel.history.isEmpty {
            VStack(alignment: .leading, spacing: 12) {
                Label("History", systemImage: "clock.arrow.circlepath")
                    .font(.headline)

                ForEach(viewModel.history) { job in
                    VStack(alignment: .leading, spacing: 4) {
                        HStack {
                            Text(job.statusDisplayName)
                                .font(.caption.weight(.semibold))
                                .foregroundStyle(job.status == "completed" ? .green : .secondary)
                            Spacer()
                            Text(job.createdAtFormatted)
                                .font(.caption2)
                                .foregroundStyle(.tertiary)
                        }
                        if job.status == "completed", let text = job.guidanceText {
                            Text(text)
                                .font(.footnote)
                                .foregroundStyle(.secondary)
                                .lineLimit(4)
                        }
                    }
                    .padding(.vertical, 6)
                    if job.id != viewModel.history.last?.id {
                        Divider()
                    }
                }
            }
            .padding(16)
            .background(
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .fill(Color.cardSurface)
                    .shadow(color: .black.opacity(0.04), radius: 8, y: 2)
            )
        }
    }
}

#Preview {
    NavigationStack {
        PhotoGuidanceView(token: "preview-token")
    }
}
