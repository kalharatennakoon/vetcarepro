//
//  VetCareTests.swift
//  VetCareTests
//
//  Unit tests for model decoding, computed properties, and ViewModel state.
//  These tests run without the backend — they are pure-logic and use
//  in-memory JSON to exercise the Codable layer and computed properties.
//

import Testing
import Foundation
import UIKit
@testable import VetCare

// MARK: - ChatResponse decoding

@Suite("ChatResponse decoding")
struct ChatResponseDecodingTests {

    @Test @MainActor func decodesFullResponse() throws {
        let json = """
        {
            "answer": "Cats need annual vaccines.",
            "sources": [
                {
                    "source_type": "faq",
                    "source_id": "42",
                    "metadata": { "question": "Vaccination schedule?", "category": "vaccines" }
                }
            ],
            "chunks_used": 3,
            "options": [],
            "pending_intent": null
        }
        """.data(using: .utf8)!

        let response = try JSONDecoder().decode(ChatResponse.self, from: json)
        #expect(response.answer == "Cats need annual vaccines.")
        #expect(response.chunksUsed == 3)
        #expect(response.sources.count == 1)
        #expect(response.sources[0].sourceType == "faq")
        #expect(response.sources[0].sourceID == "42")
        #expect(response.sources[0].question == "Vaccination schedule?")
        #expect(response.sources[0].category == "vaccines")
        #expect(response.options.isEmpty)
        #expect(response.pendingIntent == nil)
    }

    @Test @MainActor func decodesMinimalResponse() throws {
        let json = #"{"answer":"Hello!"}"#.data(using: .utf8)!
        let response = try JSONDecoder().decode(ChatResponse.self, from: json)
        #expect(response.answer == "Hello!")
        #expect(response.sources.isEmpty)
        #expect(response.chunksUsed == 0)
        #expect(response.options.isEmpty)
        #expect(response.pendingIntent == nil)
    }

    @Test @MainActor func decodesDisambiguationResponseWithOptionsAndPendingIntent() throws {
        let json = """
        {
            "answer": "Which Max do you mean?",
            "sources": [],
            "chunks_used": 0,
            "options": [
                { "label": "Max the dog",  "value": "pet Max dog", "display": "Max (dog)" },
                { "label": "Max the cat",  "value": "pet Max cat", "display": "Max (cat)" }
            ],
            "pending_intent": {
                "type": "general_qa_disambiguation",
                "original_question": "What vaccines has Max had?"
            }
        }
        """.data(using: .utf8)!

        let response = try JSONDecoder().decode(ChatResponse.self, from: json)
        #expect(response.options.count == 2)
        #expect(response.options[0].label == "Max the dog")
        #expect(response.options[0].value == "pet Max dog")
        #expect(response.options[0].display == "Max (dog)")
        #expect(response.options[1].value == "pet Max cat")
        #expect(response.pendingIntent?.type == "general_qa_disambiguation")
        #expect(response.pendingIntent?.originalQuestion == "What vaccines has Max had?")
    }
}

// MARK: - ChatSource decoding

@Suite("ChatSource decoding")
struct ChatSourceDecodingTests {

    @MainActor
    private func source(from json: String) throws -> ChatSource {
        try JSONDecoder().decode(ChatSource.self, from: json.data(using: .utf8)!)
    }

    @Test @MainActor func decodesStringSourceID() throws {
        let s = try source(from: """
        {"source_type":"medical_record","source_id":"79","metadata":{}}
        """)
        #expect(s.sourceID == "79")
        #expect(s.label == "medical_record 79")
    }

    @Test @MainActor func decodesIntegerSourceID() throws {
        let s = try source(from: """
        {"source_type":"faq","source_id":5,"metadata":{"question":"How often?","category":"care"}}
        """)
        #expect(s.sourceID == "5")
        #expect(s.question == "How often?")
        #expect(s.label == "How often?")
    }

