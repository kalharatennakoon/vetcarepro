import { useEffect, useState } from 'react';
import { getBriefing } from '../../services/briefingService';

// Fetches independently of the main dashboard stat fetch, so a slow or
// unavailable Ollama never blocks or delays the rest of the dashboard.
const AiDailyBriefing = () => {
  const [state, setState] = useState({ loading: true, briefing: null, unavailable: false, refreshing: false });

  const loadBriefing = () => {
    getBriefing()
      .then((res) => {
        if (!res.success || res.unavailable) {
          setState({ loading: false, briefing: null, unavailable: true, refreshing: false });
        } else {
          setState({ loading: false, briefing: res, unavailable: false, refreshing: false });
        }
      })
      .catch(() => {
        setState({ loading: false, briefing: null, unavailable: true, refreshing: false });
      });
  };

  const handleRefresh = () => {
    setState((prev) => ({ ...prev, refreshing: true }));
    loadBriefing();
  };

  useEffect(() => {
    loadBriefing();
  }, []);

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.iconWrapper}>
            <i className="fas fa-wand-magic-sparkles" style={styles.icon}></i>
          </div>
          <h4 style={styles.title}>AI Daily Briefing</h4>
        </div>
        <button
          onClick={handleRefresh}
          disabled={state.loading || state.refreshing}
          title="Refresh AI briefing"
          style={styles.refreshBtn}
        >
          <i className={`fas fa-arrows-rotate ${state.refreshing ? 'fa-spin' : ''}`}></i>
        </button>
      </div>

      {state.loading ? (
        <div style={styles.loadingRow}>
          <span style={styles.spinner}></span>
          <span style={styles.loadingText}>Generating today's insights…</span>
        </div>
      ) : state.unavailable ? (
        <p style={styles.unavailableText}>
          <i className="fas fa-circle-exclamation" style={{ marginRight: '0.4rem' }}></i>
          Insights unavailable right now.
        </p>
      ) : (
        <>
          {state.briefing?.summary && <p style={styles.summary}>{state.briefing.summary}</p>}
          {Array.isArray(state.briefing?.bullets) && state.briefing.bullets.length > 0 && (
            <ul style={styles.bulletList}>
              {state.briefing.bullets.map((bullet, i) => (
                <li key={i} style={styles.bulletItem}>{bullet}</li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
};

const styles = {
  card: {
    background: 'linear-gradient(135deg, #f5ebff 0%, #eaf0ff 100%)',
    border: '1px solid #d8b4fe',
    borderLeft: '4px solid #7c3aed',
    borderRadius: '12px',
    padding: '1rem 1.25rem',
    height: '100%',
    boxSizing: 'border-box',
    boxShadow: '0 4px 16px -6px rgba(124, 58, 237, 0.35)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '0.6rem',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
  },
  iconWrapper: {
    width: '30px',
    height: '30px',
    borderRadius: '8px',
    background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
    boxShadow: '0 3px 8px -2px rgba(124, 58, 237, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  icon: {
    color: '#fff',
    fontSize: '14px',
  },
  title: {
    margin: 0,
    fontSize: '0.92rem',
    fontWeight: '800',
    color: '#4c1d95',
  },
  loadingRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  spinner: {
    display: 'inline-block',
    width: '14px',
    height: '14px',
    border: '2px solid #ddd6fe',
    borderTop: '2px solid #7c3aed',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    fontSize: '0.8rem',
    color: '#6b7280',
  },
  unavailableText: {
    margin: 0,
    fontSize: '0.8rem',
    color: '#6b7280',
  },
  summary: {
    margin: '0 0 0.5rem',
    fontSize: '0.85rem',
    color: '#374151',
    lineHeight: 1.5,
  },
  bulletList: {
    margin: 0,
    paddingLeft: '1.1rem',
  },
  bulletItem: {
    fontSize: '0.8rem',
    color: '#4b5563',
    lineHeight: 1.6,
  },
  refreshBtn: {
    background: 'none',
    border: 'none',
    color: '#6d28d9',
    cursor: 'pointer',
    padding: '0.2rem 0.4rem',
    borderRadius: '4px',
    fontSize: '0.85rem',
    opacity: 0.8,
    transition: 'opacity 0.2s',
  },
};

export default AiDailyBriefing;
