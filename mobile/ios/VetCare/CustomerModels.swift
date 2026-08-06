//
//  CustomerModels.swift
//  VetCare
//
//  Codable models for pet-owner authentication and pet data.
//

import Foundation

// MARK: - Auth

struct CustomerLoginRequest: Encodable {
    let identifier: String
    let password: String
}

struct CustomerLoginResponse: Decodable {
    let data: CustomerLoginData
}

struct CustomerLoginData: Decodable {
    let customer: Customer
    let token: String
}

// MARK: - Customer

struct Customer: Codable, Identifiable {
    let customerId: String
    let firstName: String
    let lastName: String
    let email: String?
    let phone: String
    let alternatePhone: String?
    let address: String?
    let city: String?
    let nic: String?
    let preferredContactMethod: String?
    let emergencyContact: String?
    let emergencyPhone: String?
    var passwordMustChange: Bool
    let createdAt: String?

    var id: String { customerId }
    var fullName: String { "\(firstName) \(lastName)" }
    var initials: String { "\(firstName.prefix(1))\(lastName.prefix(1))" }

    var memberSince: String? {
        guard let raw = createdAt else { return nil }
        let iso = ISO8601DateFormatter()
        iso.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        let date = iso.date(from: raw) ?? ISO8601DateFormatter().date(from: raw)
        guard let d = date else { return nil }
        return "\(Calendar.current.component(.year, from: d))"
    }

    var preferredContactDisplay: String {
        switch preferredContactMethod {
        case "phone": return "Phone"
        case "email": return "Email"
        case "sms":   return "SMS"
        default:      return "—"
        }
    }

    enum CodingKeys: String, CodingKey {
        case customerId           = "customer_id"
        case firstName            = "first_name"
        case lastName             = "last_name"
        case email
        case phone
        case alternatePhone       = "alternate_phone"
        case address
        case city
        case nic
        case preferredContactMethod = "preferred_contact_method"
        case emergencyContact     = "emergency_contact"
        case emergencyPhone       = "emergency_phone"
        case passwordMustChange   = "password_must_change"
        case createdAt            = "created_at"
    }
}

// MARK: - Pets

struct PetsResponse: Decodable {
    let data: PetsData
}

struct PetsData: Decodable {
    let pets: [Pet]
}

struct Pet: Codable, Identifiable, Hashable {
    let petId: String
    let name: String
    let species: String
    let breed: String?
    let gender: String?
    let dateOfBirth: String?
    let color: String?
    // node-postgres serialises DECIMAL columns as strings to preserve precision
    let weightCurrent: String?
    let isNeutered: Bool
    let allergies: String?
    let specialNeeds: String?

    var id: String { petId }

    enum CodingKeys: String, CodingKey {
        case petId = "pet_id"
        case name = "pet_name"
        case species
        case breed
        case gender
        case dateOfBirth = "date_of_birth"
        case color
        case weightCurrent = "weight_current"
        case isNeutered = "is_neutered"
        case allergies
        case specialNeeds = "special_needs"
    }

    var speciesSymbol: String {
        switch species.lowercased() {
        case "cat": return "cat"
        case "dog": return "dog"
        case "bird": return "bird"
        case "fish": return "fish"
        default: return "pawprint.fill"
        }
    }

    var ageString: String? {
        guard let raw = dateOfBirth else { return nil }
        let iso = DateFormatter()
        iso.dateFormat = "yyyy-MM-dd"
        iso.locale = Locale(identifier: "en_US_POSIX")
        let candidate = String(raw.prefix(10))
        guard let date = iso.date(from: candidate) else { return nil }
        let comps = Calendar.current.dateComponents([.year, .month], from: date, to: .now)
        if let y = comps.year, y > 0 { return "\(y)y old" }
        if let m = comps.month, m > 0 { return "\(m)mo old" }
        return nil
    }

    var dobFormatted: String? {
        guard let raw = dateOfBirth else { return nil }
        let iso = DateFormatter()
        iso.dateFormat = "yyyy-MM-dd"
        iso.locale = Locale(identifier: "en_US_POSIX")
        guard let date = iso.date(from: String(raw.prefix(10))) else { return nil }
        let out = DateFormatter()
        out.dateStyle = .medium
        out.timeStyle = .none
        return out.string(from: date)
    }

