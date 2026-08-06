# Sales Forecasting — Decision Making

Sales forecasting uses billing and revenue history to project income for coming weeks and months, and shows which services and products drive it.

Related: [`../ml-system-overview.md`](../ml-system-overview.md) §2 for how the model works.

---

## Available insights

**Predicted revenue for upcoming periods** — an estimated figure for the next 30, 60, or 90 days, supporting budgeting and financial planning.

**Revenue trends over time** — how income has changed month by month, making slow and strong periods visible.

**Top performing services** — which services (consultations, surgeries, vaccinations, grooming) bring in the most revenue.

**Top performing products** — which inventory items and medications sell most frequently and contribute most to income.

**Month-by-month comparison** — any selected month against the same period last year, showing whether the clinic is growing.

**Busy versus slow periods** — recurring patterns in clinic activity, useful for planning promotions, staffing, and appointment capacity.

---

## Forecasting detail

**Time-series forecasting** — projects future income with a confidence range, so the clinic sees a likely band rather than a single number.

**Seasonal pattern detection** — recurring patterns such as higher tick treatment in summer or respiratory conditions in winter are detected and factored in automatically.

**Service demand prediction** — indicates which services are likely to see higher demand, supporting allocation of veterinary time.

**Revenue impact of changes** — shows how a change in service mix or pricing could affect revenue over time.

---

## Reading the confidence range

The forecast reports upper and lower bounds alongside the central estimate. **The range is the more useful figure**, and a wide one is informative rather than a defect — it indicates genuinely variable revenue, which is itself worth knowing when planning cash flow.

Treat the lower bound as the planning figure for commitments that must be met regardless, and the central estimate for expectations.

---

## How this helps

**Owners and managers** plan cash flow, manage expenses, and make hiring decisions from a forecast rather than guesswork.

**Veterinarians** see which services clients value most, informing where to invest training or equipment.

**Receptionists** use busy-period predictions to prepare the appointment book and reduce peak-time overbooking.

**Marketing** becomes easier to time — a forecast slow period is the right moment for promotions or recall reminders.

---

## In simple terms

Rather than waiting until month-end to see how the clinic performed, forecasting gives a forward view — so the team can plan ahead and avoid surprises.

> **A forecast assumes the future resembles the past.** It cannot anticipate a new competitor, a change in local conditions, or anything without precedent in the clinic's history. It is a well-informed extrapolation, not a prediction.