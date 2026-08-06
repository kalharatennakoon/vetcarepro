//
//  CustomerSession.swift
//  VetCare
//
//  Holds the logged-in pet-owner state for the lifetime of the app.
//  Token is persisted in Keychain; non-sensitive customer data in UserDefaults.
//

import Foundation
import Security

@MainActor
@Observable
final class CustomerSession {
    private(set) var customer: Customer?
    private(set) var token: String?

    var isLoggedIn: Bool { token != nil }
    var mustChangePassword: Bool { customer?.passwordMustChange == true }

    init() {
        token = Self.loadToken()
        customer = Self.loadCustomer()
    }

    func login(customer: Customer, token: String) {
        self.customer = customer
        self.token = token
        Self.saveToken(token)
        Self.saveCustomer(customer)
    }

    func logout() {
        customer = nil
        token = nil
        Self.deleteToken()
        Self.deleteCustomer()
    }

    /// Replaces the stored customer (e.g. after a profile update).
    func updateCustomer(_ updated: Customer) {
        customer = updated
        Self.saveCustomer(updated)
    }

    /// Clears the must-change-password flag after a successful first-login
    /// password change without a full server re-fetch.
    func customerDidChangePassword() {
        guard var c = customer else { return }
        c.passwordMustChange = false
        updateCustomer(c)
    }

    // MARK: - Keychain (JWT token)

    private static let tokenAccount = "vetcare.customer.token"

    private static func saveToken(_ token: String) {
        let data = Data(token.utf8)
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: tokenAccount,
            kSecValueData as String: data
        ]
        SecItemDelete(query as CFDictionary)
        SecItemAdd(query as CFDictionary, nil)
    }

    private static func loadToken() -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: tokenAccount,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        var result: AnyObject?
        guard SecItemCopyMatching(query as CFDictionary, &result) == errSecSuccess,
              let data = result as? Data else { return nil }
        return String(data: data, encoding: .utf8)
    }

    private static func deleteToken() {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: tokenAccount
        ]
        SecItemDelete(query as CFDictionary)
    }

    // MARK: - UserDefaults (non-sensitive customer profile)

    private static let customerKey = "vetcare.customer.data"

    private static func saveCustomer(_ customer: Customer) {
        let data = try? JSONEncoder().encode(customer)
        UserDefaults.standard.set(data, forKey: customerKey)
    }

    private static func loadCustomer() -> Customer? {
        guard let data = UserDefaults.standard.data(forKey: customerKey) else { return nil }
        return try? JSONDecoder().decode(Customer.self, from: data)
    }

    private static func deleteCustomer() {
        UserDefaults.standard.removeObject(forKey: customerKey)
    }
}
