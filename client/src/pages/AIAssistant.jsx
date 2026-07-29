import { useState, useRef, useEffect } from 'react';
import { askAssistant, confirmAiAction, backfillAll } from '../services/aiService';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import { formatMessageContent, getSourceLabel, allSourcesAreFaq } from '../utils/aiChatFormat';
import '../styles/AIAssistant.css';

// Admin/veterinarian have full clinic-wide access, so these lean clinical.
const CLINICAL_SUGGESTED_PROMPTS = [
  "Summarize a pet's recent medical history",
  'Explain the current outbreak risk in plain language',
  'What should I check before an appointment?'
];

// Receptionist's AI scope excludes disease cases, lab reports, and medical
// records (see ml/scripts/rag/retrieval.py) - these match what they can
// actually get answered: front-desk FAQs and vaccination lookups.
const RECEPTIONIST_SUGGESTED_PROMPTS = [
  'How do I book or reschedule an appointment?',
  'How do I register a new customer and their pet?',
  'What vaccines has a specific pet had?'
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
      sources: [],
      intro: true
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [backfilling, setBackfilling] = useState(false);
  // Round-trips an in-progress write-action proposal (book/reschedule/cancel
  // an appointment, a reminder, or intake) across turns - there's no
  // server-side conversation session, so this (plus recent message history)
  // is how the assistant remembers what it already asked.
  const [pendingIntent, setPendingIntent] = useState(null);
  const bottomRef = useRef(null);
  const suggestedPrompts = user?.role === 'receptionist'
    ? RECEPTIONIST_SUGGESTED_PROMPTS
    : CLINICAL_SUGGESTED_PROMPTS;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendQuestion = async (question) => {
    if (!question.trim() || loading) return;

    // Last few turns give the assistant enough context to keep filling in a
    // multi-turn action (e.g. answering "2pm" after being asked for a time).
    const history = messages
      .filter((m) => !m.intro)
      .slice(-6)
      .map((m) => ({ role: m.role, content: m.content }));

    setMessages((prev) => [...prev, { role: 'user', content: question }]);
    setInput('');
    setLoading(true);
    setError('');

    try {
      const result = await askAssistant(question, { history, pendingIntent });

      if (result.action && result.requires_confirmation) {
        setPendingIntent(null);
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: result.answer, sources: [], action: result.action, structured: true }
        ]);
      } else {
        setPendingIntent(result.pending_intent || null);
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: result.answer,
            sources: result.sources || [],
            // Follow-up slot-filling questions and deterministic SQL answers
            // aren't the model's own general knowledge, even when there's no
            // specific record to cite as a source - don't label them as such.
            structured: Boolean(result.structured || result.pending_intent)
          }
        ]);
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'The AI assistant is unavailable. Make sure Ollama is running locally.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmAction = async (messageIndex) => {
    const target = messages[messageIndex];
    if (!target?.action || target.resolved) return;

    setMessages((prev) => prev.map((m, i) => (i === messageIndex ? { ...m, resolved: true } : m)));
    setLoading(true);
    setError('');

    try {
      const result = await confirmAiAction(target.action);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: result.success ? (result.message || 'Done.') : (result.message || 'That action failed.'),
          sources: [],
          structured: true
        }
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: err.response?.data?.message || 'Something went wrong performing that action.',
          sources: [],
          structured: true
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelAction = (messageIndex) => {
    setMessages((prev) => prev.map((m, i) => (i === messageIndex ? { ...m, resolved: true } : m)));
    setMessages((prev) => [
      ...prev,
      { role: 'assistant', content: "No problem, I've cancelled that.", sources: [], structured: true }
    ]);
  };

  const handleBackfill = async () => {
    setBackfilling(true);
    setError('');
    try {
      const result = await backfillAll();
      const summary = Object.entries(result.results || {})
        .map(([source, r]) => `${source}: ${r.ingested} ingested${r.failed ? `, ${r.failed} failed` : ''}`)
        .join(' · ');
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Knowledge base updated. ${summary}`,
          sources: [],
          intro: true
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
                {m.role === 'assistant' ? formatMessageContent(m.content) : <p>{m.content}</p>}
                {m.role === 'assistant' && m.action && !m.resolved && (
                  <div className="ai-action-confirm">
                    <button
                      className="ai-action-confirm-btn"
                      onClick={() => handleConfirmAction(i)}
                      disabled={loading}
                    >
                      <i className="fas fa-check"></i> Confirm
                    </button>
                    <button
                      className="ai-action-cancel-btn"
                      onClick={() => handleCancelAction(i)}
                      disabled={loading}
                    >
                      <i className="fas fa-times"></i> Cancel
                    </button>
                  </div>
                )}
                {m.role === 'assistant' && !m.intro && !m.action && (
                  m.sources && m.sources.length > 0 ? (
                    <div className="ai-message-sources">
                      <span className="ai-message-sources-label">
                        <i className="fas fa-book"></i>
                        {allSourcesAreFaq(m.sources) ? ' From our clinic FAQs:' : ' Sources:'}
                      </span>
                      {m.sources.map((s, j) => (
                        <span key={j} className="ai-source-tag">
                          {getSourceLabel(s)}
                        </span>
                      ))}
                    </div>
                  ) : !m.structured ? (
                    // Only a genuine unsourced RAG answer (the model falling back to
                    // its own training knowledge) gets this label - deterministic
                    // structured/action-flow replies (follow-up questions, booking
                    // confirmations, DB lookups with nothing to cite) are still
                    // clinic-data-driven even without a source chip to show.
                    <div className="ai-message-sources ai-message-sources-general">
                      <i className="fas fa-brain"></i> General veterinary knowledge &mdash; not from a specific clinic record.
                    </div>
                  ) : null
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="ai-message ai-message-assistant">
              <div className="ai-message-bubble ai-message-loading">
                <span>Thinking</span>
                <span className="ai-thinking-dots">
                  <span></span><span></span><span></span>
                </span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {error && <div className="ai-assistant-error">{error}</div>}

        {messages.length <= 1 && (
          <div className="ai-suggested-prompts">
            {suggestedPrompts.map((p) => (
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