    @Test @MainActor func fallsBackToSourceLabelWhenNoMetadataQuestion() throws {
        let s = try source(from: """
        {"source_type":"vaccination","source_id":"10","metadata":{"category":"vaccines"}}
        """)
        #expect(s.label == "vaccination 10")
        #expect(s.question == nil)
        #expect(s.category == "vaccines")
    }

    @Test @MainActor func handlesCompleteMissingMetadata() throws {
        let s = try source(from: """
        {"source_type":"lab_report","source_id":"7"}
        """)
        #expect(s.sourceID == "7")
        #expect(s.sourceType == "lab_report")
        #expect(s.question == nil)
    }
}

// MARK: - PendingIntent encoding / decoding

@Suite("PendingIntent Codable")
struct PendingIntentCodingTests {

    @Test @MainActor func roundTripsCorrectly() throws {
        let original = PendingIntent(
            type: "general_qa_disambiguation",
            originalQuestion: "Does Loki need vitamins?"
        )
        let data = try JSONEncoder().encode(original)
        let decoded = try JSONDecoder().decode(PendingIntent.self, from: data)
        #expect(decoded == original)
    }

    @Test @MainActor func usesSnakeCaseKeyForOriginalQuestion() throws {
        let json = """
        {"type":"general_qa_disambiguation","original_question":"Test question"}
        """.data(using: .utf8)!
        let intent = try JSONDecoder().decode(PendingIntent.self, from: json)
        #expect(intent.originalQuestion == "Test question")
    }
}

// MARK: - Customer model

@Suite("Customer model")
struct CustomerModelTests {

    private func makeCustomer(
        firstName: String = "Jane",
        lastName: String = "Smith",
        preferredContactMethod: String? = nil,
        createdAt: String? = nil
    ) -> Customer {
        Customer(
            customerId: "C001", firstName: firstName, lastName: lastName,
            email: "jane@example.com", phone: "+94771234567",
            alternatePhone: nil, address: nil, city: nil, nic: nil,
            preferredContactMethod: preferredContactMethod,
            emergencyContact: nil, emergencyPhone: nil,
            passwordMustChange: false, createdAt: createdAt
        )
    }

    @Test func fullNameConcatenatesFirstAndLast() {
        #expect(makeCustomer(firstName: "Jane", lastName: "Smith").fullName == "Jane Smith")
    }

    @Test func initialsAreFirstCharsOfEachName() {
        #expect(makeCustomer(firstName: "Jane", lastName: "Smith").initials == "JS")
    }

    @Test func memberSinceParsesYearFromISOTimestamp() {
        let c = makeCustomer(createdAt: "2024-03-15T08:30:00.000Z")
        #expect(c.memberSince == "2024")
    }

    @Test func memberSinceNilForMissingCreatedAt() {
        #expect(makeCustomer(createdAt: nil).memberSince == nil)
    }

    @Test func memberSinceNilForGarbageDate() {
        #expect(makeCustomer(createdAt: "not-a-date").memberSince == nil)
    }

    @Test func preferredContactDisplayPhone() {
        #expect(makeCustomer(preferredContactMethod: "phone").preferredContactDisplay == "Phone")
    }

    @Test func preferredContactDisplayEmail() {
        #expect(makeCustomer(preferredContactMethod: "email").preferredContactDisplay == "Email")
    }

    @Test func preferredContactDisplaySMS() {
        #expect(makeCustomer(preferredContactMethod: "sms").preferredContactDisplay == "SMS")
    }

    @Test func preferredContactDisplayDefaultDash() {
        #expect(makeCustomer(preferredContactMethod: nil).preferredContactDisplay == "—")
    }
}

// MARK: - Pet model

@Suite("Pet model")
struct PetModelTests {

    private func makePet(
        species: String = "dog",
        dateOfBirth: String? = nil,
        weightCurrent: String? = nil
    ) -> Pet {
        Pet(
            petId: "P001", name: "Max", species: species,
            breed: nil, gender: nil, dateOfBirth: dateOfBirth,
            color: nil, weightCurrent: weightCurrent,
            isNeutered: false, allergies: nil, specialNeeds: nil
        )
    }

