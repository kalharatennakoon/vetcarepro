//
//  BookAppointmentView.swift
//  VetCare
//
//  Booking form for scheduling a new appointment or rescheduling an existing
//  one. Fetches available time slots live as the user changes the date/vet.
//

import SwiftUI

struct BookAppointmentView: View {
    @Environment(\.dismiss) private var dismiss

    let token: String
    var existingAppointment: Appointment? = nil
    var onSuccess: () -> Void

    // Form state
    @State private var selectedPetId: String = ""
    @State private var selectedType: String = "checkup"
    @State private var reason: String = ""
    @State private var selectedDate: Date = Self.defaultBookingDate
    @State private var selectedVetId: Int? = nil
    @State private var selectedTimeSlot: String? = nil

    // Remote data
    @State private var pets: [Pet] = []
    @State private var vets: [Veterinarian] = []
    @State private var petsLoading = true
    @State private var initialDataLoaded = false

    // Availability
    @State private var availabilityData: AvailabilityData? = nil
    @State private var availabilityLoading = false
    @State private var availabilityError: String? = nil

    // Submission
    @State private var submitting = false
    @State private var submitError: String? = nil
    @State private var successMessage: String? = nil
    @State private var showSuccessAlert = false
    @State private var showErrorAlert = false

    private static let appointmentTypes: [(id: String, name: String, icon: String)] = [
        ("checkup",      "Check-up",     "stethoscope"),
        ("vaccination",  "Vaccination",  "syringe"),
        ("follow_up",    "Follow-up",    "arrow.clockwise"),
        ("consultation", "Consultation", "text.bubble")
    ]

    private static var defaultBookingDate: Date {
        // 49 h from now (1 h buffer over the 48 h minimum), set to 9 AM.
        var comps = Calendar.current.dateComponents(
            [.year, .month, .day],
            from: Date().addingTimeInterval(49 * 3600)
        )
        comps.hour = 9; comps.minute = 0; comps.second = 0
        var date = Calendar.current.date(from: comps) ?? Date().addingTimeInterval(49 * 3600)
        // Skip Sunday (weekday == 1).
        if Calendar.current.component(.weekday, from: date) == 1 {
            date = Calendar.current.date(byAdding: .day, value: 1, to: date) ?? date
        }
        return date
    }

    private var isRescheduling: Bool { existingAppointment != nil }

    private var minimumDate: Date { Date().addingTimeInterval(48 * 3600) }

    private var selectedDateFormatted: String {
        let f = DateFormatter()
        f.dateStyle = .medium
        f.timeStyle = .none
        return f.string(from: selectedDate)
    }

    private var selectedTimeFormatted: String {
        guard let slot = selectedTimeSlot else { return "" }
        let f = DateFormatter()
        f.dateFormat = "HH:mm"
        f.locale = Locale(identifier: "en_US_POSIX")
        guard let d = f.date(from: slot) else { return slot }
        let out = DateFormatter()
        out.timeStyle = .short
        out.dateStyle = .none
        return out.string(from: d)
    }

    private var dateString: String {
        let f = DateFormatter()
        f.locale = Locale(identifier: "en_US_POSIX")
        f.dateFormat = "yyyy-MM-dd"
        return f.string(from: selectedDate)
    }

    // Changing this key cancels the previous availability task and starts a new one.
    private var availabilityKey: String {
        "\(dateString)-\(selectedVetId.map(String.init) ?? "any")"
    }

    private var canSubmit: Bool {
        !selectedPetId.isEmpty
            && !selectedType.isEmpty
            && selectedTimeSlot != nil
            && reason.trimmingCharacters(in: .whitespaces).count >= 3
            && !submitting
    }

