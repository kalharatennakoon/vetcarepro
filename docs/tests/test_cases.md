# VetCare Pro — Manual Test Cases
**System:** Pro Pet Animal Hospital — VetCare Pro
**Test Environment:** localhost (React + Node.js + PostgreSQL + Flask ML)

---

## Test Accounts

| Role | Email | Password |
|---|---|---|
| Admin | admin1@propet.lk | admin1@pass |
| Vet | vet1@propet.lk | vet1@pass |
| Receptionist | reception1@propet.lk | reception1@pass |

---

## TC001 — Valid Admin Login

| Field | Detail |
|---|---|
| **Module** | Authentication |
| **Input** | Email: `admin1@propet.lk`, Password: `admin1@pass` |
| **Expected Result** | Redirected to Dashboard. Top-right shows admin name (no prefix). |
| **Actual Result** | *(screenshot)* |
| **Status** | Pass / Fail |

---

## TC002 - Valid Vet Login

| Field | Detail |
|---|---|
| **Module** | Authentication |
| **Input** | Email: `vet1@propet.lk`, Password: `vet1@pass` |
| **Expected Result** | Redirected to Dashboard. Vet-only nav items visible. Admin-only items hidden. |
| **Actual Result** | *(screenshot)* |
| **Status** | Pass / Fail |

---

## TC003 - Valid Receptionist Login

| Field | Detail |
|---|---|
| **Module** | Authentication |
| **Input** | Email: `reception1@propet.lk`, Password: `reception1@pass` |
| **Expected Result** | Redirected to Dashboard. Analytics and Users nav items not visible. |
| **Actual Result** | *(screenshot)* |
| **Status** | Pass / Fail |

---

## TC004 - Invalid Login Credentials

| Field | Detail |
|---|---|
| **Module** | Authentication |
| **Input** | Email: `admin1@propet.lk`, Password: `wrongpassword` |
| **Expected Result** | Error message displayed. User remains on login page. |
| **Actual Result** | *(screenshot)* |
| **Status** | Pass / Fail |

---

## TC005 - Create New Pet

| Field | Detail |
|---|---|
| **Module** | Pet Management |
| **Pre-condition** | Logged in as Admin, Veterinarian, or Receptionist |
| **Input** | Name: `Duke`, Species: `Dog`, Breed: `Labrador`, DOB: `2022-01-15`, Owner: select existing owner |
| **Expected Result** | Pet created successfully. Appears in pet list with assigned Pet ID. |
| **Actual Result** | *(screenshot)* |
| **Status** | Pass / Fail |

---

## TC006 - View Pet Profile

| Field | Detail |
|---|---|
| **Module** | Pet Management |
| **Pre-condition** | At least one pet exists |
| **Input** | Click any pet from the pets list |
| **Expected Result** | Pet profile page loads with tabs: Information, Medical History, Vaccinations, Lab Reports, Health Predictions. |
| **Actual Result** | *(screenshot)* |
| **Status** | Pass / Fail |

---

## TC007 - Upload & Delete Pet Image

| Field | Detail |
|---|---|
| **Module** | Pet Management |
| **Pre-condition** | Logged in as Admin, Veterinarian, or Receptionist. Pet profile open. |
| **Input** | Upload a valid image file (JPG/PNG). Then click Delete Image → confirm in modal. |
| **Expected Result** | Image uploads and displays. On delete, confirmation modal appears. After confirm, image is removed and placeholder shown. |
| **Actual Result** | *(screenshot)* |
| **Status** | Pass / Fail |

---

## TC008 - Edit Pet Details

| Field | Detail |
|---|---|
| **Module** | Pet Management |
| **Pre-condition** | Logged in as Admin, Veterinarian, or Receptionist. Pet profile open. |
| **Input** | Edit pet name. Save changes. |
| **Expected Result** | Changes saved. Updated values displayed on pet profile. |
| **Actual Result** | *(screenshot)* |
| **Status** | Pass / Fail |

