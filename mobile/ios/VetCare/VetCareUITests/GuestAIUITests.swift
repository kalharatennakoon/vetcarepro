//
//  GuestAIUITests.swift
//  VetCareUITests
//
//  Drives the guest AI assistant end-to-end through the real UI. Verifies both
//  answer modes: an FAQ-grounded answer (shows "From our clinic FAQs") and a
//  general-knowledge answer for a question outside the FAQ set (shows the
//  "General veterinary knowledge" note). Requires the local backend stack
//  (Node :3000, ML :5001, Ollama) running.
//

import Foundation
import XCTest

// Class name starts with Z so this long-running E2E test sorts after all
// navigation tests (VetCareUITests, VetCareUITestsLaunchTests) and runs last,
// preventing Ollama inference load from polluting earlier, faster tests.
final class ZGuestAIUITests: XCTestCase {

    @MainActor
    func testGuestAnswersFromFAQAndGeneralKnowledge() throws {
        // This test drives the full AI pipeline and requires the local backend
        // stack (Node :3000, ML :5001, Ollama) to be running. Skip cleanly when
        // the backend isn't available rather than hanging for 90 s.
        var isBackendUp = false
        let sema = DispatchSemaphore(value: 0)
        URLSession.shared.dataTask(with: URL(string: "http://localhost:3000/health")!) { _, resp, _ in
            isBackendUp = (resp as? HTTPURLResponse)?.statusCode == 200
            sema.signal()
        }.resume()
        _ = sema.wait(timeout: .now() + 3)
        try XCTSkipUnless(isBackendUp, "Backend not running — skipping E2E AI test")

        let app = XCUIApplication()
        // Start clean so the test sees WelcomeView, not PetOwnerHomeView.
        app.launchArguments = ["--uitesting"]
        app.launch()
        // Ensure the app is terminated when the test ends so subsequent tests
        // see a clean simulator state (no keyboard, no AI screen, no animations).
        defer { app.terminate() }

        let guestButton = app.buttons["Continue as Guest"]
        XCTAssertTrue(guestButton.waitForExistence(timeout: 10), "welcome 'Continue as Guest' button")
        guestButton.tap()

        XCTAssertTrue(
            app.staticTexts["Ask me anything about pet care"].waitForExistence(timeout: 5),
            "guest empty state"
        )

        // 1) FAQ-grounded answer via a suggested prompt chip.
        let chip = app.buttons["What vaccinations does my pet need?"]
        XCTAssertTrue(chip.waitForExistence(timeout: 5), "suggested prompt chip")
        chip.tap()

        let faqFooter = app.staticTexts["From our clinic FAQs"]
        XCTAssertTrue(faqFooter.waitForExistence(timeout: 150), "FAQ footer for a grounded answer")
        attach(app, name: "01-faq-answer")

        // 2) General-knowledge answer for a question outside the FAQ set.
        let field = app.textFields["guestMessageField"]
        XCTAssertTrue(field.waitForExistence(timeout: 5), "message field")
        field.tap()
        // Wait for the keyboard to appear and gain focus before typing.
        XCTAssertTrue(app.keyboards.firstMatch.waitForExistence(timeout: 5), "keyboard must appear")
        field.typeText("How do I safely trim my rabbit's nails at home?")
        app.buttons["guestSendButton"].tap()

        let generalNote = app.staticTexts.containing(
            NSPredicate(format: "label CONTAINS[c] %@", "General veterinary knowledge")
        ).firstMatch
        XCTAssertTrue(generalNote.waitForExistence(timeout: 150), "general-knowledge footer")
        attach(app, name: "02-general-knowledge-answer")
    }

    private func attach(_ app: XCUIApplication, name: String) {
        let attachment = XCTAttachment(screenshot: app.screenshot())
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
    }
}
