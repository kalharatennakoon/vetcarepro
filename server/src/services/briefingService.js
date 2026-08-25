/**
 * AI Daily Briefing Service
 * Aggregates existing ML model outputs into a role-scoped numeric payload,
 * summarizes it via mlService.summarizeBriefing (Ollama, behind the ML
 * service), and caches the result in ai_briefings.
 *
 * The numeric aggregation (DB/ML calls) is cheap and re-runs on every
 * request, so a same-day change (e.g. a new appointment) is never missed.
 * The Ollama summarization call is the slow part, so it only re-runs when
 * that aggregated data has actually changed since the cached version -
 * tracked via a hash of the data payload in ai_briefings.data_hash.
 *
 * Deliberately outside the RAG pipeline (ml/scripts/rag/) - this is
 * summarization of numbers the caller already has, not retrieval.
 */

import crypto from 'crypto';
import pool from '../config/database.js';
import * as mlService from './mlService.js';
import { getAllAppointments } from '../models/appointmentModel.js';
import { getDiseaseCasesByPetId } from '../models/diseaseCaseModel.js';
import { getRevenueStats } from '../models/billingModel.js';
import { getPetById } from '../models/petModel.js';

// Bounds how many of today's appointments the veterinarian briefing inspects,
// so a busy day doesn't turn into a long chain of per-pet ML calls.
const MAX_VET_APPOINTMENTS = 8;

const todayLocal = () => new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD, local time

const getAgeMonths = (dateOfBirth) => {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  const now = new Date();
  return Math.max(0, (now.getFullYear() - dob.getFullYear()) * 12 + now.getMonth() - dob.getMonth());
};

const settledValue = (result) => (result.status === 'fulfilled' ? result.value : null);

const hasContent = (data) => Object.values(data).some((v) => {
  if (v === undefined || v === null) return false;
  if (Array.isArray(v)) return v.length > 0;
  return true;
});

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------

const hashData = (data) => crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');

const getCachedBriefing = async (userId, briefingDate) => {
  const result = await pool.query(
    'SELECT content, data_hash FROM ai_briefings WHERE user_id = $1 AND briefing_date = $2',
    [userId, briefingDate]
  );
  return result.rows[0] || null;
};

const cacheBriefing = async (userId, role, briefingDate, content, dataHash) => {
  await pool.query(
    `INSERT INTO ai_briefings (user_id, role, briefing_date, content, data_hash)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (user_id, briefing_date)
     DO UPDATE SET content = EXCLUDED.content, role = EXCLUDED.role, data_hash = EXCLUDED.data_hash`,
    [userId, role, briefingDate, JSON.stringify(content), dataHash]
  );
};

// ---------------------------------------------------------------------------
// Per-role aggregation (numeric data only - the LLM never sees raw SQL rows)
// ---------------------------------------------------------------------------

const buildAdminData = async () => {
  const [forecastRes, topServicesRes, reorderRes, outbreakRes, pandemicRes] = await Promise.allSettled([
    mlService.forecastSales({ periods: 30 }),
    mlService.getTopRevenueServices({ limit: 3 }),
    mlService.getReorderSuggestions(),
    mlService.getOutbreakTrend({ days_ahead: 30 }),
    mlService.getPandemicRisk()
  ]);

  const data = {};

  const forecast = settledValue(forecastRes)?.forecast;
  if (Array.isArray(forecast) && forecast.length > 1) {
    const first = forecast[0].predicted_revenue;
    const last = forecast[forecast.length - 1].predicted_revenue;
    data.revenue_forecast_trend = first > 0
      ? `${Math.round(((last - first) / first) * 100)}% change projected over the next ${forecast.length} days`
      : undefined;
  }

  const topServices = settledValue(topServicesRes)?.top_services;
  if (Array.isArray(topServices) && topServices.length) {
    data.top_revenue_services = topServices.map((s) => s.item_name);
  }

  const reorderSummary = settledValue(reorderRes)?.recommendations?.summary;
  if (reorderSummary) {
    data.reorder_alert_count = (reorderSummary.urgent_count || 0) + (reorderSummary.upcoming_count || 0);
  }

  const outbreak = settledValue(outbreakRes)?.trend;
  if (outbreak && (outbreak.trend_direction || outbreak.growth_rate_pct)) {
    data.outbreak_trend = {
      direction: outbreak.trend_direction,
      growth_rate_pct: outbreak.growth_rate_pct
    };
  }

  const pandemic = settledValue(pandemicRes)?.assessment;
  if (pandemic?.pandemic_level) {
    data.pandemic_risk_level = pandemic.pandemic_level;
  }

  return data;
};