---

## TC009 - Create Appointment

| Field | Detail |
|---|---|
| **Module** | Appointments |
| **Pre-condition** | Logged in as Admin, Vet, or Receptionist |
| **Input** | Select pet, vet, date, time, and reason. Submit. |
| **Expected Result** | Appointment created. Appears in appointments list with status `Scheduled`. |
| **Actual Result** | *(screenshot)* |
| **Status** | Pass / Fail |

---

## TC010 - Update Appointment Status

| Field | Detail |
|---|---|
| **Module** | Appointments |
| **Pre-condition** | At least one appointment exists |
| **Input** | Open appointment. Change status to `Completed`. Save. |
| **Expected Result** | Status updated to `Completed`. Change reflected in list view. |
| **Actual Result** | *(screenshot)* |
| **Status** | Pass / Fail |

---

## TC011 - Cancel Appointment

| Field | Detail |
|---|---|
| **Module** | Appointments |
| **Pre-condition** | Logged in as Admin, Veterinarian, or Receptionist |
| **Input** | Click cancel on an appointment. Confirm in the modal. |
| **Expected Result** | Confirmation modal appears. |
| **Actual Result** | *(screenshot)* |
| **Status** | Pass / Fail |

---

## TC012 - Create Bill

| Field | Detail |
|---|---|
| **Module** | Billing |
| **Pre-condition** | Logged in as Admin, Veterinarian, or Receptionist. |
| **Input** | Select customer, add one or more service items and quantity. Submit. |
| **Expected Result** | Bill created. Appears in billing list with status `Unpaid` and correct total. |
| **Actual Result** | *(screenshot)* |
| **Status** | Pass / Fail |

---

## TC013 - Update Payment Status

| Field | Detail |
|---|---|
| **Module** | Billing |
| **Pre-condition** | An unpaid bill exists |
| **Input** | Open bill. Change payment status to `Fully Paid`. Save. |
| **Expected Result** | Status updated to `Fully Paid`. Reflected in bill detail and list. |
| **Actual Result** | *(screenshot)* |
| **Status** | Pass / Fail |

---

## TC014 — Cancel Bill

| Field | Detail |
|---|---|
| **Module** | Billing |
| **Pre-condition** | Logged in as Admin |
| **Input** | Click cancel on a bill. Select the reason and confirm. |
| **Expected Result** | After confirming, bill is labelled as cancelled. |
| **Actual Result** | *(screenshot)* |
| **Status** | Pass / Fail |

---

## TC015 - Upload Lab Report to Pet Profile

| Field | Detail |
|---|---|
| **Module** | Lab Reports |
| **Pre-condition** | Logged in as Admin or Vet. Pet profile open. |
| **Input** | Navigate to the pet's Lab Reports tab. Fill in report name, report type, choose file, and notes (optional). Submit. |
| **Expected Result** | Lab report saved and appears under the pet's Lab Reports tab. |
| **Actual Result** | *(screenshot)* |
| **Status** | Pass / Fail |

---

## TC016 - Delete Lab Report

| Field | Detail |
|---|---|
| **Module** | Lab Reports |
| **Pre-condition** | At least one lab report exists on a pet profile |
| **Input** | Navigate to the pet's Lab Reports tab. Click delete on a lab report. Confirm in modal. |
| **Expected Result** | Confirmation modal appears. After confirming, report is removed from the pet's Lab Reports tab. |
| **Actual Result** | *(screenshot)* |
| **Status** | Pass / Fail |

---

## TC017 - Create Medical Record

| Field | Detail |
|---|---|
| **Module** | Medical Records |
| **Pre-condition** | Logged in as Admin or Vet |
| **Input** | Select pet, related appointment, diagnosis, and treatment. Submit. |
| **Expected Result** | Medical record created. Appears under the pet's Medical Records tab. |
| **Actual Result** | *(screenshot)* |
| **Status** | Pass / Fail |

