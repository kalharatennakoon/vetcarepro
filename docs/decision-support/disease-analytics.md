# Disease Analytics — Decision Making

Disease analytics examines the clinic's history of illness cases to identify patterns, assess risk, and support timely action.

Related: [`../ml-system-overview.md`](../ml-system-overview.md) §1 for how the model works.

---

## Available insights

**Most common diseases** — which illnesses appear most frequently across all patients, helping the clinic stay prepared with the right medicines and equipment.

**Disease trends over time** — whether a condition is increasing or decreasing month by month. Useful for spotting seasonal outbreaks early.

**Affected species and breeds** — which animal types are most at risk for specific conditions, helping veterinarians tailor their examination approach.

**Age-related patterns** — whether a disease mostly affects young, adult, or senior animals, supporting age-based preventive advice.

**Contagious disease tracking** — all cases flagged as contagious, so isolation and hygiene measures can be taken before an outbreak spreads.

**Treatment outcome patterns** — which treatments were used for similar cases and how patients responded.

---

## Prediction detail

**Disease risk prediction** — from an animal's species, breed, age, symptoms, and history, the system estimates the likelihood of specific conditions. This is a starting point before running tests.

**Cluster-based grouping** — animals with similar health profiles are grouped automatically. If one develops a condition, others in the group warrant closer monitoring.

**Early warning signals** — flags when case numbers for a disease rise faster than normal, prompting preparation.

**High-risk patient identification** — patients matching profiles associated with past serious conditions are flagged for prioritized follow-up.

---

## Outbreak risk — choosing a time period

The selected period determines how far back the system looks. Different windows serve different surveillance purposes.

| Period | Primary use |
|---|---|
| Last 30 days | Acute outbreaks and fast-spreading contagious disease |
| Last 60 days | Short-term contagious disease monitoring |
| Last 90 days | Quarterly surveillance review |
| Last 6 months | Seasonal pattern detection |
| Last 1 year | Full seasonal cycle; year-over-year baseline |
| Last 2 years | Multi-year endemic trends; vaccination programme effectiveness |
| Last 5 years | Long-term rare disease surveillance; breed susceptibility patterns |

Longer periods give the model more data and improve accuracy, particularly for infrequent or multi-year-cycle diseases. **At least one year of data is recommended for a reliable outbreak risk assessment.**

A short window on a thin dataset produces a volatile figure — a handful of cases can swing it substantially. Where the window is short and the history limited, read the direction of movement rather than the number.

---

## How this helps

**Veterinarians** reach faster, more confident assessments by seeing which conditions are most likely given the animal's profile and presenting signs.

**Clinic managers** plan staffing and stock around disease peaks and seasonal patterns.

**Receptionists** can advise owners on common risks for their pet's species or breed when booking.

**The whole team** gains a clinic-wide picture rather than a case-by-case one.

---

## In simple terms

Instead of relying only on memory and individual experience, the clinic can draw on every case ever recorded to make faster and more consistent decisions.

> **A category suggestion is not a diagnosis.** The model reports which conditions resemble past cases with similar characteristics. It has not examined the animal. Clinical judgment decides.