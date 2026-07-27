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

    func changePasswordFirstLogin(newPassword: String, token: String) async throws {
        _ = try await client.post(
            "customer-auth/change-password-first-login",
            body: ChangePasswordFirstLoginRequest(newPassword: newPassword),
            bearerToken: token,
            as: AckResponse.self
        )
    }
}
