# Inventory Demand Forecasting — Decision Making

Inventory forecasting uses usage and stock-movement history to predict how much of each item the clinic will need, so that critical supplies do not run out and rarely used items are not overstocked.

Related: [`../ml-system-overview.md`](../ml-system-overview.md) §3 for how the model works.

---

## Available insights

**Reorder alerts** — items running low, ranked by urgency. Replaces manual stock checks and last-minute discoveries.

**Predicted demand per item** — how many units of each medicine, supply, or product are likely to be used in the next 30 days.

**Stock movement history** — how quickly each item is consumed, showing whether usage is accelerating or slowing.

**Category-level demand** — which categories (vaccines, antibiotics, surgical supplies, grooming products) carry the highest demand overall, useful for budget allocation.

**Expiry risk items** — overstocked items approaching expiry, so they can be used before they are wasted.

**Items with inconsistent usage** — products whose consumption varies unpredictably, where extra buffer stock is justified.

---

## Forecasting detail

**Demand prediction per item** — projects requirement from past consumption and seasonal trend.

**Lead time consideration** — accounts for how long an order typically takes to arrive, so the alert fires early enough to prevent a stockout.

**Seasonal adjustment** — usage that rises in particular months, such as flea treatments in summer, is adjusted for automatically.

**Low-stock threshold comparison** — predicted demand is compared against current stock and reorder level to produce a prioritized ordering list.

**Category trend analysis** — identifies which categories are growing in demand, supporting procurement budgeting.

---

## How this helps

**Clinic managers** order at the right time — not so early that cash and storage are tied up, not so late that a stockout hits during a busy period.

**Veterinarians and nurses** have the right medicines and supplies available without interruption to patient care.

**Finance** can see where money is tied up in overstocked items and redirect it.

**Purchasing** becomes data-driven rather than habitual, with every order backed by actual usage.

**Waste falls**, because ordering matches what will realistically be used within a safe window.

---

## In simple terms

The system watches how fast supplies are used, predicts when they will run out, and indicates what to order and when — so the clinic runs without shortages or waste.

> **Items with irregular usage forecast poorly**, and the model flags these rather than hiding the uncertainty. For those, professional judgment about acceptable stockout risk matters more than the projected figure. A critical emergency drug used unpredictably warrants buffer stock the forecast will not justify on consumption alone.