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

import XCTest

final class GuestAIUITests: XCTestCase {

    @MainActor
    func testGuestAnswersFromFAQAndGeneralKnowledge() throws {
        let app = XCUIApplication()
        app.launch()

        let guestButton = app.buttons["Continue as guest"]
        XCTAssertTrue(guestButton.waitForExistence(timeout: 10), "welcome 'Continue as guest' button")
        guestButton.tap()

        XCTAssertTrue(
            app.staticTexts["Ask me anything about pet care"].waitForExistence(timeout: 5),
            "guest empty state"
        )

        // 1) FAQ-grounded answer via a suggested prompt chip.
        let chip = app.buttons["What vaccines does a new puppy need?"]
        XCTAssertTrue(chip.waitForExistence(timeout: 5), "suggested prompt chip")
        chip.tap()

        let faqFooter = app.staticTexts["From our clinic FAQs"]
        XCTAssertTrue(faqFooter.waitForExistence(timeout: 90), "FAQ footer for a grounded answer")
        attach(app, name: "01-faq-answer")

        // 2) General-knowledge answer for a question outside the FAQ set.
        let field = app.textFields["guestMessageField"]
        XCTAssertTrue(field.waitForExistence(timeout: 5), "message field")
        field.tap()
        field.typeText("How do I safely trim my rabbit's nails at home?")
        app.buttons["guestSendButton"].tap()

        let generalNote = app.staticTexts.containing(
            NSPredicate(format: "label CONTAINS[c] %@", "General veterinary knowledge")
        ).firstMatch
        XCTAssertTrue(generalNote.waitForExistence(timeout: 90), "general-knowledge footer")
        attach(app, name: "02-general-knowledge-answer")
    }

    private func attach(_ app: XCUIApplication, name: String) {
        let attachment = XCTAttachment(screenshot: app.screenshot())
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
    }
}