---

## TC018 - View Medical Record Detail

| Field | Detail |
|---|---|
| **Module** | Medical Records |
| **Pre-condition** | At least one medical record exists |
| **Input** | Click on a medical record from the pet profile. |
| **Expected Result** | Full record detail page loads showing diagnosis, treatment, vet name, and date. |
| **Actual Result** | *(screenshot)* |
| **Status** | Pass / Fail |

---

## TC019 - Create Disease Case

| Field | Detail |
|---|---|
| **Module** | Disease Cases |
| **Pre-condition** | Logged in as Admin or Vet |
| **Input** | Select pet, disease name, category, severity, is contagious, diagnosis date. Submit. |
| **Expected Result** | Disease case created with assigned Case ID. Appears in the Disease Cases list. |
| **Actual Result** | *(screenshot)* |
| **Status** | Pass / Fail |

---

## TC020 - Filter Disease Cases

| Field | Detail |
|---|---|
| **Module** | Disease Cases |
| **Pre-condition** | Multiple disease cases exist |
| **Input** | Apply filter: Species = `Dog`, Severity = `Severe` |
| **Expected Result** | List updates to show only dog cases with severe severity. Other cases hidden. |
| **Actual Result** | *(screenshot)* |
| **Status** | Pass / Fail |

---

## TC021 - Delete Disease Case

| Field | Detail |
|---|---|
| **Module** | Disease Cases |
| **Pre-condition** | Logged in as Admin |
| **Input** | Open a disease case. Click delete. Enter deletion reason. Confirm in modal. |
| **Expected Result** | Confirmation modal with reason field appears. After confirming, case is removed. |
| **Actual Result** | *(screenshot)* |
| **Status** | Pass / Fail |

---

## TC022 - Disease Analytics: Statistics & Assessment

| Field | Detail |
|---|---|
| **Module** | Disease Analytics |
| **Pre-condition** | Logged in as Admin or Vet. Navigate to Analytics → Disease Analytics tab → Show Detailed Insights. |
| **Input** | Set Historical Period to `Last 1 year`. |
| **Expected Result** | Statistics cards update (Total Cases, Affected Pets, Contagious, Recovery Rate). Disease Activity Assessment card shows score, contributing factors, and recommendation. |
| **Actual Result** | *(screenshot)* |
| **Status** | Pass / Fail |

---

## TC023 — Disease Activity Forecast: Generate

| Field | Detail |
|---|---|
| **Module** | Disease Analytics |
| **Pre-condition** | Logged in as Admin or Vet. ML service running. Disease model trained. |
| **Input** | Set Forecast Period to `1 year`. Click `Generate Forecast`. |
| **Expected Result** | Confidence badge appears. Pandemic Risk index shown. 4 summary cards populated. Monthly forecast table shows predicted cases and disease activity level per month. Peak Clinical Month card shows the most clinically active month with hint. |
| **Actual Result** | *(screenshot)* |
| **Status** | Pass / Fail |

---

## TC024 - Train Disease Prediction Model

| Field | Detail |
|---|---|
| **Module** | Disease Analytics |
| **Pre-condition** | Logged in as Admin. ML service running. |
| **Input** | Click `Train Model` button in Disease Analytics tab. |
| **Expected Result** | Training initiates. Success message shown. Model status updates with new training date and confidence level. |
| **Actual Result** | *(screenshot)* |
| **Status** | Pass / Fail |

---

## TC025 — Sales Forecast: Generate

| Field | Detail |
|---|---|
| **Module** | Sales Forecasting |
| **Pre-condition** | Logged in as Admin. ML service running. Sales model trained. |
| **Input** | Set Forecast Period to `60 days`. Click `Generate`. |
| **Expected Result** | Monthly revenue forecast table populates with predicted revenue, lower and upper bounds. Revenue trends and top services cards update accordingly. |
| **Actual Result** | *(screenshot)* |
| **Status** | Pass / Fail |

