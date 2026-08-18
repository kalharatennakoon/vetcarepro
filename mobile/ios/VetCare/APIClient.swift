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
        // AI answers are generated locally by Ollama and can take a while - a
        // longer "explain"/"summarize" answer measured at only ~9 tokens/sec
        // on constrained hardware can comfortably exceed 90s. Kept a bit
        // above the server-side timeout stack (Node's AI_SERVICE_TIMEOUT:
        // 130s, ML service's OLLAMA_TIMEOUT: 120s - see aiService.js /
        // ollama_client.py) so a slow-but-working answer doesn't get cut off
        // client-side before either of those has a chance to.
        configuration.timeoutIntervalForRequest = 150
        configuration.timeoutIntervalForResource = 180
        self.session = URLSession(configuration: configuration)
    }

    /// Sends a JSON POST and decodes the JSON response.
    func post<Body: Encodable, Response: Decodable>(
        _ path: String,
        body: Body,
        bearerToken: String? = nil,
        as responseType: Response.Type
    ) async throws -> Response {
        var request = URLRequest(url: baseURL.appending(path: path))
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let token = bearerToken {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        do {
            request.httpBody = try JSONEncoder().encode(body)
        } catch {
            throw APIError.transport(error)
        }

        return try await execute(request)
    }

    /// Sends an authenticated GET and decodes the JSON response.
    func get<Response: Decodable>(
        _ path: String,
        bearerToken: String? = nil,
        as responseType: Response.Type
    ) async throws -> Response {
        var request = URLRequest(url: baseURL.appending(path: path))
        request.httpMethod = "GET"
        if let token = bearerToken {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        return try await execute(request)
    }

    /// Sends an authenticated GET to a pre-built URL (use when query parameters are needed,
    /// since appending(path:) percent-encodes '?' and '&').
    func get<Response: Decodable>(
        url: URL,
        bearerToken: String? = nil,
        as responseType: Response.Type
    ) async throws -> Response {
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        if let token = bearerToken {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        return try await execute(request)
    }

    /// Sends a JSON PUT and decodes the JSON response.
    func put<Body: Encodable, Response: Decodable>(
        _ path: String,
        body: Body,
        bearerToken: String? = nil,
        as responseType: Response.Type
    ) async throws -> Response {
        var request = URLRequest(url: baseURL.appending(path: path))
        request.httpMethod = "PUT"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let token = bearerToken {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        do {
            request.httpBody = try JSONEncoder().encode(body)
        } catch {
            throw APIError.transport(error)
        }
        return try await execute(request)
    }

    /// Sends an authenticated DELETE and decodes the JSON response.
    func delete<Response: Decodable>(
        _ path: String,
        bearerToken: String? = nil,
        as responseType: Response.Type
    ) async throws -> Response {
        var request = URLRequest(url: baseURL.appending(path: path))
        request.httpMethod = "DELETE"
        if let token = bearerToken {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        return try await execute(request)
    }

    /// Sends a multipart/form-data POST (file upload) and decodes the JSON
    /// response. No multipart support existed before the AI photo guidance
    /// feature - every other endpoint sends plain JSON.
    func postMultipart<Response: Decodable>(
        _ path: String,
        fields: [String: String] = [:],
        fileField: String,
        fileData: Data,
        fileName: String,
        mimeType: String,
        bearerToken: String? = nil,
        as responseType: Response.Type
    ) async throws -> Response {
        var request = URLRequest(url: baseURL.appending(path: path))
        request.httpMethod = "POST"
        let boundary = "Boundary-\(UUID().uuidString)"
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        if let token = bearerToken {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        var body = Data()
        for (key, value) in fields {
            body.append("--\(boundary)\r\n".data(using: .utf8)!)
            body.append("Content-Disposition: form-data; name=\"\(key)\"\r\n\r\n".data(using: .utf8)!)
            body.append("\(value)\r\n".data(using: .utf8)!)
        }
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append(
            "Content-Disposition: form-data; name=\"\(fileField)\"; filename=\"\(fileName)\"\r\n"
                .data(using: .utf8)!
        )
        body.append("Content-Type: \(mimeType)\r\n\r\n".data(using: .utf8)!)
        body.append(fileData)
        body.append("\r\n--\(boundary)--\r\n".data(using: .utf8)!)
        request.httpBody = body

        return try await execute(request)
    }

    /// Downloads raw bytes (for file viewing via QuickLook).
    func download(_ path: String, bearerToken: String? = nil) async throws -> Data {
        var request = URLRequest(url: baseURL.appending(path: path))
        request.httpMethod = "GET"
        if let token = bearerToken {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
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
        return data
    }

    private func execute<Response: Decodable>(_ request: URLRequest) async throws -> Response {
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
