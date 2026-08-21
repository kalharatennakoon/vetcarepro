## Purpose

Gives each staff role (admin, veterinarian, receptionist) its own dashboard landing page showing only the stats, quick actions, and data tables relevant to that role, instead of one page that branches internally per role.

## ADDED Requirements

### Requirement: Role-specific dashboard rendering
The system SHALL render a distinct dashboard for each authenticated staff role (`admin`, `veterinarian`, `receptionist`) when the user navigates to `/dashboard`, showing only that role's stat cards, quick actions, and data tables.

#### Scenario: Admin visits dashboard
- **WHEN** a user with role `admin` navigates to `/dashboard`
- **THEN** the system shows the admin dashboard, including clinic-wide revenue/billing, staffing, inventory, and analytics stat cards

#### Scenario: Veterinarian visits dashboard
- **WHEN** a user with role `veterinarian` navigates to `/dashboard`
- **THEN** the system shows the veterinarian dashboard, including that vet's appointment schedule and clinical stat cards, and excludes billing/revenue and staffing data

#### Scenario: Receptionist visits dashboard
- **WHEN** a user with role `receptionist` navigates to `/dashboard`
- **THEN** the system shows the receptionist dashboard, including appointments, customers, billing, and inventory stat cards, and excludes medical records and disease-case data

### Requirement: No cross-role data leakage on dashboard load
The system SHALL NOT include any other role's restricted data (clinical detail, staffing, or admin-only analytics) in the data fetched for a given role's dashboard, whether or not that data would be rendered client-side.

#### Scenario: Receptionist dashboard data fetch excludes clinical detail
- **WHEN** the receptionist dashboard loads its data
- **THEN** none of the network requests it issues return medical record or disease case detail

### Requirement: Existing role-guarded routing preserved
The system SHALL continue to enforce the existing route- and API-level role guards (`ProtectedRoute requiredRoles`, server-side `authorize(...)`) for all data a role-specific dashboard displays; splitting the dashboard component SHALL NOT change what data any role is authorized to see.

#### Scenario: Direct navigation without required role
- **WHEN** an authenticated staff user without the required role for a dashboard section attempts to reach data that section depends on directly (e.g. via a bookmarked API URL)
- **THEN** the server rejects the request per the existing `authorize(...)` middleware, unchanged by this dashboard split