---

## TC026 - Train Sales Forecasting Model

| Field | Detail |
|---|---|
| **Module** | Sales Forecasting |
| **Pre-condition** | Logged in as Admin. ML service running. |
| **Input** | Click `Train Model` in the Sales Forecasting tab. |
| **Expected Result** | Training completes for sales model only. Disease and inventory models unaffected. Success message shown. |
| **Actual Result** | *(screenshot)* |
| **Status** | Pass / Fail |

---

## TC027 - Inventory Stock Alerts

| Field | Detail |
|---|---|
| **Module** | Inventory |
| **Pre-condition** | Logged in as Admin or Receptionist. At least one item with low/zero stock or near expiry exists. |
| **Input** | Navigate to the Inventory page and review item statuses. |
| **Expected Result** | Items marked `Out of Stock` (quantity = 0), `Low Stock` (quantity at or below reorder level), and `Expiring Soon` (expiry date within 90 days) are flagged with the correct status badge. Items within normal range show no alert. |
| **Actual Result** | *(screenshot)* |
| **Status** | Pass / Fail |

---

## TC028 — Train Inventory Forecasting Model

| Field | Detail |
|---|---|
| **Module** | Inventory Demand |
| **Pre-condition** | Logged in as Admin. ML service running. |
| **Input** | Click `Train Model` in the Inventory Demand tab. |
| **Expected Result** | Training completes for inventory model only. Disease and sales models unaffected. Success message shown. |
| **Actual Result** | *(screenshot)* |
| **Status** | Pass / Fail |

---

## TC029 - Role-Based Access: Receptionist Cannot Access Analytics

| Field | Detail |
|---|---|
| **Module** | Role-Based Access Control |
| **Pre-condition** | Logged in as Receptionist |
| **Input** | Attempt to navigate to `/analytics` directly via browser address bar. |
| **Expected Result** | Access denied. User redirected to Dashboard or an unauthorised page. Analytics tab not visible in navigation. |
| **Actual Result** | *(screenshot)* |
| **Status** | Pass / Fail |

---

## TC030 - Role-Based Access: Vet Cannot Access User Management

| Field | Detail |
|---|---|
| **Module** | Role-Based Access Control |
| **Pre-condition** | Logged in as Vet |
| **Input** | Attempt to navigate to `/users` directly via browser address bar. |
| **Expected Result** | Access denied. Users page not visible in navigation. Vet redirected away. |
| **Actual Result** | *(screenshot)* |
| **Status** | Pass / Fail |

---

## TC031 - Add New User

| Field | Detail |
|---|---|
| **Module** | User Management |
| **Pre-condition** | Logged in as Admin. Navigate to Staff page. |
| **Input** | Click Add User. Enter first name, last name, email, role (`Veterinarian`), and password. Submit. |
| **Expected Result** | New user created. Appears in the users list with the correct role badge. User can log in using the provided credentials. |
| **Actual Result** | *(screenshot)* |
| **Status** | Pass / Fail |

---

## TC032 - Edit User Details

| Field | Detail |
|---|---|
| **Module** | User Management |
| **Pre-condition** | Logged in as Admin. At least one non-admin user exists. |
| **Input** | Click edit on a user. Change their phone number or role. Save. |
| **Expected Result** | Changes saved. Updated values reflected in the user list and user detail view. |
| **Actual Result** | *(screenshot)* |
| **Status** | Pass / Fail |

---

## TC033 - Deactivate User

| Field | Detail |
|---|---|
| **Module** | User Management |
| **Pre-condition** | Logged in as Admin. At least one non-admin user exists. |
| **Input** | Click deactivate on a user and confirm. |
| **Expected Result** | After confirming, user is marked as inactive in the list and can no longer log in. |
| **Actual Result** | *(screenshot)* |
| **Status** | Pass / Fail |

---

## TC034 - Send Appointment Confirmation Email

