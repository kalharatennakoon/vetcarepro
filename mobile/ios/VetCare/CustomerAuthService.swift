//
//  CustomerAuthService.swift
//  VetCare
//
//  Network calls for the pet-owner authentication endpoints.
//

import Foundation

struct CustomerAuthService {
    private let client = APIClient()

    func login(identifier: String, password: String) async throws -> (Customer, String) {
        let response = try await client.post(
            "customer-auth/login",
            body: CustomerLoginRequest(identifier: identifier, password: password),
            as: CustomerLoginResponse.self
        )
        return (response.data.customer, response.data.token)
    }

    func fetchMyPets(token: String) async throws -> [Pet] {
        let response = try await client.get(
            "customer-auth/me/pets",
            bearerToken: token,
            as: PetsResponse.self
        )
        return response.data.pets
    }

    func fetchVaccinations(petId: String, token: String) async throws -> [Vaccination] {
        let response = try await client.get(
            "customer-auth/pets/\(petId)/vaccinations",
            bearerToken: token,
            as: VaccinationsResponse.self
        )
        return response.vaccinations
    }

    func fetchLabReports(petId: String, token: String) async throws -> [LabReport] {
        let response = try await client.get(
            "customer-auth/pets/\(petId)/lab-reports",
            bearerToken: token,
            as: LabReportsResponse.self
        )
        return response.reports
    }

    func downloadLabReport(reportId: Int, token: String, fileType: String) async throws -> URL {
        let data = try await client.download(
            "customer-auth/lab-reports/\(reportId)/view",
            bearerToken: token
        )
        let ext = fileType == "pdf" ? "pdf" : "jpg"
        let tempURL = FileManager.default.temporaryDirectory
            .appendingPathComponent("vetcare_lab_\(reportId)")
            .appendingPathExtension(ext)
        try data.write(to: tempURL, options: .atomic)
        return tempURL
    }

    func changePasswordFirstLogin(newPassword: String, token: String) async throws {
        _ = try await client.post(
            "customer-auth/change-password-first-login",
            body: ChangePasswordFirstLoginRequest(newPassword: newPassword),
            bearerToken: token,
            as: AckResponse.self
        )
    }

    func verifyIdentity(email: String, phone: String) async throws -> (setupToken: String, firstName: String) {
        let response = try await client.post(
            "customer-auth/verify-identity",
            body: VerifyIdentityRequest(email: email, phone: phone),
            as: VerifyIdentityResponse.self
        )
        return (response.data.setupToken, response.data.firstName)
    }

    func setFirstPassword(setupToken: String, newPassword: String) async throws -> (Customer, String) {
        let response = try await client.post(
            "customer-auth/set-password",
            body: SetFirstPasswordRequest(setupToken: setupToken, newPassword: newPassword),
            as: CustomerLoginResponse.self
        )
        return (response.data.customer, response.data.token)
    }
}
