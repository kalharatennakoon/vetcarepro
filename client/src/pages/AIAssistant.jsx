import { useState, useRef, useEffect } from 'react';
import { askAssistant, confirmAiAction } from '../services/aiService';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import { formatMessageContent, getSourceLabel, allSourcesAreFaq } from '../utils/aiChatFormat';
import '../styles/AIAssistant.css';

// Admin oversees the whole clinic - operations, staffing, and finances, not
// just the clinical side - so these spotlight revenue/staffing/inventory
// oversight and ML-driven analytics (live model predictions/explanations,
// not just RAG lookups) rather than per-patient visit prep. Registering a
// new staff member is also admin-only, mirroring the write-action examples
// given to receptionist/veterinarian below.
const CLINICAL_SUGGESTED_PROMPTS = [
  "What's the total revenue this month?",
  "What's our revenue forecast for the next few months?",
  'How many veterinarians do we have?',
  'What should I reorder soon?',
  'Explain the current outbreak risk in plain language',
  'Register a new veterinarian to the team'
];

// Veterinarian-specific: mirrors the four clinical-generation capabilities
// built for vets (full history, note drafting, aftercare, pre-visit
// briefing) - deliberately excludes booking/scheduling, which is a
// receptionist workflow, not part of the vet's own use of the assistant.
const VETERINARIAN_SUGGESTED_PROMPTS = [
  "Summarize a pet's complete medical history",
  'Draft a consultation note from my visit observations',
  'Write owner-friendly aftercare instructions',
  'What should I know before seeing a patient today?'
];

// Receptionist-specific: mirrors their actual front-desk workflow - booking/
// rescheduling/cancelling appointments, intake, and billing lookups are all
// real chat-driven actions now (not just "how do I" instructions), and
// billing is a self-contained example that always gives a real answer
// without needing a specific customer name first.
const RECEPTIONIST_SUGGESTED_PROMPTS = [
  'Book an appointment for a pet',
  'Register a new customer',
  'How much does a checkup usually cost?'
];

// Veterinarian's own intro - written in first person for them, not "defer
// to the veterinarian" (redundant/odd when the veterinarian IS the user).
const VET_INTRO =
  "Hi, I'm the VetCare Pro AI assistant. I can summarize medical histories, draft " +
  'consultation notes, write aftercare instructions, and brief you before visits - ' +
  'grounded in real clinic data. Diagnosis and treatment are always your call.';

// Receptionist's own intro - front-desk workflow only, no clinical/medical
// framing at all (that's never in scope for this role).
const RECEPTIONIST_INTRO =
  "Hi, I'm the VetCare Pro AI assistant. I can book, reschedule, or cancel " +
  'appointments, send reminders, register new customers and pets, and answer ' +
  'billing questions - grounded in real clinic data. Clinical questions go to a veterinarian.';

// Admin's own intro - admin sees the whole clinic (records, operations,
// billing, analytics), not just the clinical side, so this stays broader
// than the veterinarian/receptionist copy above.
const DEFAULT_INTRO =
  "Hi, I'm the VetCare Pro AI assistant. I can summarize pet records, explain " +
  'clinic-wide analytics and AI predictions (revenue forecasts, inventory demand, ' +
  'outbreak risk), register new staff members, and help you review operations ' +
  'across the clinic - grounded in real clinic data. Diagnosis and treatment ' +
  'decisions are always left to a veterinarian.';

const AIAssistant = () => {
  const { user } = useAuth();
  const isVeterinarian = user?.role === 'veterinarian';
  const isReceptionist = user?.role === 'receptionist';
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: isVeterinarian ? VET_INTRO : isReceptionist ? RECEPTIONIST_INTRO : DEFAULT_INTRO,
      sources: [],
      intro: true
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // Round-trips an in-progress write-action proposal (book/reschedule/cancel
  // an appointment, a reminder, or intake) across turns - there's no
  // server-side conversation session, so this (plus recent message history)
  // is how the assistant remembers what it already asked.
  const [pendingIntent, setPendingIntent] = useState(null);
  const bottomRef = useRef(null);
  const suggestedPrompts = user?.role === 'receptionist'
    ? RECEPTIONIST_SUGGESTED_PROMPTS
    : isVeterinarian
      ? VETERINARIAN_SUGGESTED_PROMPTS
      : CLINICAL_SUGGESTED_PROMPTS;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendQuestion = async (question, displayText) => {
    if (!question.trim() || loading) return;

    // Last few turns give the assistant enough context to keep filling in a
    // multi-turn action (e.g. answering "2pm" after being asked for a time).
    const history = messages
      .filter((m) => !m.intro)
      .slice(-6)
      .map((m) => ({ role: m.role, content: m.content }));

    setMessages((prev) => [...prev, { role: 'user', content: displayText || question }]);
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
            structured: Boolean(result.structured || result.pending_intent),
            // Disambiguation choices (e.g. "which Max?") - clicking one just
            // re-submits its value as the next message, same as typing it.
            options: result.options || []
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

  const handleOptionClick = (messageIndex, opt) => {
    setMessages((prev) => prev.map((m, i) => (i === messageIndex ? { ...m, resolved: true } : m)));
    sendQuestion(opt.value, opt.display);
  };

  return (
    <Layout>
      <div className="ai-assistant-page">
        <div className="ai-assistant-header">
          <div>
            <h1><i className="fas fa-robot"></i> AI Assistant</h1>
            <p className="ai-assistant-subtitle">
              {isVeterinarian
                ? 'Decision-support only — you always make the final call on diagnosis and treatment.'
                : isReceptionist
                  ? 'Front-desk support only — clinical and diagnosis questions go to a veterinarian.'
                  : 'Decision-support only — always confirm medical decisions with a veterinarian.'}
            </p>
          </div>
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
                {m.role === 'assistant' && m.options && m.options.length > 0 && !m.resolved && (
                  <div className="ai-option-choices">
                    {m.options.map((opt, j) => (
                      <button
                        key={j}
                        className="ai-option-btn"
                        onClick={() => handleOptionClick(i, opt)}
                        disabled={loading}
                      >
                        {opt.label}
                      </button>
                    ))}
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