| Field | Detail |
|---|---|
| **Module** | Email |
| **Pre-condition** | A confirmed appointment exists. The pet owner has a valid email on their customer record. |
| **Input** | Open the appointment detail. Click `Send Email`. |
| **Expected Result** | Success notification shown. Owner receives a confirmation email containing the appointment date, time, pet name, and vet name. |
| **Actual Result** | *(screenshot)* |
| **Status** | Pass / Fail |

---

## TC035 - Generate and Export Report

| Field | Detail |
|---|---|
| **Module** | Reports |
| **Pre-condition** | Logged in as Admin or Vet. Navigate to the Reports page. |
| **Input** | Select report type `Appointment Statistics`. Set a date range. Click `Export PDF`. Then click `Save`. |
| **Expected Result** | Report data loads correctly for the selected date range. Export opens a formatted view or downloads a PDF file. |
| **Actual Result** | *(screenshot)* |
| **Status** | Pass / Fail |

---

## TC036 - View System Activity Logs

| Field | Detail |
|---|---|
| **Module** | System Logs |
| **Pre-condition** | Logged in as Admin. Navigate to System Logs. |
| **Input** | Browse the logs list. Apply a filter by action type or user. |
| **Expected Result** | Logs display user activity (logins, record changes, deletions) with timestamps and user names. Filter narrows results correctly. |
| **Actual Result** | *(screenshot)* |
| **Status** | Pass / Fail |

---

## TC037 - User Logout

| Field | Detail |
|---|---|
| **Module** | Authentication |
| **Pre-condition** | Logged in as any role |
| **Input** | Click the logout button or user menu → Logout. |
| **Expected Result** | Session ends. User is redirected to the login page. Attempting to navigate back via browser history does not restore the session. |
| **Actual Result** | *(screenshot)* |
| **Status** | Pass / Fail |

---

## Summary

| TC ID | Test Case Name | Status |
|---|---|---|
| TC001 | Valid Admin Login | Pass |
| TC002 | Valid Vet Login | Pass |
| TC003 | Valid Receptionist Login | Pass |
| TC004 | Invalid Login Credentials | Pass |
| TC005 | Create New Pet | Pass |
| TC006 | View Pet Profile | Pass |
| TC007 | Upload & Delete Pet Image | Pass |
| TC008 | Edit Pet Details | Pass |
| TC009 | Create Appointment | Pass |
| TC010 | Update Appointment Status | Pass |
| TC011 | Delete Appointment | Pass |
| TC012 | Create Bill | Pass |
| TC013 | Update Payment Status | Pass |
| TC014 | Delete Bill | Pass |
| TC015 | Upload Lab Report to Pet Profile | Pass |
| TC016 | Delete Lab Report | Pass |
| TC017 | Create Medical Record | Pass |
| TC018 | View Medical Record Detail | Pass |
| TC019 | Create Disease Case | Pass |
| TC020 | Filter Disease Cases | Pass |
| TC021 | Delete Disease Case | Pass |
| TC022 | Disease Analytics — Statistics & Assessment | Pass |
| TC023 | Disease Activity Forecast — Generate | Pass |
| TC024 | Train Disease Prediction Model | Pass |
| TC025 | Sales Forecast — Generate | Pass |
| TC026 | Train Sales Forecasting Model | Pass |
| TC027 | Inventory Stock Alerts | Pass |
| TC028 | Train Inventory Forecasting Model | Pass |
| TC029 | Receptionist Cannot Access Analytics | Pass |
| TC030 | Vet Cannot Access User Management | Pass |
| TC031 | Add New User | Pass |
| TC032 | Edit User Details | Pass |
| TC033 | Deactivate User | Pass |
| TC034 | Send Appointment Confirmation Email | Pass |
| TC035 | Generate and Export Report | Pass |
| TC036 | View System Activity Logs | Pass |
| TC037 | User Logout | Pass |

**Total: 37 | Passed: 37 | Failed: 0**
