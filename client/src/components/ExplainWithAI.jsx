import { useState } from 'react';
import { explainMlOutput } from '../services/aiService';

/**
 * Small "Explain in plain language" button + result box, for use next to any
 * ML model output (outbreak risk, sales forecast, inventory forecast, etc).
 *
 * Usage: <ExplainWithAI outputType="outbreak_risk" data={outbreakRisk} />
 */
const ExplainWithAI = ({ outputType, data }) => {
  const [explanation, setExplanation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleExplain = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await explainMlOutput(outputType, data);
      setExplanation(result.explanation);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not generate an explanation right now.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginTop: '0.5rem' }}>
      {!explanation && (
        <button
          onClick={handleExplain}
          disabled={loading || !data}
          style={{
            fontSize: '0.75rem',
            fontWeight: 600,
            color: '#4338ca',
            background: '#eef2ff',
            border: '1px solid #c7d2fe',
            borderRadius: '999px',
            padding: '0.3rem 0.75rem',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          <i className="fas fa-robot" style={{ marginRight: '0.35rem' }}></i>
          {loading ? 'Explaining...' : 'Explain in plain language'}
        </button>
      )}

      {explanation && (
        <div
          style={{
            backgroundColor: 'rgba(67,56,202,0.08)',
            border: '1px solid rgba(67,56,202,0.2)',
            borderRadius: '6px',
            padding: '0.5rem 0.7rem',
            marginTop: '0.4rem'
          }}
        >
          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#4338ca', display: 'block', marginBottom: '0.2rem' }}>
            <i className="fas fa-robot"></i> AI EXPLANATION
          </span>
          <span style={{ fontSize: '0.8rem', color: '#374151' }}>{explanation}</span>
        </div>
      )}

      {error && (
        <p style={{ fontSize: '0.72rem', color: '#b91c1c', marginTop: '0.3rem' }}>{error}</p>
      )}
    </div>
  );
};

export default ExplainWithAI;