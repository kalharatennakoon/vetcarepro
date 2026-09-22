//
//  VetCareUITests.swift
//  VetCareUITests
//
//  Navigation and input-validation UI tests. These run without the backend —
//  they verify that the app launches, presents the correct screens, and
//  enables/disables controls as expected. AI responses are not exercised here;
//  see GuestAIUITests for the full end-to-end AI flow.
//

import XCTest

final class VetCareUITests: XCTestCase {

    private var app: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = false
        app = XCUIApplication()
        // Skip Keychain/UserDefaults session restore so every test starts on WelcomeView.
        app.launchArguments = ["--uitesting"]
        app.launch()
    }

    override func tearDownWithError() throws {
        app = nil
    }

    // MARK: - Welcome screen

    @MainActor
    func testWelcomeScreenShowsBrandTitle() {
        XCTAssertTrue(
            app.staticTexts["VetCare Pro"].waitForExistence(timeout: 5),
            "Welcome screen must show the 'VetCare Pro' brand title"
        )
    }

    @MainActor
    func testWelcomeScreenShowsSignInButton() {
        XCTAssertTrue(
            app.buttons["Sign In"].waitForExistence(timeout: 5),
            "Welcome screen must show a 'Sign In' button"
        )
    }

    @MainActor
    func testWelcomeScreenShowsContinueAsGuestButton() {
        XCTAssertTrue(
            app.buttons["Continue as Guest"].waitForExistence(timeout: 5),
            "Welcome screen must show a 'Continue as Guest' button"
        )
    }

    @MainActor
    func testWelcomeScreenShowsAINote() {
        // The AI note banner is always present on the welcome screen.
        let aiNote = app.staticTexts.containing(
            NSPredicate(format: "label CONTAINS[c] %@", "AI Assistant")
        ).firstMatch
        XCTAssertTrue(
            aiNote.waitForExistence(timeout: 5),
            "Welcome screen must show the AI assistant note"
        )
    }

    // MARK: - Guest AI navigation

    @MainActor
    func testTappingContinueAsGuestNavigatesToGuestAI() {
        let guestButton = app.buttons["Continue as Guest"]
        XCTAssertTrue(guestButton.waitForExistence(timeout: 5))
        guestButton.tap()

        XCTAssertTrue(
            app.staticTexts["Ask me anything about pet care"].waitForExistence(timeout: 5),
            "Tapping 'Continue as Guest' must navigate to the guest AI empty state"
        )
        attach(name: "guest-ai-empty-state")
    }

    @MainActor
    func testGuestAIHasTextFieldAndSendButton() {
        let guestBtn = app.buttons["Continue as Guest"]
        XCTAssertTrue(guestBtn.waitForExistence(timeout: 5))
        guestBtn.tap()

        XCTAssertTrue(
            app.textFields["guestMessageField"].waitForExistence(timeout: 5),
            "Guest AI view must expose the message text field"
        )
        XCTAssertTrue(
            app.buttons["guestSendButton"].waitForExistence(timeout: 5),
            "Guest AI view must expose the send button"
        )
    }

    @MainActor
    func testGuestAISendButtonDisabledWithEmptyField() {
        let guestBtn = app.buttons["Continue as Guest"]
        XCTAssertTrue(guestBtn.waitForExistence(timeout: 5))
        guestBtn.tap()

        let sendButton = app.buttons["guestSendButton"]
        XCTAssertTrue(sendButton.waitForExistence(timeout: 5))
        XCTAssertFalse(
            sendButton.isEnabled,
            "Send button must be disabled when the text field is empty"
        )
        attach(name: "guest-ai-send-disabled")
    }

    @MainActor
    func testGuestAISendButtonEnabledAfterTyping() {
        let guestBtn = app.buttons["Continue as Guest"]
        XCTAssertTrue(guestBtn.waitForExistence(timeout: 5))
        guestBtn.tap()

        let field = app.textFields["guestMessageField"]
        XCTAssertTrue(field.waitForExistence(timeout: 5))
        field.tap()
        field.typeText("What vaccines does my dog need?")

        let sendButton = app.buttons["guestSendButton"]
        XCTAssertTrue(
            sendButton.isEnabled,
            "Send button must be enabled once the user has typed a question"
        )
        attach(name: "guest-ai-send-enabled")
    }

    @MainActor
    func testGuestAIShowsSuggestedPromptChips() {
        let guestBtn = app.buttons["Continue as Guest"]
        XCTAssertTrue(guestBtn.waitForExistence(timeout: 5))
        guestBtn.tap()

        // Wait for the empty-state heading first — it confirms GuestAIView is
        // fully rendered before querying the chip buttons inside the glass container.
        XCTAssertTrue(
            app.staticTexts["Ask me anything about pet care"].waitForExistence(timeout: 5),
            "Empty state heading must appear after navigating to guest AI"
        )
        let chip = app.buttons["What vaccinations does my pet need?"]
        XCTAssertTrue(
            chip.waitForExistence(timeout: 8),
            "Suggested prompt chips must appear in the guest AI empty state"
        )
    }

    // MARK: - Login screen navigation

    @MainActor
    func testTappingSignInNavigatesToLoginScreen() {
        let signInButton = app.buttons["Sign In"]
        XCTAssertTrue(signInButton.waitForExistence(timeout: 5))
        signInButton.tap()

        XCTAssertTrue(
            app.staticTexts["Welcome Back"].waitForExistence(timeout: 5),
            "Tapping 'Sign In' must navigate to the login screen"
        )
        attach(name: "login-screen")
    }

    @MainActor
    func testLoginSignInButtonDisabledWithNoInput() {
        let signInBtn = app.buttons["Sign In"]
        XCTAssertTrue(signInBtn.waitForExistence(timeout: 5))
        signInBtn.tap()
        // Wait for LoginView to push fully.
        XCTAssertTrue(app.staticTexts["Welcome Back"].waitForExistence(timeout: 5))

        // The WelcomeView's "Sign In" NavigationLink is still in the hierarchy but
        // off-screen. Iterate all buttons with that label and pick the hittable one —
        // that's LoginView's submit button. hittable is not a valid NSPredicate
        // keypath, so we check isHittable in Swift rather than in the predicate.
        let candidates = app.buttons.matching(NSPredicate(format: "label == 'Sign In'"))
        var loginSignIn: XCUIElement?
        for i in 0..<candidates.count {
            let b = candidates.element(boundBy: i)
            if b.isHittable {
                loginSignIn = b
                break
            }
        }

        XCTAssertFalse(
            loginSignIn?.isEnabled ?? true,
            "Sign In button must be disabled when both fields are empty"
        )
    }

    @MainActor
    func testLoginShowsSetUpAccountLink() {
        let signInBtn = app.buttons["Sign In"]
        XCTAssertTrue(signInBtn.waitForExistence(timeout: 5))
        signInBtn.tap()

        XCTAssertTrue(
            app.staticTexts["First time here?"].waitForExistence(timeout: 5),
            "Login screen must show the account-setup section"
        )

        let setupButton = app.buttons["Set Up Your Account"]
        XCTAssertTrue(
            setupButton.waitForExistence(timeout: 5),
            "Login screen must show the 'Set Up Your Account' button"
        )
        attach(name: "login-setup-footer")
    }

    // MARK: - Account setup navigation

    @MainActor
    func testSetUpAccountNavigatesToVerifyIdentityScreen() {
        let signInBtn = app.buttons["Sign In"]
        XCTAssertTrue(signInBtn.waitForExistence(timeout: 5))
        signInBtn.tap()
        // Wait for LoginView to fully appear before searching for the setup button.
        XCTAssertTrue(app.staticTexts["Welcome Back"].waitForExistence(timeout: 5))

        let setupLink = app.buttons["loginSetupAccountLink"]
        XCTAssertTrue(setupLink.waitForExistence(timeout: 5))
        // Scroll down to bring the setup footer fully into the viewport before tapping.
        app.scrollViews.firstMatch.swipeUp()
        setupLink.tap()

        // VerifyIdentityView is identified by its submit button's accessibilityIdentifier.
        XCTAssertTrue(
            app.buttons["verifyAndContinueButton"].waitForExistence(timeout: 10),
            "Tapping 'Set Up Your Account' must navigate to the identity verification screen"
        )
        attach(name: "verify-identity-screen")
    }

    // MARK: - Launch performance

    @MainActor
    func testLaunchPerformance() {
        measure(metrics: [XCTApplicationLaunchMetric()]) {
            XCUIApplication().launch()
        }
    }

    // MARK: - Helpers

    private func attach(name: String) {
        let attachment = XCTAttachment(screenshot: app.screenshot())
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
    }
}