    var body: some View {
        NavigationStack {
            Form {
                // Reschedule context banner
                if let existing = existingAppointment {
                    Section {
                        HStack(spacing: 10) {
                            Image(systemName: "info.circle.fill")
                                .foregroundStyle(Color.brand)
                            VStack(alignment: .leading, spacing: 2) {
                                Text("Currently booked")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                                Text("\(existing.dateFormatted) at \(existing.timeFormatted)")
                                    .font(.subheadline.weight(.medium))
                            }
                        }
                    }
                }

                // Pet
                Section("Pet") {
                    if petsLoading {
                        HStack { Spacer(); ProgressView(); Spacer() }
                    } else if pets.isEmpty {
                        Text("No pets on file. Please contact the clinic.")
                            .foregroundStyle(.secondary)
                            .font(.subheadline)
                    } else {
                        Picker("Pet", selection: $selectedPetId) {
                            ForEach(pets) { pet in
                                Text(pet.name).tag(pet.petId)
                            }
                        }
                        .pickerStyle(.menu)
                        .disabled(isRescheduling)
                    }
                }

                // Appointment type
                Section("Type") {
                    Picker("Appointment type", selection: $selectedType) {
                        ForEach(Self.appointmentTypes, id: \.id) { t in
                            Label(t.name, systemImage: t.icon).tag(t.id)
                        }
                    }
                    .pickerStyle(.navigationLink)
                    .disabled(isRescheduling)
                }

                // Reason
                Section("Reason for Visit") {
                    TextField(
                        "Briefly describe the reason (required)",
                        text: $reason,
                        axis: .vertical
                    )
                    .lineLimit(3...5)
                }

                // Date
                Section {
                    DatePicker(
                        "Appointment date",
                        selection: $selectedDate,
                        in: minimumDate...,
                        displayedComponents: .date
                    )
                    .datePickerStyle(.graphical)
                    .tint(.brand)
                    .onChange(of: selectedDate) {
                        selectedTimeSlot = nil
                        // Auto-advance past Sunday (clinic closed)
                        if Calendar.current.component(.weekday, from: selectedDate) == 1 {
                            selectedDate = Calendar.current.date(byAdding: .day, value: 1, to: selectedDate) ?? selectedDate
                        }
                    }
                    Label("Clinic closed Sundays · open Mon–Sat, 9 AM–6:30 PM", systemImage: "calendar.badge.clock")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                } header: {
                    Text("Date")
                }

                // Vet preference (optional)
                Section("Preferred Veterinarian") {
                    Picker("Vet preference", selection: $selectedVetId) {
                        Text("No preference").tag(nil as Int?)
                        ForEach(vets) { vet in
                            VStack(alignment: .leading, spacing: 1) {
                                Text("Dr. \(vet.fullName)")
                                if let spec = vet.specialization {
                                    Text(spec)
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }
                            }
                            .tag(vet.veterinarianId as Int?)
                        }
                    }
                    .pickerStyle(.menu)
                    .onChange(of: selectedVetId) { selectedTimeSlot = nil }
                }

                // Available time slots
                Section("Available Times") {
                    timeSlotsContent
                }

            }
            .navigationTitle(isRescheduling ? "Reschedule" : "Book Appointment")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    if submitting {
                        ProgressView()
                    } else {
                        Button(isRescheduling ? "Reschedule" : "Book") {
                            Task { await submit() }
                        }
                        .disabled(!canSubmit)
                        .fontWeight(.semibold)
                    }
                }
            }
        }
        .task { await loadInitialData() }
        .task(id: availabilityKey) { await fetchAvailability() }
        .alert(isRescheduling ? "Appointment Rescheduled" : "Appointment Confirmed",
               isPresented: $showSuccessAlert
        ) {
            Button("Done") { onSuccess(); dismiss() }
        } message: {
            if let msg = successMessage { Text(msg) }
        }
        .alert(isRescheduling ? "Couldn't Reschedule" : "Couldn't Book Appointment",
               isPresented: $showErrorAlert
        ) {
            Button("OK") { }
        } message: {
            if let err = submitError { Text(err) }
        }
    }

    // MARK: - Time slots grid

    @ViewBuilder
    private var timeSlotsContent: some View {
        if availabilityLoading {
            HStack { Spacer(); ProgressView().padding(.vertical, 8); Spacer() }
        } else if let err = availabilityError {
            Label(err, systemImage: "exclamationmark.circle")
                .font(.footnote)
                .foregroundStyle(.red)
        } else if let data = availabilityData {
            if !data.isClinicDay {
                Label(
                    "The clinic is closed on this day. Please choose Monday–Saturday.",
                    systemImage: "calendar.badge.exclamationmark"
                )
                .font(.subheadline)
                .foregroundStyle(.secondary)
            } else {
                // Always show all slots when the clinic is open (unavailable ones appear grayed out).
                LazyVGrid(columns: [GridItem(.adaptive(minimum: 96))], spacing: 8) {
                    ForEach(data.slots) { slot in
                        Button {
                            selectedTimeSlot = slot.time
                        } label: {
                            VStack(spacing: 2) {
                                Text(slot.timeFormatted)
                                    .font(.subheadline.weight(.semibold))
                                Text(capacityLabel(slot))
                                    .font(.caption2)
                            }
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 10)
                            .background(
                                RoundedRectangle(cornerRadius: 8, style: .continuous)
                                    .fill(slotFill(slot))
                            )
                            .foregroundStyle(slotText(slot))
                        }
                        .buttonStyle(.plain)
                        .disabled(!slot.available)
                    }
                }
                .padding(.vertical, 4)
            }
        } else {
            Text("Select a date to see available times.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
    }

    private func slotFill(_ slot: TimeSlot) -> Color {
        if selectedTimeSlot == slot.time { return .brand }
        if !slot.available { return Color(.systemFill) }
        return Color.brand.opacity(0.1)
    }

    private func slotText(_ slot: TimeSlot) -> Color {
        if selectedTimeSlot == slot.time { return .white }
        if !slot.available { return Color(.systemGray3) }
        return .brand
    }

    // Mirrors the web's capacityLabel logic exactly:
    //   "Too soon"        – within the 48 h lead-time window
    //   "Available"/"Booked" – when a specific vet is chosen (binary availability)
    //   "N left"          – when using the general capacity pool (no vet selected)
    private func capacityLabel(_ slot: TimeSlot) -> String {
        if !slot.meetsLeadTime { return "Too soon" }
        if selectedVetId != nil {
            return slot.available ? "Available" : "Booked"
        }
        return "\(slot.remainingCapacity) left"
    }

    // MARK: - Data loading

    private func loadInitialData() async {
        guard !initialDataLoaded else { return }
        initialDataLoaded = true

        async let fetchedPets = CustomerAuthService().fetchMyPets(token: token)
        async let fetchedVets = CustomerAuthService().fetchVeterinarians(token: token)

        do {
            let (p, v) = try await (fetchedPets, fetchedVets)
            pets = p
            vets = v

            if let existing = existingAppointment {
                // Pre-fill for rescheduling; pet and type are locked.
                selectedPetId = existing.petId
                selectedType  = existing.appointmentType
                reason        = existing.reason ?? ""
                selectedVetId = existing.veterinarianId
                let f = DateFormatter()
                f.dateFormat = "yyyy-MM-dd"
                f.locale = Locale(identifier: "en_US_POSIX")
                f.timeZone = TimeZone(abbreviation: "UTC")
                if let d = f.date(from: String(existing.appointmentDate.prefix(10))) {
                    selectedDate = d
                }
                // Do NOT pre-fill the time slot — the user must pick a new one.
            } else if let first = p.first, selectedPetId.isEmpty {
                selectedPetId = first.petId
            }
        } catch {
            // Silently degrade — user sees "No pets on file" message.
        }
        petsLoading = false
    }

    private func fetchAvailability() async {
        availabilityLoading = true
        availabilityError   = nil
        do {
            availabilityData = try await CustomerAuthService().fetchAvailability(
                date: dateString,
                veterinarianId: selectedVetId,
                token: token
            )
        } catch {
            availabilityError = (error as? APIError)?.errorDescription ?? error.localizedDescription
        }
        availabilityLoading = false
    }

    // MARK: - Submission

    private func submit() async {
        guard canSubmit, let timeSlot = selectedTimeSlot else { return }
        submitting  = true
        submitError = nil

        let trimmedReason = reason.trimmingCharacters(in: .whitespaces)

        do {
            if let existing = existingAppointment {
                _ = try await CustomerAuthService().updateAppointment(
                    id: existing.appointmentId,
                    request: UpdateAppointmentRequest(
                        appointmentDate: dateString,
                        appointmentTime: timeSlot,
                        appointmentType: selectedType,
                        reason:          trimmedReason,
                        veterinarianId:  selectedVetId
                    ),
                    token: token
                )
            } else {
                _ = try await CustomerAuthService().createAppointment(
                    CreateAppointmentRequest(
                        petId:           selectedPetId,
                        appointmentDate: dateString,
                        appointmentTime: timeSlot,
                        appointmentType: selectedType,
                        reason:          trimmedReason,
                        veterinarianId:  selectedVetId
                    ),
                    token: token
                )
            }
            if isRescheduling {
                successMessage = "Your appointment has been rescheduled to \(selectedDateFormatted) at \(selectedTimeFormatted)."
            } else {
                successMessage = "Your appointment is confirmed for \(selectedDateFormatted) at \(selectedTimeFormatted). We look forward to seeing you!"
            }
            showSuccessAlert = true
        } catch {
            submitError = (error as? APIError)?.errorDescription ?? error.localizedDescription
            showErrorAlert = true
        }
        submitting = false
    }
}

#Preview {
    BookAppointmentView(token: "preview") {}
}