const buildVetData = async (user) => {
  const date = todayLocal();
  const appointments = await getAllAppointments({
    date,
    veterinarian_id: user.user_id,
    limit: MAX_VET_APPOINTMENTS
  });

  const flaggedPetRisks = [];
  for (const appt of appointments) {
    try {
      const pet = await getPetById(appt.pet_id);
      if (!pet) continue;

      const diseaseCases = await getDiseaseCasesByPetId(appt.pet_id);
      if (diseaseCases.length === 0) continue; // no history -> nothing to assess, matches PetHealthPredictions.jsx

      const pastDiseases = diseaseCases.map((c) => ({
        disease_name: c.disease_name,
        disease_category: c.disease_category
      }));

      const riskRes = await mlService.predictPetRisk({
        pet_id: appt.pet_id,
        species: pet.species,
        breed: pet.breed || null,
        age_months: getAgeMonths(pet.date_of_birth),
        past_diseases: pastDiseases,
        time_horizons: [12]
      });

      const topRisk = riskRes?.prediction?.top_risks?.[0];
      if (topRisk && topRisk.risk_level !== 'low') {
        flaggedPetRisks.push({
          pet_name: pet.pet_name,
          appointment_time: appt.appointment_time,
          risk_level: topRisk.risk_level,
          risk_category: topRisk.category
        });
      }
    } catch (err) {
      // Best-effort per pet - one failed lookup shouldn't blank the whole briefing.
      console.error(`Briefing: pet risk lookup failed for pet ${appt.pet_id}:`, err.message);
    }
  }

  const outbreak = await mlService.getOutbreakTrend({ days_ahead: 30 })
    .then((r) => r?.trend)
    .catch(() => null);

  const data = {
    todays_appointment_count: appointments.length,
    flagged_pet_risks: flaggedPetRisks
  };

  if (outbreak && (outbreak.trend_direction || outbreak.growth_rate_pct)) {
    data.disease_trend = {
      direction: outbreak.trend_direction,
      growth_rate_pct: outbreak.growth_rate_pct
    };
  }

  return data;
};

const buildReceptionistData = async () => {
  const date = todayLocal();
  const [appointments, reorderRes, revenueStats] = await Promise.all([
    getAllAppointments({ date }),
    mlService.getReorderSuggestions().catch(() => null),
    getRevenueStats().catch(() => null)
  ]);

  const reorderSummary = reorderRes?.recommendations?.summary;

  const data = {
    todays_appointment_count: appointments.length
  };

  if (reorderSummary) {
    data.reorder_suggestions_count = (reorderSummary.urgent_count || 0) + (reorderSummary.upcoming_count || 0);
  }

  if (revenueStats?.total_pending !== undefined && revenueStats?.total_pending !== null) {
    data.outstanding_balance_total = Number(revenueStats.total_pending);
  }

  return data;
};

const BUILDERS = {
  admin: buildAdminData,
  veterinarian: buildVetData,
  receptionist: buildReceptionistData
};

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

/**
 * @param {Object} user - req.user (must include user_id and role)
 * @returns {Promise<{ summary: string|null, bullets: string[], cached: boolean, unavailable?: boolean }>}
 */
export const getBriefing = async (user) => {
  const builder = BUILDERS[user.role];
  if (!builder) {
    throw new Error(`No briefing available for role: ${user.role}`);
  }

  const date = todayLocal();
  const data = await builder(user);
  const dataHash = hashData(data);

  const cached = await getCachedBriefing(user.user_id, date);
  if (cached && cached.data_hash === dataHash) {
    return { ...cached.content, cached: true };
  }

  if (!hasContent(data)) {
    const empty = { summary: 'Nothing notable to report today.', bullets: [] };
    await cacheBriefing(user.user_id, user.role, date, empty, dataHash);
    return { ...empty, cached: false };
  }

  const summarizeRes = await mlService.summarizeBriefing({ role: user.role, data });
  if (!summarizeRes.success || !summarizeRes.data?.success) {
    // Ollama unreachable or summarization failed - degrade gracefully, don't cache a failure
    // so the next request retries rather than being stuck with "unavailable" for the rest of the day.
    return { summary: null, bullets: [], unavailable: true, cached: false };
  }

  const content = summarizeRes.data.briefing;
  await cacheBriefing(user.user_id, user.role, date, content, dataHash);
  return { ...content, cached: false };
};
