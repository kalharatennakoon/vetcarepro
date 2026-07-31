# VetCare Pro iOS — App Flow

A top-to-bottom walkthrough of how the app is structured and how each screen connects to the next.

---

## 1. App Entry Point — `VetCareApp.swift`

`VetCareApp` is the root of the app (marked `@main`). On launch it checks the state of `CustomerSession` and routes to one of three screens:

```
App launches
    │
    ├── isLoggedIn == true
    │       ├── mustChangePassword == true  →  ChangePasswordView
    │       └── mustChangePassword == false →  PetOwnerHomeView
    │
    └── isLoggedIn == false  →  ContentView (unauthenticated flow)
```

`CustomerSession` is injected into the entire view hierarchy via `.environment(session)`, so every view in the app can read it.

---

## 2. Unauthenticated Flow — `ContentView.swift`

`ContentView` owns a `NavigationStack` and sets `WelcomeView` as the root. Navigation is type-safe using the `WelcomeRoute` enum:

```swift
enum WelcomeRoute: Hashable {
    case login(AuthMode)
    case guest
    case verifyIdentity
}
```

| Route pushed | Destination |
|---|---|
| `.login(.petOwner)` | `LoginView` |
| `.guest` | `GuestAIView` |
| `.verifyIdentity` | `VerifyIdentityView` |

---

## 3. Welcome Screen — `WelcomeView.swift`

The first screen the user sees. Two buttons:

- **Sign In** → pushes `WelcomeRoute.login(.petOwner)`
- **Continue as Guest** → pushes `WelcomeRoute.guest`

A "Set Up Your Account" footer link also pushes `WelcomeRoute.verifyIdentity` for first-time users.

Buttons use **Liquid Glass** (`.glassEffect()`) — a new iOS 26 design system:
- `.filled` style: brand-tinted glass (primary action)
- `.outlined` style: plain glass with brand text (secondary action)

---

## 4. Authentication

There are **three separate auth flows** depending on the user's situation.

### 4a. Normal Login — `LoginView.swift`

```
User fills identifier (email/phone) + password
    │
    └── CustomerAuthService.login()
            → POST /api/customer-auth/login
            ← (Customer, JWT token)
            → CustomerSession.login()  →  isLoggedIn = true
            → VetCareApp routes to PetOwnerHomeView
```

If the server returns HTTP 403, it means the account exists but was never set up. The error banner shows a "Set Up Your Account" link that pushes `VerifyIdentityView`.

`AuthMode` controls how `LoginView` behaves:
- `.petOwner` — identifier field accepts email or phone, hits `/customer-auth`
- `.staff` — identifier field accepts email only, hits `/auth` (separate backend)

### 4b. First-Time Account Setup

For users whose accounts were created by the clinic but who have never set a password:

```
VerifyIdentityView
    → POST /api/customer-auth/verify-identity  { email, phone }
    ← setupToken + firstName

SetPasswordView
    → POST /api/customer-auth/set-password  { setupToken, newPassword }
    ← (Customer, JWT token)
    → CustomerSession.login()  →  logged in
```

### 4c. Forced Password Change

For accounts where the clinic set a temporary password:

```
Normal login succeeds but Customer.passwordMustChange == true
    → VetCareApp routes to ChangePasswordView

ChangePasswordView
    → POST /api/customer-auth/change-password-first-login  { newPassword }
    → CustomerSession.customerDidChangePassword()
    → mustChangePassword = false  →  routes to PetOwnerHomeView
```

### Session Persistence — `CustomerSession.swift`

`CustomerSession` uses two-tier storage so the user stays logged in across app restarts:

| Data | Storage | Why |
|---|---|---|
| JWT token | **Keychain** | Sensitive — survives app reinstall |
| Customer profile | **UserDefaults** | Non-sensitive — fast to read on launch |

On app launch, `CustomerSession.init()` restores both from storage automatically.

---

## 5. Pet Owner Home — `PetOwnerHomeView.swift`

The main screen after login. Three sections:

```
┌─────────────────────────┐
│  Greeting card          │  ← first initial avatar + "Hi, {firstName}!"
├─────────────────────────┤
│  My Pets                │  ← list of pet cards, tap → PetDetailView
├─────────────────────────┤
│  AI Assistant card      │  ← "Ask a question" → PetOwnerAIView
└─────────────────────────┘
```

Pets are loaded on `.task` (fires once when the view appears):

```
CustomerAuthService.fetchMyPets(token)
    → GET /api/customer-auth/me/pets
    ← [Pet]
```

Pull-to-refresh re-fetches without showing the inline spinner (the system refresh indicator handles that).