    var weightDisplay: String? {
        guard let w = weightCurrent, let value = Double(w), value > 0 else { return nil }
        let formatted = value.truncatingRemainder(dividingBy: 1) == 0
            ? String(format: "%.0f kg", value)
            : String(format: "%.1f kg", value)
        return formatted
    }
}

// MARK: - Vaccinations

struct VaccinationsResponse: Decodable {
    let status: String
    let vaccinations: [Vaccination]
}

struct Vaccination: Codable, Identifiable {
    let vaccinationId: Int
    let vaccineName: String
    let vaccineType: String?
    let vaccinationDate: String
    let nextDueDate: String?
    let adverseReaction: Bool
    let notes: String?
    let administeredByName: String?

    var id: Int { vaccinationId }

    enum CodingKeys: String, CodingKey {
        case vaccinationId = "vaccination_id"
        case vaccineName = "vaccine_name"
        case vaccineType = "vaccine_type"
        case vaccinationDate = "vaccination_date"
        case nextDueDate = "next_due_date"
        case adverseReaction = "adverse_reaction"
        case notes
        case administeredByName = "administered_by_name"
    }

    private static let isoParser: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        f.locale = Locale(identifier: "en_US_POSIX")
        return f
    }()

    private static let displayFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateStyle = .medium
        f.timeStyle = .none
        return f
    }()

    private func parseDate(_ raw: String) -> Date? {
        Self.isoParser.date(from: String(raw.prefix(10)))
    }

    var vaccinationDateFormatted: String {
        parseDate(vaccinationDate).map { Self.displayFormatter.string(from: $0) } ?? vaccinationDate
    }

    var nextDueDateFormatted: String? {
        guard let raw = nextDueDate else { return nil }
        return parseDate(raw).map { Self.displayFormatter.string(from: $0) } ?? raw
    }

    /// Returns nil if no due date, .past if overdue, .future if upcoming.
    enum DueStatus { case past, future }
    var dueStatus: DueStatus? {
        guard let raw = nextDueDate, let date = parseDate(raw) else { return nil }
        return date < Date() ? .past : .future
    }
}

// MARK: - Lab Reports

struct LabReportsResponse: Decodable {
    let status: String
    let reports: [LabReport]
}

struct LabReport: Codable, Identifiable {
    let reportId: Int
    let petId: String
    let reportName: String
    let reportType: String
    let fileType: String
    let notes: String?
    let createdAt: String

    var id: Int { reportId }

    enum CodingKeys: String, CodingKey {
        case reportId = "report_id"
        case petId = "pet_id"
        case reportName = "report_name"
        case reportType = "report_type"
        case fileType = "file_type"
        case notes
        case createdAt = "created_at"
    }

    var typeDisplayName: String {
        switch reportType {
        case "blood_test":   return "Blood Test"
        case "urinalysis":   return "Urinalysis"
        case "kidney_panel": return "Kidney Panel"
        case "x_ray":        return "X-Ray"
        case "ultrasound":   return "Ultrasound"
        case "cytology":     return "Cytology"
        case "biopsy":       return "Biopsy"
        case "culture":      return "Culture"
        default:             return "Other"
        }
    }

    var typeIcon: String {
        switch reportType {
        case "blood_test":   return "drop.fill"
        case "urinalysis":   return "flask.fill"
        case "kidney_panel": return "staroflife.fill"
        case "x_ray":        return "rays"
        case "ultrasound":   return "waveform.path.ecg"
        case "cytology":     return "magnifyingglass.circle.fill"
        case "biopsy":       return "stethoscope"
        case "culture":      return "testtube.2"
        default:             return "doc.text.fill"
        }
    }

