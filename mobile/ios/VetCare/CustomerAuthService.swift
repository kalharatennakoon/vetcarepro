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

    func changePassword(current: String, new: String, token: String) async throws {
        _ = try await client.post(
            "customer-auth/change-password",
            body: ChangePasswordRequest(currentPassword: current, newPassword: new),
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

    // MARK: - Appointments

    func fetchMyAppointments(token: String) async throws -> [Appointment] {
        let response = try await client.get(
            "customer-auth/appointments",
            bearerToken: token,
            as: AppointmentsResponse.self
        )
        return response.data.appointments
    }

    func fetchVeterinarians(token: String) async throws -> [Veterinarian] {
        let response = try await client.get(
            "customer-auth/veterinarians",
            bearerToken: token,
            as: VeterinariansResponse.self
        )
        return response.data.veterinarians
    }

    func fetchAvailability(date: String, veterinarianId: Int?, token: String) async throws -> AvailabilityData {
        // Use URLComponents so the ? separator is NOT percent-encoded by appending(path:).
        let base = APIConfig.baseURL.appending(path: "customer-auth/appointments/availability")
        guard var components = URLComponents(url: base, resolvingAgainstBaseURL: false) else {
            throw APIError.invalidResponse
        }
        var queryItems = [URLQueryItem(name: "date", value: date)]
        if let vetId = veterinarianId {
            queryItems.append(URLQueryItem(name: "veterinarian_id", value: String(vetId)))
        }
        components.queryItems = queryItems
        guard let url = components.url else { throw APIError.invalidResponse }
        let response = try await client.get(url: url, bearerToken: token, as: AvailabilityResponse.self)
        return response.data
    }

    func createAppointment(_ request: CreateAppointmentRequest, token: String) async throws -> Appointment {
        let response = try await client.post(
            "customer-auth/appointments",
            body: request,
            bearerToken: token,
            as: AppointmentSingleResponse.self
        )
        return response.data.appointment
    }

    func updateAppointment(id: String, request: UpdateAppointmentRequest, token: String) async throws -> Appointment {
        let response = try await client.put(
            "customer-auth/appointments/\(id)",
            body: request,
            bearerToken: token,
            as: AppointmentSingleResponse.self
        )
        return response.data.appointment
    }

    func updateProfile(_ request: UpdateProfileRequest, token: String) async throws -> Customer {
        let response = try await client.put(
            "customer-auth/me",
            body: request,
            bearerToken: token,
            as: CustomerUpdateResponse.self
        )
        return response.data.customer
    }

    func cancelAppointment(id: String, token: String) async throws -> Appointment {
        let response = try await client.delete(
            "customer-auth/appointments/\(id)",
            bearerToken: token,
            as: AppointmentSingleResponse.self
        )
        return response.data.appointment
    }
}
