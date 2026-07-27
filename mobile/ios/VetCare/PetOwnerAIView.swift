//
//  PetOwnerAIView.swift
//  VetCare
//
//  AI assistant for signed-in pet owners. Answers are scoped to their own
//  pets' records server-side via POST /api/ai/customer-chat. Mirrors the
//  web PetOwnerAIWidget behaviour.
//

import SwiftUI

struct PetOwnerAIView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(CustomerSession.self) private var session

    @State private var viewModel: PetOwnerChatViewModel
    @FocusState private var isInputFocused: Bool

    init(token: String) {
        _viewModel = State(initialValue: PetOwnerChatViewModel(token: token))
    }

    var body: some View {
        VStack(spacing: 0) {
            header
            banner
            conversation
            inputBar
        }
        .background(Color.appBackground)
        .toolbar(.hidden, for: .navigationBar)
    }

    // MARK: - Header

    private var header: some View {
        HStack(spacing: 10) {
            Button { dismiss() } label: {
                Image(systemName: "chevron.left")
                    .font(.body.weight(.semibold))
                    .foregroundStyle(.primary)
            }

            Image(systemName: "pawprint.fill")
                .foregroundStyle(Color.brand)
            Text("AI Assistant")
                .font(.headline)

            Spacer()

            if let name = session.customer?.firstName {
                Label(name, systemImage: "person.circle")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .background(.regularMaterial)
        .overlay(alignment: .bottom) { Divider() }
    }

    // MARK: - Banner

    private var banner: some View {
        HStack(alignment: .top, spacing: 8) {
            Image(systemName: "lock.shield")
                .font(.caption)
                .foregroundStyle(.secondary)
            Text("Scoped to your own pets only. Not a replacement for your vet's judgment.")
                .font(.caption)
                .foregroundStyle(.secondary)
            Spacer(minLength: 0)
        }
        .padding(10)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: 10, style: .continuous)
                .fill(Color.white)
                .overlay(
                    RoundedRectangle(cornerRadius: 10, style: .continuous)
                        .strokeBorder(Color.black.opacity(0.06), lineWidth: 1)
                )
        )
        .padding(.horizontal, 16)
        .padding(.top, 12)
    }

    // MARK: - Conversation

    private var conversation: some View {
        ScrollViewReader { proxy in
            ScrollView {
                LazyVStack(spacing: 14) {
                    ForEach(viewModel.messages) { message in
                        MessageBubble(message: message)
                            .id(message.id)
                    }
                    if viewModel.isEmpty {
                        promptChips
                    }
                    if viewModel.isThinking {
                        ThinkingBubble()
                            .id(thinkingID)
                    }
                }
                .padding(16)
            }
            .scrollDismissesKeyboard(.interactively)
            .onChange(of: viewModel.messages.count) { scrollToBottom(proxy) }
            .onChange(of: viewModel.isThinking) { scrollToBottom(proxy) }
        }
    }

    private let thinkingID = "thinking-indicator"

    private func scrollToBottom(_ proxy: ScrollViewProxy) {
        withAnimation(.easeOut(duration: 0.25)) {
            if viewModel.isThinking {
                proxy.scrollTo(thinkingID, anchor: .bottom)
            } else if let last = viewModel.messages.last {
                proxy.scrollTo(last.id, anchor: .bottom)
            }
        }
    }

    private var promptChips: some View {
        VStack(spacing: 10) {
            ForEach(viewModel.suggestedPrompts, id: \.self) { prompt in
                Button {
                    Task { await viewModel.send(prompt) }
                } label: {
                    Text(prompt)
                        .font(.subheadline)
                        .foregroundStyle(.primary)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 12)
                        .background(
                            RoundedRectangle(cornerRadius: 14, style: .continuous)
                                .fill(Color.white)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 14, style: .continuous)
                                        .strokeBorder(Color.brand.opacity(0.25), lineWidth: 1)
                                )
                        )
                }
            }
        }
        .padding(.top, 4)
    }

    // MARK: - Input

    private var inputBar: some View {
        HStack(spacing: 10) {
            TextField("Ask about your pets...", text: $viewModel.input, axis: .vertical)
                .lineLimit(1...4)
                .focused($isInputFocused)
                .submitLabel(.send)
                .padding(.horizontal, 14)
                .padding(.vertical, 10)
                .background(
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .fill(Color.white)
                        .overlay(
                            RoundedRectangle(cornerRadius: 12, style: .continuous)
                                .strokeBorder(Color.black.opacity(0.1), lineWidth: 1)
                        )
                )

            Button {
                isInputFocused = false
                Task { await viewModel.send() }
            } label: {
                Image(systemName: "arrow.up")
                    .font(.headline)
                    .foregroundStyle(.white)
                    .frame(width: 44, height: 44)
                    .background(
                        Circle().fill(viewModel.canSend
                            ? AnyShapeStyle(LinearGradient.brand)
                            : AnyShapeStyle(Color.gray.opacity(0.4)))
                    )
            }
            .disabled(!viewModel.canSend)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .background(.regularMaterial)
        .overlay(alignment: .top) { Divider() }
    }
}

#Preview {
    NavigationStack {
        PetOwnerAIView(token: "preview-token")
            .environment(CustomerSession())
    }
}
