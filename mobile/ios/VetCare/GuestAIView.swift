//
//  GuestAIView.swift
//  VetCare
//
//  Guest AI assistant: general pet-care Q&A, no clinic or customer data.
//  Talks to POST /api/ai/public-chat. Follows the guest wireframe (2e).
//

import SwiftUI

struct GuestAIView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var viewModel = GuestChatViewModel()
    @FocusState private var isInputFocused: Bool

    var body: some View {
        VStack(spacing: 0) {
            header
            banners
            conversation
            inputBar
        }
        .background(Color.appBackground)
        .toolbar(.hidden, for: .navigationBar)
    }

    // MARK: - Header

    private var header: some View {
        HStack(spacing: 10) {
            Button {
                dismiss()
            } label: {
                Image(systemName: "chevron.left")
                    .font(.body.weight(.semibold))
                    .foregroundStyle(.primary)
            }

            Image(systemName: "pawprint.fill")
                .foregroundStyle(Color.brand)
            Text("VetCare Pro")
                .font(.headline)

            Spacer()

            NavigationLink(value: WelcomeRoute.login(.petOwner)) {
                Text("Sign In")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(Color.brand)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 7)
                    .overlay(
                        Capsule().strokeBorder(Color.brand, lineWidth: 1.5)
                    )
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .background(.regularMaterial)
        .overlay(alignment: .bottom) {
            Divider()
        }
    }

    // MARK: - Banners

    private var banners: some View {
        VStack(spacing: 8) {
            noticeBanner(
                "General pet-care info only. Sign in for your own pet's data.",
                systemImage: "info.circle"
            )
            noticeBanner(
                "Decision-support only — does not replace a vet's judgment.",
                systemImage: "stethoscope"
            )
        }
        .padding(.horizontal, 16)
        .padding(.top, 12)
    }

    private func noticeBanner(_ text: String, systemImage: String) -> some View {
        HStack(alignment: .top, spacing: 8) {
            Image(systemName: systemImage)
                .font(.caption)
                .foregroundStyle(.secondary)
            Text(text)
                .font(.caption)
                .foregroundStyle(.secondary)
            Spacer(minLength: 0)
        }
        .padding(10)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: 10, style: .continuous)
                .fill(Color.cardSurface)
                .overlay(
                    RoundedRectangle(cornerRadius: 10, style: .continuous)
                        .strokeBorder(Color.primary.opacity(0.06), lineWidth: 1)
                )
        )
    }

    // MARK: - Conversation

    private var conversation: some View {
        ScrollViewReader { proxy in
            ScrollView {
                if viewModel.isEmpty {
                    emptyState
                        .padding(.top, 40)
                } else {
                    LazyVStack(spacing: 14) {
                        ForEach(viewModel.messages) { message in
                            MessageBubble(message: message)
                                .id(message.id)
                        }
                        if viewModel.isThinking {
                            ThinkingBubble()
                                .id(thinkingID)
                        }
                    }
                    .padding(16)
                }
            }
            .scrollDismissesKeyboard(.interactively)
            .onChange(of: viewModel.messages.count) {
                scrollToBottom(proxy)
            }
            .onChange(of: viewModel.isThinking) {
                scrollToBottom(proxy)
            }
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

    private var emptyState: some View {
        VStack(spacing: 18) {
            ZStack {
                Circle()
                    .fill(Color.brand.opacity(0.12))
                    .frame(width: 66, height: 66)
                Image(systemName: "sparkles")
                    .font(.system(size: 28, weight: .semibold))
                    .foregroundStyle(Color.brand)
            }
            Text("Ask me anything about pet care")
                .font(.title3.weight(.semibold))
                .multilineTextAlignment(.center)

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
                                    .fill(Color.cardSurface)
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
        .padding(.horizontal, 20)
    }

    // MARK: - Input

    private var inputBar: some View {
        HStack(spacing: 10) {
            TextField("Ask a pet care question...", text: $viewModel.input, axis: .vertical)
                .lineLimit(1...4)
                .focused($isInputFocused)
                .submitLabel(.send)
                .accessibilityIdentifier("guestMessageField")
                .padding(.horizontal, 14)
                .padding(.vertical, 10)
                .background(
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .fill(Color.cardSurface)
                        .overlay(
                            RoundedRectangle(cornerRadius: 12, style: .continuous)
                                .strokeBorder(Color.primary.opacity(0.1), lineWidth: 1)
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
                        Circle().fill(viewModel.canSend ? AnyShapeStyle(LinearGradient.brand)
                                                          : AnyShapeStyle(Color.gray.opacity(0.4)))
                    )
            }
            .disabled(!viewModel.canSend)
            .accessibilityIdentifier("guestSendButton")
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .background(.regularMaterial)
        .overlay(alignment: .top) { Divider() }
    }
}

// MARK: - Message bubble

struct MessageBubble: View {
    let message: ChatMessage

    private var isUser: Bool { message.role == .user }

    var body: some View {
        VStack(alignment: isUser ? .trailing : .leading, spacing: 6) {
            Group {
                if isUser {
                    Text(message.text)
                } else {
                    AssistantMarkdown(text: message.text)
                }
            }
            .font(.body)
            .foregroundStyle(isUser ? Color.white : Color.primary)
            .multilineTextAlignment(.leading)
            .padding(.horizontal, 14)
            .padding(.vertical, 10)
            .background(bubbleBackground)
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            .frame(maxWidth: 300, alignment: isUser ? .trailing : .leading)

            // Guest answers are grounded in FAQs when a match exists, otherwise
            // they come from the model's general veterinary knowledge — label
            // which, so a non-FAQ answer reads as intentional, not ungrounded.
            if message.isAnswer {
                answerFooter
            }
        }
        .frame(maxWidth: .infinity, alignment: isUser ? .trailing : .leading)
    }

    @ViewBuilder
    private var bubbleBackground: some View {
        if isUser {
            LinearGradient.brand
        } else {
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .fill(Color.cardSurface)
                .overlay(
                    RoundedRectangle(cornerRadius: 16, style: .continuous)
                        .strokeBorder(Color.primary.opacity(0.08), lineWidth: 1)
                )
        }
    }

    @ViewBuilder
    private var answerFooter: some View {
        if message.sources.isEmpty {
            HStack(alignment: .top, spacing: 5) {
                Image(systemName: "brain.head.profile")
                    .font(.system(size: 10))
                Text("General veterinary knowledge — not from a specific clinic article.")
                Spacer(minLength: 0)
            }
            .font(.caption2)
            .foregroundStyle(.secondary)
            .frame(maxWidth: 300, alignment: .leading)
        } else {
            VStack(alignment: .leading, spacing: 5) {
                Label("From our clinic FAQs", systemImage: "book")
                    .font(.caption2.weight(.semibold))
                    .foregroundStyle(.secondary)
                FlowLayout(spacing: 6) {
                    ForEach(message.sources) { source in
                        HStack(spacing: 4) {
                            Image(systemName: "doc.text")
                                .font(.system(size: 9))
                            Text(source.label)
                                .lineLimit(1)
                        }
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Capsule().fill(Color.primary.opacity(0.05)))
                    }
                }
            }
            .frame(maxWidth: 300, alignment: .leading)
        }
    }
}

// MARK: - Markdown rendering

/// Renders the lightweight markdown the local model produces — **bold**,
/// "- " bullet lists, "1." numbered lists, and paragraph breaks — without a
/// markdown dependency. Mirrors the web client's guest formatter.
struct AssistantMarkdown: View {
    let text: String

    var body: some View {
        let blocks = Self.parse(text)
        VStack(alignment: .leading, spacing: 8) {
            ForEach(blocks.indices, id: \.self) { index in
                view(for: blocks[index])
            }
        }
    }

    private enum Block {
        case paragraph(AttributedString)
        case bullets([AttributedString])
        case numbered([AttributedString])
    }

    @ViewBuilder
    private func view(for block: Block) -> some View {
        switch block {
        case .paragraph(let text):
            Text(text)
        case .bullets(let items):
            VStack(alignment: .leading, spacing: 4) {
                ForEach(items.indices, id: \.self) { i in
                    listRow(marker: "•", content: items[i])
                }
            }
        case .numbered(let items):
            VStack(alignment: .leading, spacing: 4) {
                ForEach(items.indices, id: \.self) { i in
                    listRow(marker: "\(i + 1).", content: items[i])
                }
            }
        }
    }

    private func listRow(marker: String, content: AttributedString) -> some View {
        HStack(alignment: .firstTextBaseline, spacing: 6) {
            Text(marker)
            Text(content)
            Spacer(minLength: 0)
        }
    }

    /// Parses `**bold**` inline markup for a single line.
    private static func inline(_ line: String) -> AttributedString {
        (try? AttributedString(
            markdown: line,
            options: .init(interpretedSyntax: .inlineOnly)
        )) ?? AttributedString(line)
    }

    private static func parse(_ text: String) -> [Block] {
        var blocks: [Block] = []
        var paragraph: [String] = []
        var bullets: [AttributedString] = []
        var numbered: [AttributedString] = []

        func flushParagraph() {
            guard !paragraph.isEmpty else { return }
            var combined = AttributedString()
            for (i, line) in paragraph.enumerated() {
                if i > 0 { combined.append(AttributedString("\n")) }
                combined.append(inline(line))
            }
            blocks.append(.paragraph(combined))
            paragraph.removeAll()
        }
        func flushBullets() {
            guard !bullets.isEmpty else { return }
            blocks.append(.bullets(bullets))
            bullets.removeAll()
        }
        func flushNumbered() {
            guard !numbered.isEmpty else { return }
            blocks.append(.numbered(numbered))
            numbered.removeAll()
        }
        func flushAll() { flushParagraph(); flushBullets(); flushNumbered() }

        let lines = text.trimmingCharacters(in: .whitespacesAndNewlines)
            .components(separatedBy: "\n")

        for raw in lines {
            let line = raw.trimmingCharacters(in: .whitespaces)
            if line.isEmpty {
                flushAll()
            } else if let range = line.range(of: #"^[-*]\s+"#, options: .regularExpression) {
                flushParagraph(); flushNumbered()
                bullets.append(inline(String(line[range.upperBound...])))
            } else if let range = line.range(of: #"^\d+[.)]\s+"#, options: .regularExpression) {
                flushParagraph(); flushBullets()
                numbered.append(inline(String(line[range.upperBound...])))
            } else {
                flushBullets(); flushNumbered()
                paragraph.append(line)
            }
        }
        flushAll()
        return blocks
    }
}

// MARK: - Thinking indicator

struct ThinkingBubble: View {
    @State private var animating = false

    var body: some View {
        HStack(spacing: 6) {
            Text("Thinking")
                .font(.subheadline)
                .foregroundStyle(.secondary)
            ForEach(0..<3, id: \.self) { index in
                Circle()
                    .fill(Color.secondary)
                    .frame(width: 6, height: 6)
                    .opacity(animating ? 1 : 0.3)
                    .animation(
                        .easeInOut(duration: 0.6).repeatForever().delay(Double(index) * 0.2),
                        value: animating
                    )
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
        .background(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .fill(Color.cardSurface)
                .overlay(
                    RoundedRectangle(cornerRadius: 16, style: .continuous)
                        .strokeBorder(Color.primary.opacity(0.08), lineWidth: 1)
                )
        )
        .frame(maxWidth: .infinity, alignment: .leading)
        .onAppear { animating = true }
    }
}

// MARK: - Flow layout for source chips

/// A simple wrapping layout so citation chips flow onto multiple lines.
struct FlowLayout: Layout {
    var spacing: CGFloat = 6

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout Void) -> CGSize {
        let maxWidth = proposal.width ?? .infinity
        var rows: [CGFloat] = [0]
        var x: CGFloat = 0
        var totalHeight: CGFloat = 0
        var rowHeight: CGFloat = 0

        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            if x + size.width > maxWidth, x > 0 {
                totalHeight += rowHeight + spacing
                x = 0
                rowHeight = 0
                rows.append(0)
            }
            x += size.width + spacing
            rowHeight = max(rowHeight, size.height)
        }
        totalHeight += rowHeight
        return CGSize(width: maxWidth == .infinity ? x : maxWidth, height: totalHeight)
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout Void) {
        var x = bounds.minX
        var y = bounds.minY
        var rowHeight: CGFloat = 0

        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            if x + size.width > bounds.maxX, x > bounds.minX {
                x = bounds.minX
                y += rowHeight + spacing
                rowHeight = 0
            }
            subview.place(at: CGPoint(x: x, y: y), proposal: ProposedViewSize(size))
            x += size.width + spacing
            rowHeight = max(rowHeight, size.height)
        }
    }
}

#Preview {
    NavigationStack {
        GuestAIView()
    }
}
