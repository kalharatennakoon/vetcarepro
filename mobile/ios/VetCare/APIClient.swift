//
//  APIClient.swift
//  VetCare
//
//  Minimal async JSON REST client. Grows as more endpoints are wired up.
//

import Foundation

enum APIError: LocalizedError {
    case invalidResponse
    case server(status: Int, message: String?)
    case decoding(Error)
    case transport(Error)

    var errorDescription: String? {
        switch self {
        case .invalidResponse:
            return "The server returned an unexpected response."
        case let .server(status, message):
            return message ?? "The server returned an error (\(status))."
        case .decoding:
            return "The response couldn't be read."
        case let .transport(error):
            let ns = error as NSError
            if ns.domain == NSURLErrorDomain, ns.code == NSURLErrorCannotConnectToHost
                || ns.code == NSURLErrorCannotFindHost || ns.code == NSURLErrorTimedOut {
                return "Couldn't reach the server. Make sure the backend is running."
            }
            return error.localizedDescription
        }
    }
}

struct APIClient {
    let baseURL: URL
    private let session: URLSession

    init(baseURL: URL = APIConfig.baseURL) {
        self.baseURL = baseURL
        let configuration = URLSessionConfiguration.default
        // AI answers are generated locally by Ollama and can take 15s+, so we
        // allow a generous per-request timeout.
        configuration.timeoutIntervalForRequest = 90
        configuration.timeoutIntervalForResource = 120
        self.session = URLSession(configuration: configuration)
    }

    /// Sends a JSON POST and decodes the JSON response.
    func post<Body: Encodable, Response: Decodable>(
        _ path: String,
        body: Body,
        as responseType: Response.Type
    ) async throws -> Response {
        var request = URLRequest(url: baseURL.appending(path: path))
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        do {
            request.httpBody = try JSONEncoder().encode(body)
        } catch {
            throw APIError.transport(error)
        }

        let data: Data
        let response: URLResponse
        do {
            (data, response) = try await session.data(for: request)
        } catch {
            throw APIError.transport(error)
        }

        guard let http = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }

        guard (200..<300).contains(http.statusCode) else {
            let payload = try? JSONDecoder().decode(ErrorPayload.self, from: data)
            throw APIError.server(status: http.statusCode, message: payload?.displayMessage)
        }

        do {
            return try JSONDecoder().decode(Response.self, from: data)
        } catch {
            throw APIError.decoding(error)
        }
    }
}

/// The backend's error envelope: `{ "success": false, "message"/"error": "..." }`.
private struct ErrorPayload: Decodable {
    let message: String?
    let error: String?

    var displayMessage: String? { message ?? error }
}
