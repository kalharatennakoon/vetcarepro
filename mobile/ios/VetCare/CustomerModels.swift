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
    let city: String?
    let passwordMustChange: Bool

    var id: String { customerId }
    var fullName: String { "\(firstName) \(lastName)" }

    enum CodingKeys: String, CodingKey {
        case customerId = "customer_id"
        case firstName = "first_name"
        case lastName = "last_name"
        case email
        case phone
        case city
        case passwordMustChange = "password_must_change"
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
