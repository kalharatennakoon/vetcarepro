## Purpose

Gives each staff role a short, AI-generated summary of the day's most relevant clinic signals on their dashboard, built from the clinic's existing trained ML models and an LLM summarization pass, so staff see model-driven insight without having to ask the AI chat assistant for it.

## ADDED Requirements

### Requirement: Role-scoped briefing content
The system SHALL generate a daily briefing whose underlying data is scoped to what the requesting user's role is authorized to see, using only the following per role:
- **admin**: revenue forecast trend, top revenue services, inventory reorder-alert count, disease outbreak/pandemic risk level
- **veterinarian**: today's scheduled appointments cross-referenced with pet-level disease-recurrence/cancer risk, and a clinical disease-trend note; no pandemic-risk figure
- **receptionist**: inventory reorder suggestions and an operational summary (today's appointment load, outstanding billing balances); no clinical or disease data

#### Scenario: Veterinarian briefing omits pandemic risk
- **WHEN** a veterinarian's dashboard requests a briefing
- **THEN** the response contains no clinic-wide pandemic-risk figure

#### Scenario: Receptionist briefing omits clinical data
- **WHEN** a receptionist's dashboard requests a briefing
- **THEN** the response contains no disease-case, disease-risk, or medical-record data of any kind

### Requirement: Server-side role authorization on briefing endpoint(s)
The system SHALL authorize each briefing request against the requesting user's role on the server, independent of any client-side hiding of the briefing card, consistent with the project's rule that the server is the sole enforcement point for role-restricted data.

#### Scenario: Receptionist requests veterinarian-shaped briefing data directly
- **WHEN** an authenticated receptionist calls the briefing endpoint requesting clinical risk content (e.g. by manipulating the request)
- **THEN** the server rejects or omits the clinical content rather than relying on the frontend to have hidden it

### Requirement: Graceful degradation when the LLM is unavailable
The system SHALL show an "insights unavailable" state on the briefing card, rather than an error, when the underlying LLM generation call cannot complete (e.g. Ollama not running), consistent with how the existing AI assistant degrades.

#### Scenario: Ollama is not running
- **WHEN** the briefing endpoint's LLM summarization call fails or times out
- **THEN** the dashboard shows an "insights unavailable" message on the briefing card instead of surfacing an error or blocking the rest of the dashboard from rendering

### Requirement: Briefing reflects only already-trained models
The system SHALL generate briefing content exclusively from the outputs of ML models that are already trained and served by the existing `/api/ml/*` endpoints; it SHALL NOT trigger model training as part of generating a briefing.

#### Scenario: Underlying model has not been trained yet
- **WHEN** a briefing is requested for a role whose content depends on a model with no trained `.pkl` file available
- **THEN** the briefing omits that specific insight (or notes it as unavailable) rather than triggering a training run or failing the whole briefing

### Requirement: Briefing is not regenerated on every dashboard render
The system SHALL avoid issuing a fresh LLM generation call on every single dashboard page load for the same user within the same day; repeated loads within that window SHALL reuse a previously generated briefing.

#### Scenario: User revisits dashboard within the same day
- **WHEN** a staff user navigates away from and back to `/dashboard` multiple times within the same day
- **THEN** the briefing shown is served from a cached result rather than triggering a new LLM generation call each time
