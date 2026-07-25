import { useState, useRef, useEffect } from 'react';
import { askAssistant, backfillMedicalRecords } from '../services/aiService';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import '../styles/AIAssistant.css';

const SUGGESTED_PROMPTS = [
  "Summarize a pet's recent medical history",
  'Explain the current outbreak risk in plain language',
  'What should I check before an appointment?'
];

const AIAssistant = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content:
        "Hi, I'm the VetCare Pro AI assistant. Ask me about pet records, " +
        "consultation summaries, or the clinic's AI predictions. I answer using " +
        'clinic data and always defer final medical judgment to the veterinarian.',
      sources: []
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [backfilling, setBackfilling] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendQuestion = async (question) => {
    if (!question.trim() || loading) return;

    setMessages((prev) => [...prev, { role: 'user', content: question }]);
    setInput('');
    setLoading(true);
    setError('');

    try {
      const result = await askAssistant(question);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: result.answer, sources: result.sources || [] }
      ]);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'The AI assistant is unavailable. Make sure Ollama is running locally.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleBackfill = async () => {
    setBackfilling(true);
    setError('');
    try {
      const result = await backfillMedicalRecords();
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Knowledge base updated: ${result.ingested} record(s) ingested${
            result.failed ? `, ${result.failed} failed` : ''
          }.`,
          sources: []
        }
      ]);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update the knowledge base.');
    } finally {
      setBackfilling(false);
    }
  };

  return (
    <Layout>
      <div className="ai-assistant-page">
        <div className="ai-assistant-header">
          <div>
            <h1><i className="fas fa-robot"></i> AI Assistant</h1>
            <p className="ai-assistant-subtitle">
              Decision-support only &mdash; always confirm medical decisions with a veterinarian.
            </p>
          </div>
          {user?.role === 'admin' && (
            <button
              className="ai-assistant-backfill-btn"
              onClick={handleBackfill}
              disabled={backfilling}
            >
              {backfilling ? 'Updating...' : 'Refresh knowledge base'}
            </button>
          )}
        </div>

        <div className="ai-assistant-chat">
          {messages.map((m, i) => (
            <div key={i} className={`ai-message ai-message-${m.role}`}>
              <div className="ai-message-bubble">
                <p>{m.content}</p>
                {m.sources && m.sources.length > 0 && (
                  <div className="ai-message-sources">
                    <span>Sources: </span>
                    {m.sources.map((s, j) => (
                      <span key={j} className="ai-source-tag">
                        {s.source_type} #{s.source_id}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="ai-message ai-message-assistant">
              <div className="ai-message-bubble ai-message-loading">Thinking...</div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {error && <div className="ai-assistant-error">{error}</div>}

        {messages.length <= 1 && (
          <div className="ai-suggested-prompts">
            {SUGGESTED_PROMPTS.map((p) => (
              <button key={p} onClick={() => sendQuestion(p)}>{p}</button>
            ))}
          </div>
        )}

        <form
          className="ai-assistant-input-row"
          onSubmit={(e) => { e.preventDefault(); sendQuestion(input); }}
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about a pet, consultation, or prediction..."
            disabled={loading}
          />
          <button type="submit" disabled={loading || !input.trim()}>
            <i className="fas fa-paper-plane"></i>
          </button>
        </form>
      </div>
    </Layout>
  );
};

export default AIAssistant;
