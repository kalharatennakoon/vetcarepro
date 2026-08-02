//
//  AppointmentsView.swift
//  VetCare
//
//  Lists, cancels, and reschedules the current pet owner's appointments.
//

import SwiftUI

struct AppointmentsView: View {
    let token: String

    @State private var appointments: [Appointment] = []
    @State private var loading = true
    @State private var loadError: String?

    @State private var filter = AppointmentSegment.upcoming
    @State private var showBooking = false
    @State private var appointmentToReschedule: Appointment?
    @State private var cancelTarget: Appointment?
    @State private var actionError: String?

    private enum AppointmentSegment: String, CaseIterable {
        case upcoming = "Upcoming"
        case past = "Past"
    }

    private var displayed: [Appointment] {
        switch filter {
        case .upcoming:
            return appointments.filter(\.isUpcoming)
                .sorted { $0.appointmentDate < $1.appointmentDate }
        case .past:
            return appointments.filter { !$0.isUpcoming }
                .sorted { $0.appointmentDate > $1.appointmentDate }
        }
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                Picker("Filter", selection: $filter) {
                    ForEach(AppointmentSegment.allCases, id: \.self) { seg in
                        Text(seg.rawValue).tag(seg)
                    }
                }
                .pickerStyle(.segmented)
                .padding(.horizontal, 20)
                .padding(.top, 8)

                if loading {
                    ProgressView()
                        .padding(.top, 40)
                } else if let error = loadError {
                    ContentUnavailableView {
                        Label("Couldn't Load Appointments", systemImage: "exclamationmark.triangle")
                    } description: {
                        Text(error)
                    } actions: {
                        Button("Try Again") {
                            Task { await loadAppointments() }
                        }
                        .buttonStyle(.bordered)
                    }
                    .padding(.top, 20)
                } else if displayed.isEmpty {
                    emptyState
                        .padding(.top, 20)
                } else {
                    LazyVStack(spacing: 12) {
                        ForEach(displayed) { appointment in
                            AppointmentCard(
                                appointment: appointment,
                                onReschedule: { appointmentToReschedule = appointment },
                                onCancel: { cancelTarget = appointment }
                            )
                        }
                    }
                    .padding(.horizontal, 20)
                }

                if let actionError {
                    Text(actionError)
                        .font(.footnote)
                        .foregroundStyle(.red)
                        .padding(.horizontal, 20)
                }
            }
            .padding(.bottom, 24)
        }
        .background(Color.appBackground)
        .navigationTitle("Appointments")
        .navigationBarTitleDisplayMode(.large)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    showBooking = true
                } label: {
                    Image(systemName: "plus")
                        .fontWeight(.semibold)
                }
            }
        }
        .task { await loadAppointments() }
        .refreshable { await loadAppointments(showSpinner: false) }
        .sheet(isPresented: $showBooking) {
            BookAppointmentView(token: token) {
                Task { await loadAppointments(showSpinner: false) }
            }
        }
        .sheet(item: $appointmentToReschedule) { appt in
            BookAppointmentView(token: token, existingAppointment: appt) {
                Task { await loadAppointments(showSpinner: false) }
            }
        }
        .confirmationDialog(
            "Cancel Appointment",
            isPresented: Binding(get: { cancelTarget != nil }, set: { if !$0 { cancelTarget = nil } }),
            titleVisibility: .visible
        ) {
            Button("Yes, Cancel Appointment", role: .destructive) {
                guard let appt = cancelTarget else { return }
                cancelTarget = nil
                Task { await cancel(appt) }
            }
            Button("Keep Appointment", role: .cancel) { cancelTarget = nil }
        } message: {
            if let appt = cancelTarget {
                Text("Cancel your \(appt.typeDisplayName.lowercased()) for \(appt.petName) on \(appt.dateFormatted) at \(appt.timeFormatted)?")
            }
        }
    }

    // MARK: - Empty state

    @ViewBuilder
    private var emptyState: some View {
        switch filter {
        case .upcoming:
            ContentUnavailableView {
                Label("No Upcoming Appointments", systemImage: "calendar.badge.clock")
            } description: {
                Text("Tap the + button to book an appointment for your pet.")
            } actions: {
                Button("Book Appointment") { showBooking = true }
                    .buttonStyle(.borderedProminent)
                    .tint(.brand)
            }
        case .past:
            ContentUnavailableView(
                "No Past Appointments",
                systemImage: "calendar",
                description: Text("Completed and cancelled appointments will appear here.")
            )
        }
    }

    // MARK: - Data

    private func loadAppointments(showSpinner: Bool = true) async {
        if showSpinner { loading = true }
        loadError = nil
        actionError = nil
        do {
            appointments = try await CustomerAuthService().fetchMyAppointments(token: token)
        } catch {
            loadError = (error as? APIError)?.errorDescription ?? error.localizedDescription
        }
        loading = false
    }

    private func cancel(_ appointment: Appointment) async {
        actionError = nil
        do {
            _ = try await CustomerAuthService().cancelAppointment(id: appointment.appointmentId, token: token)
            await loadAppointments(showSpinner: false)
        } catch {
            actionError = (error as? APIError)?.errorDescription ?? error.localizedDescription
        }
    }
}