    var formattedDate: String {
        let iso = ISO8601DateFormatter()
        iso.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        let date = iso.date(from: createdAt) ?? ISO8601DateFormatter().date(from: createdAt)
        guard let d = date else { return String(createdAt.prefix(10)) }
        let fmt = DateFormatter()
        fmt.dateStyle = .medium
        fmt.timeStyle = .none
        return fmt.string(from: d)
    }
}

// MARK: - Change password

struct ChangePasswordFirstLoginRequest: Encodable {
    let newPassword: String
}

struct AckResponse: Decodable {
    let status: String
}

// MARK: - First-time account setup

struct VerifyIdentityRequest: Encodable {
    let email: String
    let phone: String
}

struct VerifyIdentityResponse: Decodable {
    let data: VerifyIdentityData
}

struct VerifyIdentityData: Decodable {
    let setupToken: String
    let firstName: String
}

struct SetFirstPasswordRequest: Encodable {
    let setupToken: String
    let newPassword: String
}

// MARK: - Appointments

struct Appointment: Codable, Identifiable {
    let appointmentId: String   // e.g. "APPT-2026-0001" (VARCHAR, trigger-generated)
    let petId: String
    let appointmentDate: String   // DATE from pg → "YYYY-MM-DDT00:00:00.000Z"
    let appointmentTime: String   // TIME from pg → "HH:MM:SS"
    let durationMinutes: Int
    let appointmentType: String
    let reason: String?
    let status: String
    let cancellationReason: String?
    let createdAt: String
    let veterinarianId: Int?
    let veterinarianName: String?
    let petName: String
    let species: String

    var id: String { appointmentId }

    enum CodingKeys: String, CodingKey {
        case appointmentId      = "appointment_id"
        case petId              = "pet_id"
        case appointmentDate    = "appointment_date"
        case appointmentTime    = "appointment_time"
        case durationMinutes    = "duration_minutes"
        case appointmentType    = "appointment_type"
        case reason
        case status
        case cancellationReason = "cancellation_reason"
        case createdAt          = "created_at"
        case veterinarianId     = "veterinarian_id"
        case veterinarianName   = "veterinarian_name"
        case petName            = "pet_name"
        case species
    }

    private static let dateParser: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        f.locale = Locale(identifier: "en_US_POSIX")
        f.timeZone = TimeZone(abbreviation: "UTC")
        return f
    }()

    var dateObject: Date? {
        Self.dateParser.date(from: String(appointmentDate.prefix(10)))
    }

    var dateFormatted: String {
        guard let d = dateObject else { return String(appointmentDate.prefix(10)) }
        let out = DateFormatter()
        out.dateStyle = .medium
        out.timeStyle = .none
        return out.string(from: d)
    }

    var timeFormatted: String {
        let raw = String(appointmentTime.prefix(5))
        let f = DateFormatter()
        f.dateFormat = "HH:mm"
        f.locale = Locale(identifier: "en_US_POSIX")
        guard let d = f.date(from: raw) else { return raw }
        let out = DateFormatter()
        out.timeStyle = .short
        out.dateStyle = .none
        return out.string(from: d)
    }

    var typeDisplayName: String {
        switch appointmentType {
        case "checkup":      return "Check-up"
        case "vaccination":  return "Vaccination"
        case "follow_up":    return "Follow-up"
        case "consultation": return "Consultation"
        default:             return appointmentType.replacingOccurrences(of: "_", with: " ").capitalized
        }
    }

    var typeIcon: String {
        switch appointmentType {
        case "checkup":      return "stethoscope"
        case "vaccination":  return "syringe"
        case "follow_up":    return "arrow.clockwise"
        case "consultation": return "text.bubble"
        default:             return "calendar"
        }
    }

    var statusDisplayName: String {
        switch status {
        case "confirmed":   return "Confirmed"
        case "scheduled":   return "Scheduled"
        case "in_progress": return "In Progress"
        case "completed":   return "Completed"
        case "cancelled":   return "Cancelled"
        case "no_show":     return "No Show"
        default:            return status.replacingOccurrences(of: "_", with: " ").capitalized
        }
    }

    var isActiveStatus: Bool {
        status == "confirmed" || status == "scheduled"
    }

    var isUpcoming: Bool {
        isActiveStatus || status == "in_progress"
    }

    // Returns true when the appointment is at least 48 hours away and still modifiable.
    var canModify: Bool {
        guard isActiveStatus else { return false }
        let datePart = String(appointmentDate.prefix(10))
        let timePart = String(appointmentTime.prefix(5))
        let f = DateFormatter()
        f.locale = Locale(identifier: "en_US_POSIX")
        f.dateFormat = "yyyy-MM-dd HH:mm"
        guard let target = f.date(from: "\(datePart) \(timePart)") else { return false }
        return target.timeIntervalSinceNow >= 48 * 3600
    }
}

