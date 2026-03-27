import { useState, useRef, useEffect} from 'react';
import { predictPetRisk, predictCancerRisk, getDiseaseCasesByPet } from '../services/diseaseCaseService';

const RISK_COLOR = {
  high:    { bg: '#fee2e2', color: '#dc2626', border: '#fecaca' },
  medium:  { bg: '#fef3c7', color: '#d97706', border: '#fde68a' },
  low:     { bg: '#dcfce7', color: '#16a34a', border: '#bbf7d0' },
  monitor: { bg: '#f3f4f6', color: '#6b7280', border: '#e5e7eb' },
  unknown: { bg: '#f3f4f6', color: '#6b7280', border: '#e5e7eb' },
};

const TIME_LABELS = { '1mo': 'Next 1 Month', '6mo': 'Next 6 Months', '12mo': 'Next 1 Year', '24mo': 'Next 2 Years' };

const PetHealthPredictions = ({ pet }) => {
  const [loading, setLoading] = useState(false);
  const [diseaseRisk, setDiseaseRisk] = useState(null);
  const [cancerRisk, setCancerRisk] = useState(null);
  const [error, setError] = useState('');
  const errorRef = useRef(null);

  useEffect(() => {
    if (error) errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [error]);
  const [ran, setRan] = useState(false);
  const [noRecords, setNoRecords] = useState(false);

  const getAgeMonths = () => {
    if (!pet?.date_of_birth) return null;
    const dob = new Date(pet.date_of_birth);
    const now = new Date();
    return Math.max(0, (now.getFullYear() - dob.getFullYear()) * 12 + now.getMonth() - dob.getMonth());
  };

  const runPredictions = async () => {
    if (!pet) return;
    setLoading(true);
    setError('');
    setNoRecords(false);
    try {
      const ageMonths = getAgeMonths();
      let pastDiseases = [];
      try {
        const casesRes = await getDiseaseCasesByPet(pet.pet_id);
        pastDiseases = (casesRes?.data?.cases || []).map(c => ({
          disease_name: c.disease_name,
          disease_category: c.disease_category,
        }));
      } catch (_) {}

      if (pastDiseases.length === 0) {
        setDiseaseRisk(null);
        setCancerRisk(null);
        setNoRecords(true);
        setRan(true);
        return;
      }

      const payload = {
        pet_id: pet.pet_id,
        species: pet.species,
        breed: pet.breed || null,
        age_months: ageMonths,
        past_diseases: pastDiseases,
        time_horizons: [1, 6, 12, 24],
      };

      const [riskRes, cancerRes] = await Promise.all([
        predictPetRisk(payload),
        predictCancerRisk({ pet_id: pet.pet_id, species: pet.species, breed: pet.breed || null, age_months: ageMonths, sex: pet.gender || null }),
      ]);

      setDiseaseRisk(riskRes.prediction || null);
      setCancerRisk(cancerRes.assessment || null);
      setRan(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Prediction failed. Ensure the ML service is running.');
    } finally {
      setLoading(false);
    }
  };

  const ageMonths = getAgeMonths();
  const ageDisplay = ageMonths != null
    ? ageMonths >= 24 ? `${Math.floor(ageMonths / 12)} yr ${ageMonths % 12} mo` : `${ageMonths} mo`
    : 'Unknown age';

  return (
    <div style={s.container}>
      {/* Header */}
      <div style={s.header}>
        <div>
          <h2 style={s.title}>
            <i className="fas fa-brain" style={{ marginRight: '0.5rem', color: '#7c3aed' }}></i>
            Health Risk Predictions
          </h2>
          <p style={s.subtitle}>
            {pet.pet_name} · {pet.species}{pet.breed ? ` · ${pet.breed}` : ''} · {ageDisplay}
          </p>
        </div>
        <button onClick={runPredictions} disabled={loading} style={s.runBtn}>
          {loading
            ? <><i className="fas fa-spinner fa-spin" style={{ marginRight: '0.4rem' }}></i>Running...</>
            : <><i className="fas fa-play" style={{ marginRight: '0.4rem' }}></i>{ran ? 'Re-run Predictions' : 'Run Predictions'}</>}
        </button>
      </div>

      {!ran && !loading && (
        <div style={s.emptyState}>
          <i className="fas fa-microscope" style={{ fontSize: '2.5rem', color: '#c4b5fd', marginBottom: '0.75rem' }}></i>
          <p style={{ margin: 0, color: '#6b7280', fontSize: '0.875rem' }}>
            Click <strong>Run Predictions</strong> to generate health risk estimates for {pet.pet_name} based on their own disease history.
          </p>
        </div>
      )}

      {ran && noRecords && !loading && (
        <div style={{ ...s.emptyState, backgroundColor: '#fffbeb', borderColor: '#fde68a' }}>
          <i className="fas fa-folder-open" style={{ fontSize: '2.5rem', color: '#f59e0b', marginBottom: '0.75rem' }}></i>
          <p style={{ margin: 0, color: '#92400e', fontSize: '0.875rem' }}>
            No disease records found for <strong>{pet.pet_name}</strong>. Health predictions require at least one recorded disease case for this pet.
          </p>
        </div>
      )}

      {error && (
        <div ref={errorRef} style={s.error}><i className="fas fa-exclamation-circle" style={{ marginRight: '0.4rem' }}></i>{error}</div>
      )}

      {ran && !loading && (
        <>
          {/* Disease Risk */}
          {diseaseRisk && (
            <div style={s.card}>
              <div style={s.cardHeader}>
                <h3 style={s.cardTitle}>
                  <i className="fas fa-virus" style={{ marginRight: '0.4rem', color: '#6366f1' }}></i>
                  Disease Risk by Category
                  <span style={{ ...s.badge, backgroundColor: '#ede9fe', color: '#7c3aed', marginLeft: '0.5rem' }}>
                    {diseaseRisk.data_confidence} confidence
                  </span>
                </h3>
                <p style={s.hint}>
                  <i className="fas fa-circle-info" style={s.hintIcon}></i>
                  Recurrence likelihood for each disease category based on {pet.pet_name}'s own recorded disease history. More records improve prediction accuracy.
                </p>
              </div>
              <div style={s.cardBody}>
                {diseaseRisk.notes?.length > 0 && (
                  <div style={s.noteBox}>
                    {diseaseRisk.notes.map((n, i) => <p key={i} style={{ margin: '0.1rem 0', fontSize: '0.75rem', color: '#6b7280' }}>{n}</p>)}
                  </div>
                )}

                {diseaseRisk.top_risks?.length > 0 ? (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={s.table}>
                      <thead>
                        <tr style={{ backgroundColor: '#f9fafb' }}>
                          <th style={s.th}>Disease Category</th>
                          <th style={{ ...s.th, textAlign: 'center' }}>Risk Level</th>
                          {['1mo', '6mo', '12mo', '24mo'].map(h => (
                            <th key={h} style={{ ...s.th, textAlign: 'center' }}>{TIME_LABELS[h]}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {diseaseRisk.top_risks.map((r, i) => {
                          const risks = diseaseRisk.risks?.[r.category] || {};
                          const rc = RISK_COLOR[r.risk_level] || RISK_COLOR.low;
                          return (
                            <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                              <td style={{ ...s.td, fontWeight: '600', textTransform: 'capitalize' }}>
                                {r.category.replace(/_/g, ' ')}
                              </td>
                              <td style={{ ...s.td, textAlign: 'center' }}>
                                <span style={{ backgroundColor: rc.bg, color: rc.color, border: `1px solid ${rc.border}`, padding: '0.15rem 0.55rem', borderRadius: '20px', fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase' }}>
                                  {r.risk_level}
                                </span>
                              </td>
                              {['1mo', '6mo', '12mo', '24mo'].map(h => (
                                <td key={h} style={{ ...s.td, textAlign: 'center', color: '#374151', fontWeight: risks[h] > 30 ? '700' : '400' }}>
                                  {risks[h] != null ? `${risks[h]}%` : '—'}
                                </td>
                              ))}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>No risk data available for this species.</p>
                )}
              </div>
            </div>
          )}

          {/* Cancer Risk */}
          {cancerRisk && (
            <div style={s.card}>
              <div style={s.cardHeader}>
                <h3 style={s.cardTitle}>
                  <i className="fas fa-ribbon" style={{ marginRight: '0.4rem', color: '#db2777' }}></i>
                  Cancer / Tumor Risk
                  {cancerRisk.risk_level && cancerRisk.risk_level !== 'unknown' && (
                    <span style={{
                      ...s.badge,
                      backgroundColor: RISK_COLOR[cancerRisk.risk_level]?.bg,
                      color: RISK_COLOR[cancerRisk.risk_level]?.color,
                      marginLeft: '0.5rem'
                    }}>
                      {cancerRisk.risk_level} risk · {cancerRisk.overall_risk_pct}% estimated lifetime
                    </span>
                  )}
                </h3>
                <p style={s.hint}>
                  <i className="fas fa-circle-info" style={s.hintIcon}></i>
                  Based on published veterinary studies for {pet.breed || pet.species} at {ageDisplay}. Accuracy improves once blood panel and biopsy data are available.
                </p>
              </div>
              <div style={s.cardBody}>
                {cancerRisk.notes?.length > 0 && (
                  <div style={s.noteBox}>
                    {cancerRisk.notes.map((n, i) => <p key={i} style={{ margin: '0.1rem 0', fontSize: '0.75rem', color: '#6b7280' }}>{n}</p>)}
                  </div>
                )}

                {cancerRisk.cancer_types?.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.5rem', marginBottom: '1rem' }}>
                    {cancerRisk.cancer_types.map((ct, i) => {
                      const rc = RISK_COLOR[ct.risk_level] || RISK_COLOR.monitor;
                      return (
                        <div key={i} style={{ backgroundColor: rc.bg, border: `1px solid ${rc.border}`, borderRadius: '8px', padding: '0.6rem 0.85rem' }}>
                          <p style={{ margin: '0 0 0.2rem', fontSize: '0.82rem', fontWeight: '600', color: rc.color }}>{ct.type}</p>
                          <p style={{ margin: 0, fontSize: '0.72rem', color: rc.color }}>
                            {ct.risk_pct != null ? `${ct.risk_pct}% estimated` : 'Monitor — data limited'}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}

                {cancerRisk.screening_recommendations?.length > 0 && (
                  <div style={s.recsBox}>
                    <p style={{ margin: '0 0 0.4rem', fontSize: '0.78rem', fontWeight: '700', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      <i className="fas fa-stethoscope" style={{ marginRight: '0.35rem', color: '#7c3aed' }}></i>
                      Screening Recommendations
                    </p>
                    <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
                      {cancerRisk.screening_recommendations.map((r, i) => (
                        <li key={i} style={{ fontSize: '0.82rem', color: '#374151', marginBottom: '0.2rem' }}>{r}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

const s = {
  container: { padding: '0' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' },
  title: { fontSize: '1.1rem', fontWeight: '700', color: '#1f2937', margin: '0 0 0.2rem' },
  subtitle: { fontSize: '0.82rem', color: '#6b7280', margin: 0 },
  runBtn: {
    padding: '0.5rem 1.1rem', backgroundColor: '#7c3aed', color: 'white',
    border: 'none', borderRadius: '8px', cursor: 'pointer',
    fontSize: '0.85rem', fontWeight: '600', display: 'flex', alignItems: 'center',
    whiteSpace: 'nowrap',
  },
  emptyState: {
    textAlign: 'center', padding: '2.5rem 1rem',
    backgroundColor: '#faf5ff', borderRadius: '12px', border: '1px dashed #c4b5fd',
  },
  error: {
    backgroundColor: '#fee2e2', color: '#dc2626', padding: '0.75rem 1rem',
    borderRadius: '8px', marginBottom: '1rem', fontSize: '0.875rem',
    border: '1px solid #fecaca',
  },
  card: {
    backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e5e7eb',
    boxShadow: '0 1px 3px rgba(0,0,0,0.07)', marginBottom: '1rem',
  },
  cardHeader: { borderBottom: '1px solid #e5e7eb', padding: '0.7rem 1.1rem' },
  cardTitle: { fontSize: '0.875rem', fontWeight: '600', color: '#1f2937', margin: 0, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.25rem' },
  cardBody: { padding: '0.9rem 1.1rem' },
  badge: { fontSize: '0.72rem', fontWeight: '600', padding: '0.15rem 0.55rem', borderRadius: '20px' },
  hint: { margin: '0.35rem 0 0', fontSize: '0.73rem', color: '#6b7280', lineHeight: '1.5' },
  hintIcon: { color: '#93c5fd', marginRight: '0.35rem', fontSize: '0.7rem' },
  noteBox: { backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '0.5rem 0.75rem', marginBottom: '0.75rem' },
  recsBox: { backgroundColor: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: '8px', padding: '0.75rem' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' },
  th: { padding: '0.5rem 0.85rem', textAlign: 'left', fontWeight: '600', fontSize: '0.72rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e5e7eb' },
  td: { padding: '0.5rem 0.85rem', color: '#374151' },
};

export default PetHealthPredictions;