// MARK: - Appointment card

private struct AppointmentCard: View {
    let appointment: Appointment
    let onReschedule: () -> Void
    let onCancel: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header row
            HStack(spacing: 12) {
                ZStack {
                    Circle()
                        .fill(Color.brand.opacity(0.1))
                        .frame(width: 42, height: 42)
                    Image(systemName: appointment.typeIcon)
                        .font(.system(size: 17))
                        .foregroundStyle(Color.brand)
                }

                VStack(alignment: .leading, spacing: 2) {
                    Text(appointment.petName)
                        .font(.subheadline.weight(.semibold))
                    Text(appointment.typeDisplayName)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                Spacer()

                StatusBadge(status: appointment.status, label: appointment.statusDisplayName)
            }

            Divider()

            // Details
            VStack(spacing: 6) {
                InfoRow(icon: "calendar", label: appointment.dateFormatted)
                InfoRow(icon: "clock", label: appointment.timeFormatted)
                if let vet = appointment.veterinarianName {
                    InfoRow(icon: "person.fill", label: "Dr. \(vet)")
                }
                if let reason = appointment.reason, !reason.isEmpty {
                    InfoRow(icon: "text.alignleft", label: reason)
                }
                if let cancelReason = appointment.cancellationReason, !cancelReason.isEmpty {
                    InfoRow(icon: "xmark.circle", label: cancelReason)
                        .foregroundStyle(.red)
                }
            }

            // Reschedule / Cancel actions (only when 48 h+ out)
            if appointment.canModify {
                HStack(spacing: 8) {
                    Button(action: onReschedule) {
                        Label("Reschedule", systemImage: "calendar.badge.clock")
                            .font(.caption.weight(.semibold))
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.bordered)
                    .tint(.brand)

                    Button(action: onCancel) {
                        Label("Cancel", systemImage: "xmark.circle")
                            .font(.caption.weight(.semibold))
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.bordered)
                    .tint(.red)
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

// MARK: - Helpers

private struct StatusBadge: View {
    let status: String
    let label: String

    private var color: Color {
        switch status {
        case "confirmed":   return .green
        case "scheduled":   return .blue
        case "in_progress": return .orange
        case "completed":   return Color(.systemGray)
        case "no_show":     return .orange
        default:            return .red      // cancelled
        }
    }

    var body: some View {
        Text(label)
            .font(.caption2.weight(.semibold))
            .foregroundStyle(color)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(Capsule().fill(color.opacity(0.12)))
    }
}

private struct InfoRow: View {
    let icon: String
    let label: String

    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: icon)
                .font(.caption)
                .foregroundStyle(.secondary)
                .frame(width: 16)
            Text(label)
                .font(.subheadline)
            Spacer()
        }
    }
}

#Preview {
    NavigationStack {
        AppointmentsView(token: "preview")
    }
}