struct AppointmentsResponse: Decodable {
    let status: String
    let data: AppointmentsData
}

struct AppointmentsData: Decodable {
    let appointments: [Appointment]
}

struct AppointmentSingleResponse: Decodable {
    let status: String
    let message: String?
    let data: AppointmentSingleData
}

struct AppointmentSingleData: Decodable {
    let appointment: Appointment
}

// MARK: - Veterinarians list

struct Veterinarian: Codable, Identifiable {
    let veterinarianId: Int
    let firstName: String
    let lastName: String
    let specialization: String?

    var id: Int { veterinarianId }
    var fullName: String { "\(firstName) \(lastName)" }

    enum CodingKeys: String, CodingKey {
        case veterinarianId = "veterinarian_id"
        case firstName      = "first_name"
        case lastName       = "last_name"
        case specialization
    }
}

struct VeterinariansResponse: Decodable {
    let status: String
    let data: VeterinariansData
}

struct VeterinariansData: Decodable {
    let veterinarians: [Veterinarian]
}

// MARK: - Availability

struct AvailabilityResponse: Decodable {
    let status: String
    let data: AvailabilityData
}

struct AvailabilityData: Decodable {
    let date: String
    let isClinicDay: Bool
    let slots: [TimeSlot]
}

struct TimeSlot: Codable, Identifiable {
    let time: String
    let remainingCapacity: Int
    let available: Bool
    let meetsLeadTime: Bool

    var id: String { time }

    var timeFormatted: String {
        let f = DateFormatter()
        f.dateFormat = "HH:mm"
        f.locale = Locale(identifier: "en_US_POSIX")
        guard let d = f.date(from: time) else { return time }
        let out = DateFormatter()
        out.timeStyle = .short
        out.dateStyle = .none
        return out.string(from: d)
    }
}

// MARK: - Appointment booking requests

struct CreateAppointmentRequest: Encodable {
    let petId: String
    let appointmentDate: String
    let appointmentTime: String
    let appointmentType: String
    let reason: String
    let veterinarianId: Int?

    enum CodingKeys: String, CodingKey {
        case petId           = "pet_id"
        case appointmentDate = "appointment_date"
        case appointmentTime = "appointment_time"
        case appointmentType = "appointment_type"
        case reason
        case veterinarianId  = "veterinarian_id"
    }
}

// MARK: - Profile update

struct UpdateProfileRequest: Encodable {
    let alternatePhone: String?
    let address: String?
    let city: String?
    let preferredContactMethod: String?
    let emergencyContact: String?
    let emergencyPhone: String?

    enum CodingKeys: String, CodingKey {
        case alternatePhone         = "alternate_phone"
        case address
        case city
        case preferredContactMethod = "preferred_contact_method"
        case emergencyContact       = "emergency_contact"
        case emergencyPhone         = "emergency_phone"
    }
}

struct CustomerUpdateResponse: Decodable {
    let status: String
    let data: CustomerUpdateData
}

struct CustomerUpdateData: Decodable {
    let customer: Customer
}

struct UpdateAppointmentRequest: Encodable {
    let appointmentDate: String
    let appointmentTime: String
    let appointmentType: String
    let reason: String
    let veterinarianId: Int?

    enum CodingKeys: String, CodingKey {
        case appointmentDate = "appointment_date"
        case appointmentTime = "appointment_time"
        case appointmentType = "appointment_type"
        case reason
        case veterinarianId  = "veterinarian_id"
    }
}
