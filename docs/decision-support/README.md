# Decision Support

How to act on the output of each predictive model — written for the staff who read the numbers, not the developers who trained them.

For how the models work, see [`../ml-system-overview.md`](../ml-system-overview.md). For the underlying API, see [`../api/README.md`](../api/README.md).

---

## Contents

| Guide | Model |
|---|---|
| [`disease-analytics.md`](disease-analytics.md) | Disease prediction and outbreak risk (`ml-system-overview.md` §1) |
| [`sales-forecasting.md`](sales-forecasting.md) | Revenue forecasting (`ml-system-overview.md` §2) |
| [`inventory-forecasting.md`](inventory-forecasting.md) | Inventory demand forecasting (`ml-system-overview.md` §3) |

Each guide follows the same shape: available insights, forecasting detail, who it helps, and a plain-language summary with the one caveat that matters most for that model.

---

## Shared caveat

Every model here describes the past, not the future. A forecast, risk score, or category suggestion is decision support for a professional judgement — never a diagnosis, and never a substitute for one. See [`../SCOPE.md`](../SCOPE.md) §4.7.
