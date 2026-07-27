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

struct Pet: Codable, Identifiable {
    let petId: String
    let name: String
    let species: String
    let breed: String?
    let gender: String?
    let dateOfBirth: String?

    var id: String { petId }

    enum CodingKeys: String, CodingKey {
        case petId = "pet_id"
        case name = "pet_name"
        case species
        case breed
        case gender
        case dateOfBirth = "date_of_birth"
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
        // node-postgres may return full ISO-8601 ("2020-03-15T00:00:00.000Z")
        let candidate = String(raw.prefix(10))
        guard let date = iso.date(from: candidate) else { return nil }
        let comps = Calendar.current.dateComponents([.year, .month], from: date, to: .now)
        if let y = comps.year, y > 0 { return "\(y)y old" }
        if let m = comps.month, m > 0 { return "\(m)mo old" }
        return nil
    }
}

// MARK: - Change password

struct ChangePasswordFirstLoginRequest: Encodable {
    let newPassword: String
}

struct AckResponse: Decodable {
    let status: String
}