    @Test func speciesSymbolDog()      { #expect(makePet(species: "dog").speciesSymbol  == "dog")  }
    @Test func speciesSymbolCat()      { #expect(makePet(species: "cat").speciesSymbol  == "cat")  }
    @Test func speciesSymbolBird()     { #expect(makePet(species: "bird").speciesSymbol == "bird") }
    @Test func speciesSymbolFish()     { #expect(makePet(species: "fish").speciesSymbol == "fish") }
    @Test func speciesSymbolFallback() { #expect(makePet(species: "hamster").speciesSymbol == "pawprint.fill") }

    @Test func ageStringNilForMissingDOB() {
        #expect(makePet(dateOfBirth: nil).ageString == nil)
    }

    @Test func ageStringNilForUnparsableDOB() {
        #expect(makePet(dateOfBirth: "not-a-date").ageString == nil)
    }

    @Test func ageStringYearsForOldPet() {
        // Born in 2019 → should be several years old by now (2026+).
        let pet = makePet(dateOfBirth: "2019-01-01")
        let age = pet.ageString
        #expect(age != nil)
        #expect(age?.hasSuffix("y old") == true)
    }

    @Test func weightDisplayFormatsDecimalKg() {
        #expect(makePet(weightCurrent: "28.5").weightDisplay == "28.5 kg")
    }

    @Test func weightDisplayTruncatesWholeNumber() {
        #expect(makePet(weightCurrent: "12.0").weightDisplay == "12 kg")
    }

    @Test func weightDisplayNilForNilWeight() {
        #expect(makePet(weightCurrent: nil).weightDisplay == nil)
    }

    @Test func weightDisplayNilForZeroWeight() {
        #expect(makePet(weightCurrent: "0").weightDisplay == nil)
    }

    @Test func weightDisplayNilForNonNumeric() {
        #expect(makePet(weightCurrent: "unknown").weightDisplay == nil)
    }
}

// MARK: - Appointment model

@Suite("Appointment model")
struct AppointmentModelTests {

    private func makeAppointment(
        status: String = "confirmed",
        appointmentDate: String = "2099-12-31",
        appointmentTime: String = "09:00:00",
        appointmentType: String = "checkup"
    ) -> Appointment {
        Appointment(
            appointmentId: "APPT-2099-001",
            petId: "P001",
            appointmentDate: appointmentDate,
            appointmentTime: appointmentTime,
            durationMinutes: 30,
            appointmentType: appointmentType,
            reason: "Routine check",
            status: status,
            cancellationReason: nil,
            createdAt: "2026-01-01T00:00:00.000Z",
            veterinarianId: nil,
            veterinarianName: nil,
            petName: "Max",
            species: "dog"
        )
    }

    @Test func typeDisplayCheckup()      { #expect(makeAppointment(appointmentType: "checkup").typeDisplayName == "Check-up") }
    @Test func typeDisplayVaccination()  { #expect(makeAppointment(appointmentType: "vaccination").typeDisplayName == "Vaccination") }
    @Test func typeDisplayFollowUp()     { #expect(makeAppointment(appointmentType: "follow_up").typeDisplayName == "Follow-up") }
    @Test func typeDisplayConsultation() { #expect(makeAppointment(appointmentType: "consultation").typeDisplayName == "Consultation") }
    @Test func typeDisplayFallback()     { #expect(makeAppointment(appointmentType: "wellness_exam").typeDisplayName == "Wellness Exam") }

    @Test func statusDisplayConfirmed()  { #expect(makeAppointment(status: "confirmed").statusDisplayName == "Confirmed") }
    @Test func statusDisplayCompleted()  { #expect(makeAppointment(status: "completed").statusDisplayName == "Completed") }
    @Test func statusDisplayCancelled()  { #expect(makeAppointment(status: "cancelled").statusDisplayName == "Cancelled") }
    @Test func statusDisplayInProgress() { #expect(makeAppointment(status: "in_progress").statusDisplayName == "In Progress") }
    @Test func statusDisplayNoShow()     { #expect(makeAppointment(status: "no_show").statusDisplayName == "No Show") }

    @Test func isUpcomingForConfirmed()    { #expect(makeAppointment(status: "confirmed").isUpcoming) }
    @Test func isUpcomingForScheduled()    { #expect(makeAppointment(status: "scheduled").isUpcoming) }
    @Test func isUpcomingForInProgress()   { #expect(makeAppointment(status: "in_progress").isUpcoming) }
    @Test func isNotUpcomingForCompleted() { #expect(!makeAppointment(status: "completed").isUpcoming) }

    @Test func canModifyFarFutureConfirmed() {
        // 2099-12-31 is well beyond 48 h from now.
        #expect(makeAppointment(status: "confirmed", appointmentDate: "2099-12-31").canModify)
    }

    @Test func cannotModifyPastAppointment() {
        #expect(!makeAppointment(status: "confirmed", appointmentDate: "2020-01-01").canModify)
    }

    @Test func cannotModifyCompletedAppointment() {
        #expect(!makeAppointment(status: "completed", appointmentDate: "2099-12-31").canModify)
    }

    @Test func cannotModifyCancelledAppointment() {
        #expect(!makeAppointment(status: "cancelled", appointmentDate: "2099-12-31").canModify)
    }

    @Test func timeFormattedReturnsSomethingForValidTime() {
        let appt = makeAppointment(appointmentTime: "09:30:00")
        #expect(!appt.timeFormatted.isEmpty)
    }

    @Test func timeFormattedFallsBackToRawPrefixForInvalidTime() {
        // prefix(5) of "bad" (only 3 chars) returns "bad", which can't be
        // parsed, so timeFormatted falls back to the raw string.
        let appt = makeAppointment(appointmentTime: "bad")
        #expect(appt.timeFormatted == "bad")
    }
}

// MARK: - Vaccination model

@Suite("Vaccination model")
struct VaccinationModelTests {

    private func makeVaccination(nextDueDate: String?) -> Vaccination {
        Vaccination(
            vaccinationId: 1,
            vaccineName: "Rabies",
            vaccineType: "core",
            vaccinationDate: "2025-01-10",
            nextDueDate: nextDueDate,
            adverseReaction: false,
            notes: nil,
            administeredByName: "Dr. Silva"
        )
    }

    @Test func dueStatusNilForMissingNextDueDate() {
        #expect(makeVaccination(nextDueDate: nil).dueStatus == nil)
    }

    @Test func dueStatusPastForOverdueDate() {
        #expect(makeVaccination(nextDueDate: "2020-01-01").dueStatus == .past)
    }

    @Test func dueStatusFutureForUpcomingDate() {
        #expect(makeVaccination(nextDueDate: "2099-12-31").dueStatus == .future)
    }

    @Test func vaccinationDateFormattedIsNonEmpty() {
        #expect(!makeVaccination(nextDueDate: nil).vaccinationDateFormatted.isEmpty)
    }
}

// MARK: - AuthMode

@Suite("AuthMode")
struct AuthModeTests {

    @Test func petOwnerIdentifierLabelIsEmailOrPhone() {
        #expect(AuthMode.petOwner.identifierLabel == "Email or phone")
    }

    @Test func staffIdentifierLabelIsEmail() {
        #expect(AuthMode.staff.identifierLabel == "Email")
    }

    @Test func petOwnerAndStaffHaveDifferentKeyboardTypes() {
        // petOwner allows typing a phone number so it uses the default keyboard;
        // staff is email-only so it uses the email keyboard.
        #expect(AuthMode.petOwner.keyboardType != AuthMode.staff.keyboardType)
        #expect(AuthMode.petOwner.keyboardType == .default)
        #expect(AuthMode.staff.keyboardType == .emailAddress)
    }

    @Test func titlesAreNonEmpty() {
        #expect(!AuthMode.petOwner.title.isEmpty)
        #expect(!AuthMode.staff.title.isEmpty)
    }

    @Test func petOwnerAndStaffHaveDifferentTitles() {
        #expect(AuthMode.petOwner.title != AuthMode.staff.title)
    }
}

// MARK: - LabReport model

@Suite("LabReport model")
struct LabReportModelTests {

    private func makeReport(reportType: String) -> LabReport {
        LabReport(
            reportId: 1, petId: "P001",
            reportName: "Test Report", reportType: reportType,
            fileType: "pdf", notes: nil,
            createdAt: "2025-06-01T10:00:00.000Z"
        )
    }

    @Test func typeDisplayNameBloodTest()  { #expect(makeReport(reportType: "blood_test").typeDisplayName == "Blood Test") }
    @Test func typeDisplayNameUrinalysis() { #expect(makeReport(reportType: "urinalysis").typeDisplayName == "Urinalysis") }
    @Test func typeDisplayNameXRay()       { #expect(makeReport(reportType: "x_ray").typeDisplayName == "X-Ray") }
    @Test func typeDisplayNameFallback()   { #expect(makeReport(reportType: "other_type").typeDisplayName == "Other") }

    @Test func typeIconIsNonEmptyForAllKnownTypes() {
        let known = ["blood_test", "urinalysis", "kidney_panel", "x_ray",
                     "ultrasound", "cytology", "biopsy", "culture", "other"]
        for kind in known {
            #expect(!makeReport(reportType: kind).typeIcon.isEmpty, "icon for \(kind) must not be empty")
        }
    }

    @Test func formattedDateIsNonEmptyForValidISO() {
        #expect(!makeReport(reportType: "blood_test").formattedDate.isEmpty)
    }
}

// MARK: - TimeSlot model

@Suite("TimeSlot model")
struct TimeSlotModelTests {

    @Test func timeFormattedIsNonEmptyForValidTime() {
        let slot = TimeSlot(time: "09:30", remainingCapacity: 2, available: true, meetsLeadTime: true)
        #expect(!slot.timeFormatted.isEmpty)
    }

    @Test func timeFormattedFallsBackForInvalidTime() {
        let slot = TimeSlot(time: "bad", remainingCapacity: 1, available: true, meetsLeadTime: true)
        #expect(slot.timeFormatted == "bad")
    }

    @Test func availableSlotIsAvailable() {
        let slot = TimeSlot(time: "10:00", remainingCapacity: 3, available: true, meetsLeadTime: true)
        #expect(slot.available)
        #expect(slot.remainingCapacity == 3)
    }
}

// MARK: - GuestChatViewModel

@Suite("GuestChatViewModel", .serialized)
struct GuestChatViewModelTests {

    @Test @MainActor func initialMessagesIsEmpty() {
        #expect(GuestChatViewModel().messages.isEmpty)
    }

    @Test @MainActor func isEmptyTrueInitially() {
        #expect(GuestChatViewModel().isEmpty)
    }

    @Test @MainActor func canSendFalseWithEmptyInput() {
        let vm = GuestChatViewModel()
        vm.input = ""
        #expect(!vm.canSend)
    }

    @Test @MainActor func canSendFalseWithWhitespaceOnly() {
        let vm = GuestChatViewModel()
        vm.input = "   \n  "
        #expect(!vm.canSend)
    }

    @Test @MainActor func canSendTrueWithText() {
        let vm = GuestChatViewModel()
        vm.input = "What vaccines does my dog need?"
        #expect(vm.canSend)
    }

    // The tests below call send() which fires a real network request.
    // With no backend running the connection is refused immediately, so they
    // complete quickly and verify the error-path behaviour (messages appended,
    // isThinking reset, input cleared).

    @Test @MainActor func sendClearsInput() async {
        let vm = GuestChatViewModel()
        vm.input = "Hello"
        await vm.send()
        #expect(vm.input.isEmpty)
    }

    @Test @MainActor func sendAppendsUserMessageThenAssistantMessage() async {
        let vm = GuestChatViewModel()
        vm.input = "Hello"
        await vm.send()
        // [0] user bubble, [1] error response (no backend running in unit tests)
        #expect(vm.messages.count == 2)
        #expect(vm.messages[0].role == .user)
        #expect(vm.messages[0].text == "Hello")
        #expect(vm.messages[1].role == .assistant)
    }

    @Test @MainActor func sendResetsIsThinking() async {
        let vm = GuestChatViewModel()
        vm.input = "Question"
        await vm.send()
        #expect(!vm.isThinking)
    }

    @Test @MainActor func sendIgnoresWhitespaceOnlyInput() async {
        let vm = GuestChatViewModel()
        vm.input = "   "
        await vm.send()
        #expect(vm.messages.isEmpty)
    }

    @Test @MainActor func isEmptyFalseAfterFirstSend() async {
        let vm = GuestChatViewModel()
        vm.input = "Hello"
        await vm.send()
        #expect(!vm.isEmpty)
    }
}

// MARK: - PetOwnerChatViewModel

@Suite("PetOwnerChatViewModel", .serialized)
struct PetOwnerChatViewModelTests {

    @Test @MainActor func initialStateHasOneIntroMessage() {
        let vm = PetOwnerChatViewModel(token: "test-token")
        #expect(vm.messages.count == 1)
        #expect(vm.messages[0].role == .assistant)
    }

    @Test @MainActor func isEmptyTrueWithOnlyIntroMessage() {
        #expect(PetOwnerChatViewModel(token: "test-token").isEmpty)
    }

    @Test @MainActor func canSendFalseWithEmptyInput() {
        let vm = PetOwnerChatViewModel(token: "test-token")
        vm.input = ""
        #expect(!vm.canSend)
    }

    @Test @MainActor func canSendFalseWithWhitespaceOnly() {
        let vm = PetOwnerChatViewModel(token: "test-token")
        vm.input = "  \t  "
        #expect(!vm.canSend)
    }

    @Test @MainActor func canSendTrueWithInput() {
        let vm = PetOwnerChatViewModel(token: "test-token")
        vm.input = "What vaccines has Max had?"
        #expect(vm.canSend)
    }

    @Test @MainActor func sendClearsInput() async {
        let vm = PetOwnerChatViewModel(token: "test-token")
        vm.input = "Does Loki need vitamins?"
        await vm.send()
        #expect(vm.input.isEmpty)
    }

    @Test @MainActor func sendAppendsUserBubbleWithTypedText() async {
        let vm = PetOwnerChatViewModel(token: "test-token")
        vm.input = "Does Loki need vitamins?"
        await vm.send()
        // [0]=intro, [1]=user bubble, [2]=error response (no backend)
        #expect(vm.messages.count == 3)
        #expect(vm.messages[1].role == .user)
        #expect(vm.messages[1].text == "Does Loki need vitamins?")
    }

    @Test @MainActor func sendResetsIsThinking() async {
        let vm = PetOwnerChatViewModel(token: "test-token")
        vm.input = "Question"
        await vm.send()
        #expect(!vm.isThinking)
    }

    @Test @MainActor func isNotEmptyAfterFirstSend() async {
        let vm = PetOwnerChatViewModel(token: "test-token")
        vm.input = "Hello"
        await vm.send()
        #expect(!vm.isEmpty)
    }

    @Test @MainActor func sendWithDisplayTextShowsDisplayTextInBubble() async {
        let vm = PetOwnerChatViewModel(token: "test-token")
        await vm.send("pet Max dog", displayText: "Max (dog)")
        #expect(vm.messages[1].text == "Max (dog)")
    }

    @Test @MainActor func sendIgnoresWhitespaceOnlyInput() async {
        let vm = PetOwnerChatViewModel(token: "test-token")
        vm.input = "   "
        await vm.send()
        // Only the intro message — nothing was sent.
        #expect(vm.messages.count == 1)
    }
}
