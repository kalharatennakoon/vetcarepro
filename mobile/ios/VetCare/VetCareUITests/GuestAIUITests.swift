//
//  GuestAIUITests.swift
//  VetCareUITests
//
//  Drives the guest AI assistant end-to-end through the real UI: welcome ->
//  guest -> ask a question -> a grounded answer with Sources chips appears.
//  Requires the local backend stack (Node :3000, ML :5001, Ollama) running.
//

import XCTest

final class GuestAIUITests: XCTestCase {

    @MainActor
    func testGuestAssistantAnswersWithSources() throws {
        let app = XCUIApplication()
        app.launch()

        // Welcome screen -> Continue as guest
        let guestButton = app.buttons["Continue as guest"]
        XCTAssertTrue(guestButton.waitForExistence(timeout: 10), "welcome 'Continue as guest' button")
        attach(app, name: "01-welcome")
        guestButton.tap()

        // Guest empty state
        XCTAssertTrue(
            app.staticTexts["Ask me anything about pet care"].waitForExistence(timeout: 5),
            "guest empty state"
        )
        attach(app, name: "02-guest-empty")

        // Tap a suggested prompt chip (this triggers a send)
        let chip = app.buttons["What vaccines does a new puppy need?"]
        XCTAssertTrue(chip.waitForExistence(timeout: 5), "suggested prompt chip")
        chip.tap()

        // Thinking state (transient — best effort capture)
        if app.staticTexts["Thinking"].waitForExistence(timeout: 5) {
            attach(app, name: "03-thinking")
        }

        // A grounded answer renders its "Sources" section once citations arrive.
        let sources = app.staticTexts["Sources"]
        XCTAssertTrue(
            sources.waitForExistence(timeout: 90),
            "grounded answer with Sources did not appear within 90s"
        )
        attach(app, name: "04-answer")
    }

    private func attach(_ app: XCUIApplication, name: String) {
        let attachment = XCTAttachment(screenshot: app.screenshot())
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
    }
}
