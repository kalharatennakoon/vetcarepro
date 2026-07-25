# RAG Assistant — Structured Query Coverage

Questions matching these patterns are answered with an exact SQL lookup instead of semantic RAG retrieval, to avoid hallucinated counts/lists. Anything not listed here falls back to normal RAG.

## Pets
- Count pets by name — *"how many pets are named Max?"*
- Count pets owned by a customer — *"how many pets does John Doe have?"*

## Staff
- Count staff by role — *"how many veterinarians do we have?"*, *"how many receptionists?"*

## Medical Records
- List records for a specific pet — *"list medical records for pet Max"* (*list medical records for pet Max. owner is nishantha rajapaksa*)
- List records for a customer's pets — *"show history for pets of Jane Doe"*

## Vaccinations
- List vaccinations for a pet — *"what vaccines has pet Max had?"*
- Count vaccinations for a pet — *"how many vaccines has Max received?"*

## Inventory
- Low stock items — *"which items are low on stock?"*
- Out of stock items — *"what's out of stock?"*
- Expiring items — *"what's expiring in the next 30 days?"*

## Appointments
- Count by timeframe — *"how many appointments today?"*, *"...this month?"*
- Count no-shows — *"how many no-shows this month?"*
- Count by veterinarian — *"how many appointments does Dr. Silva have?"*
- Count by status — *"how many appointments are cancelled?"*

## Disease Cases
- Contagious case count — *"how many contagious cases are there?"*
- Count by category — *"how many infectious cases?"*
- Count by severity — *"how many critical cases this month?"*

## Billing
- Unpaid bills — *"how many unpaid bills are there?"*
- Revenue by timeframe — *"what's the total revenue this month?"*
- Count by payment method — *"how many bills were paid by cash?"*

---

**Access note:** Inventory, appointments, disease case, and billing queries are staff-only (admin / veterinarian / receptionist). Pet owners asking these fall back to normal RAG rather than seeing clinic-wide operational data.

**Not covered (by design, left to RAG):** FAQs/policies, "explain this diagnosis/forecast" style questions, open-ended clinical questions about a specific case.