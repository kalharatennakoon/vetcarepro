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
    /// Read from the `VetCareAPIBaseURL` key in Info.plist so it can be
    /// swapped per machine/demo without a code edit or rebuild-from-source -
    /// a hardcoded `.local` mDNS hostname only resolves on the machine that
    /// set it, and mDNS itself is unreliable on guest/conference Wi-Fi. On a
    /// physical device, set that key to your Mac's LAN IP instead, e.g.
    /// `http://192.168.1.20:3000/api`. Falls back to localhost (works from
    /// the iOS Simulator, which shares the Mac's network) if the key is
    /// ever missing.
    static let baseURL: URL = {
        if let raw = Bundle.main.object(forInfoDictionaryKey: "VetCareAPIBaseURL") as? String,
           let url = URL(string: raw) {
            return url
        }
        return URL(string: "http://localhost:3000/api")!
    }()
}
