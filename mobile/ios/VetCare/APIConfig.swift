//
//  APIConfig.swift
//  VetCare
//
//  Central configuration for talking to the VetCare Pro backend.
//

import Foundation

enum APIConfig {
    /// Base URL of the backend REST API.
    ///
    /// Points at the local dev server, which works from the iOS Simulator
    /// (the simulator shares the Mac's network). On a physical device, replace
    /// "localhost" with your Mac's LAN IP, e.g. `http://192.168.1.20:3000/api`.
    static let baseURL = URL(string: "http://localhost:3000/api")!
}