**Sign Out** button in the toolbar calls `session.logout()`, which clears Keychain + UserDefaults and routes back to `ContentView`.

Navigation destinations registered here:

| Value pushed | Destination |
|---|---|
| `Pet` object | `PetDetailView` |
| `PetOwnerRoute.aiAssistant` | `PetOwnerAIView` |

---

## 6. Pet Detail — `PetDetailView.swift`

Shows a single pet's complete medical record. Layout:

```
┌────────────────────────┐
│  Hero card             │  ← species icon, name, breed
│  Stats row             │  ← Age · Weight · Gender chips
│  Details section       │  ← DOB, colour, neutered status
│  Health Notes          │  ← Allergies (orange), Special Needs (brand)
│  Vaccinations          │  ← list with dates + due status badges
│  Lab Reports           │  ← list with view/download button
└────────────────────────┘
```

Both data sections load **in parallel** on `.task`:

```swift
async let v = loadVaccinations()   // GET /customer-auth/pets/{id}/vaccinations
async let l = loadLabReports()     // GET /customer-auth/pets/{id}/lab-reports
_ = await (v, l)
```

**Lab report viewing:**

```
Tap eye button
    → CustomerAuthService.downloadLabReport()
    → GET /customer-auth/lab-reports/{id}/view
    → file written to tmp directory (PDF or JPG)
    → .quickLookPreview() opens system file viewer
```

**Vaccination badges:**
- Orange warning icon if `adverseReaction == true`
- Red "Overdue" if `nextDueDate` is in the past
- Green "Due" if upcoming

---

## 7. AI Chat — Guest vs Pet Owner

Both chat screens share the same visual structure and behaviour, but talk to different backend endpoints.

### GuestAIView + GuestChatViewModel

- No login required
- Endpoint: `POST /api/ai/public-chat` (no token)
- AI can only see general clinic FAQ articles
- Empty state shows a splash with 4 suggested prompt chips
- Header has a "Sign In" button to upsell

### PetOwnerAIView + PetOwnerChatViewModel

- Requires JWT token
- Endpoint: `POST /api/ai/customer-chat` (token attached)
- Server restricts AI to only this owner's pets' data
- Starts with a pre-loaded assistant greeting message
- Header shows the customer's first name

### Shared message flow (both ViewModels)

```
User types or taps a suggestion chip
    │
    └── send()
            ├── appends user ChatMessage to messages[]
            ├── isThinking = true  →  ThinkingBubble appears
            │
            ├── AIService.askGuest() or AIService.askPetOwner()
            │       → POST to backend
            │       ← { answer, sources, chunks_used }
            │
            ├── SUCCESS  →  appends assistant ChatMessage (answer + sources)
            └── FAILURE  →  appends error text as assistant bubble
```

`canSend` is false while `isThinking == true` or input is blank — prevents double-sends.

### MessageBubble (shared component)

- User messages → right-aligned, brand gradient background
- Assistant messages → left-aligned, card background, rendered by `AssistantMarkdown`

`AssistantMarkdown` is a custom lightweight renderer — handles `**bold**`, `- bullets`, `1. numbered lists`, and paragraphs with no third-party library.

### Answer footer

Each assistant reply shows one of:
- **"From our clinic FAQs"** + source chips — answer was grounded in retrieved FAQ chunks
- **"General veterinary knowledge"** — no chunk was close enough; AI used its own training

---

## 8. AI and Networking Layer

### AIService.swift

Thin wrapper over `APIClient`. Two methods, one per scope:

```swift
func askGuest(_ question: String) async throws -> ChatResponse
func askPetOwner(_ question: String, token: String) async throws -> ChatResponse
```

### APIClient.swift

The single HTTP client used by the whole app. Provides `get`, `post`, and `download` methods. Encodes request bodies as JSON, decodes responses into typed Swift structs, and maps non-2xx HTTP status codes into `APIError` values.

### APIConfig.swift

Holds the base URL for all API requests. All endpoints are relative to this base.

---

## 9. Data Models Overview

| File | What it defines |
|---|---|
| `CustomerModels.swift` | `Customer`, `Pet`, `Vaccination`, `LabReport`, request/response envelopes |
| `AIModels.swift` | `ChatRequest`, `ChatResponse`, `ChatSource` |
| `ChatMessage.swift` | A single message in a conversation (role, text, sources) |

---

## 10. App-Wide Theme

`Theme.swift` defines custom colours and gradients used throughout:
- `Color.brand` — primary brand colour
- `Color.appBackground` — screen background
- `Color.cardSurface` — card and input field backgrounds
- `LinearGradient.brand` — brand gradient used on hero circles and primary buttons
