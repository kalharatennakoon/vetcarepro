import { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { askAssistant, askAssistantStream, confirmAiAction } from '../services/aiService';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import AiChartMessage from '../components/AiChartMessage';
import { formatMessageContent, getSourceLabel, allSourcesAreFaq } from '../utils/aiChatFormat';
import '../styles/AIAssistant.css';
import '../styles/AIAssistantModern.css';

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
  const location = useLocation();
  const navigate = useNavigate();
  const isVeterinarian = user?.role === 'veterinarian';
  const isReceptionist = user?.role === 'receptionist';
  const isAdmin = user?.role === 'admin';
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
  const chatContainerRef = useRef(null);
  // Tracks whether the view should auto-scroll to the newest content. Starts
  // true (initial load / a fresh question should land at the bottom), but
  // flips to false the moment the user scrolls up - e.g. to read an earlier
  // message while the admin reasoning stream keeps appending tokens below -
  // so the streaming updates stop yanking them back down. Flips back to true
  // once they scroll back near the bottom themselves, or send a new question.
  const stickToBottomRef = useRef(true);
  const textareaRef = useRef(null);
  const suggestedPrompts = user?.role === 'receptionist'
    ? RECEPTIONIST_SUGGESTED_PROMPTS
    : isVeterinarian
      ? VETERINARIAN_SUGGESTED_PROMPTS
      : CLINICAL_SUGGESTED_PROMPTS;

  useEffect(() => {
    // Scrolls chatContainerRef itself directly, NOT via a sentinel child's
    // scrollIntoView() - scrollIntoView walks up through every scrollable
    // ancestor needed to bring the target into view, which on this page
    // includes Layout.jsx's #main-content (the page's own scrollbar, wrapped
    // around this whole chat). During an admin reasoning stream this effect
    // re-runs on every token, so scrollIntoView kept re-asserting itself on
    // #main-content too - even after the admin manually scrolled the PAGE
    // (not just the chat box) up to read something above it, the very next
    // token yanked it back down, making the page scrollbar feel unusable
    // until streaming finished. Scrolling only this container leaves
    // #main-content (and every other ancestor) alone entirely.
    if (stickToBottomRef.current) {
      const el = chatContainerRef.current;
      el?.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, loading]);

  // A streamed reasoning trace can append dozens of tokens a second, each
  // one re-running the effect above - if it always scrolled unconditionally,
  // manually scrolling up mid-stream (e.g. to re-read an earlier answer)
  // would get fought every few hundred milliseconds. Track how close to the
  // bottom the user actually is instead, and only keep auto-scrolling while
  // they're already there.
  const NEAR_BOTTOM_PX = 80;
  const handleChatScroll = () => {
    const el = chatContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickToBottomRef.current = distanceFromBottom < NEAR_BOTTOM_PX;
  };

  // Grows the input with its content instead of scrolling text horizontally
  // inside a fixed-height box - re-measured on every keystroke since a
  // plain height:auto reset is required first to let scrollHeight shrink
  // back down when text is deleted, not just grow.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [input]);

  // Shared shape-building between the blocking (askAssistant) and streaming
  // (askAssistantStream) paths - both resolve to the same fields, so the
  // message object built for the chat bubble is identical either way; only
  // how that answer arrives (all at once vs incrementally) differs.
  const buildAssistantMessage = (result, reasoningSoFar) => {
    if (result.action && result.requires_confirmation) {
      return { role: 'assistant', content: result.answer, sources: [], action: result.action, structured: true };
    }
    return {
      role: 'assistant',
      content: result.answer,
      sources: result.sources || [],
      // Follow-up slot-filling questions and deterministic SQL answers
      // aren't the model's own general knowledge, even when there's no
      // specific record to cite as a source - don't label them as such.
      structured: Boolean(result.structured || result.pending_intent),
      // Disambiguation choices (e.g. "which Max?") - clicking one just
      // re-submits its value as the next message, same as typing it.
      options: result.options || [],
      // Only present when the question explicitly asked for a chart
      // (see ml/scripts/rag/chart_intent.py) - normally null.
      chart: result.chart || null,
      // Only present on admin turns of the plain RAG-generation path
      // (see rag_service.answer_question) - the backend only requests
      // the model's thinking-mode output for that role in the first
      // place, so this is never populated for other roles. The streaming
      // path already has this built up locally from reasoning_delta
      // events, in case the final event's own copy is ever missing.
      reasoning: result.reasoning || reasoningSoFar || null
    };
  };

  const sendQuestion = async (question, displayText) => {
    if (!question.trim() || loading) return;

    // Last few turns give the assistant enough context to keep filling in a
    // multi-turn action (e.g. answering "2pm" after being asked for a time).
    const history = messages
      .filter((m) => !m.intro)
      .slice(-6)
      .map((m) => ({ role: m.role, content: m.content }));

    // A new question is the user's own action - always land on it and follow
    // the reply as it streams in, even if they'd scrolled up to re-read
    // earlier history first.
    stickToBottomRef.current = true;
    setMessages((prev) => [...prev, { role: 'user', content: displayText || question }]);
    setInput('');
    setLoading(true);
    setError('');

    // Admin gets the real-time streamed path - a live "watch it think"
    // view - since the backend only ever turns thinking mode on for that
    // role and /ai/chat/stream is admin-only regardless. Every other role
    // keeps the plain blocking call below unchanged.
    if (isAdmin) {
      // A stable id (not an index into `messages`) identifies the in-progress
      // streaming bubble across updates - React 18 StrictMode double-invokes
      // setState updater functions in dev to check they're pure, so the
      // updater itself must decide push-vs-update by looking at `prev`
      // alone, never by mutating an outer variable (that path silently
      // indexes into the wrong array on the discarded replay call).
      const streamId = `stream-${Date.now()}-${Math.random()}`;
      try {
        await askAssistantStream(question, { history, pendingIntent }, (event) => {
          if (event.type === 'reasoning_delta') {
            setMessages((prev) => {
              const idx = prev.findIndex((m) => m.id === streamId);
              if (idx === -1) {
                return [
                  ...prev,
                  { id: streamId, role: 'assistant', content: '', sources: [], reasoning: event.text, streaming: true }
                ];
              }
              const next = [...prev];
              next[idx] = { ...next[idx], reasoning: (next[idx].reasoning || '') + event.text };
              return next;
            });
          } else if (event.type === 'final') {
            if (event.success === false) {
              setError(event.message || 'The AI assistant is unavailable. Make sure Ollama is running locally.');
              return;
            }
            setPendingIntent(event.action && event.requires_confirmation ? null : (event.pending_intent || null));
            setMessages((prev) => {
              const idx = prev.findIndex((m) => m.id === streamId);
              const finalMessage = buildAssistantMessage(event, idx !== -1 ? prev[idx].reasoning : null);
              if (idx === -1) return [...prev, finalMessage];
              const next = [...prev];
              next[idx] = finalMessage;
              return next;
            });
          }
        });
      } catch {
        setError('The AI assistant is unavailable. Make sure Ollama is running locally.');
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      const result = await askAssistant(question, { history, pendingIntent });
      setPendingIntent(result.action && result.requires_confirmation ? null : (result.pending_intent || null));
      setMessages((prev) => [...prev, buildAssistantMessage(result)]);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'The AI assistant is unavailable. Make sure Ollama is running locally.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Arriving from the header's "quick ask" popup: send the typed question
  // immediately, then clear the router state so refreshing/navigating back
  // doesn't resend it. Guarded by a ref (not just the state clear) because
  // StrictMode double-invokes this effect in dev - without it, the second
  // invocation would still see the original location.state and resend.
  const initialQuestionHandledRef = useRef(false);
  useEffect(() => {
    const initialQuestion = location.state?.initialQuestion;
    if (!initialQuestion || initialQuestionHandledRef.current) return;
    initialQuestionHandledRef.current = true;
    sendQuestion(initialQuestion);
    navigate(location.pathname, { replace: true, state: {} });
  }, []);

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
      <div className="ai-assistant-page ai-modern-page">
        <div className="ai-assistant-header ai-modern-header">
          <div className="ai-modern-header-icon">
            <i className="fas fa-wand-magic-sparkles"></i>
          </div>
          <div>
            <h1 className="ai-modern-title">AI Assistant</h1>
            <p className="ai-assistant-subtitle ai-modern-subtitle">
              {isVeterinarian
                ? 'Decision-support only — you always make the final call on diagnosis and treatment.'
                : isReceptionist
                  ? 'Front-desk support only — clinical and diagnosis questions go to a veterinarian.'
                  : 'Decision-support only — always confirm medical decisions with a veterinarian.'}
            </p>
          </div>
        </div>

        <div className="ai-assistant-chat ai-modern-chat" ref={chatContainerRef} onScroll={handleChatScroll}>
          {messages.map((m, i) => (
            <div key={i} className={`ai-message ai-message-${m.role} ai-modern-message`}>
              <div className={`ai-modern-avatar ai-modern-avatar-${m.role}`}>
                {m.role === 'assistant' ? (
                  <i className="fas fa-robot"></i>
                ) : user?.profile_image ? (
                  <img src={`http://localhost:3000/uploads/${user.profile_image}`} alt="You" />
                ) : (
                  <span>{user?.first_name?.charAt(0)}{user?.last_name?.charAt(0)}</span>
                )}
              </div>
              <div className={`ai-message-bubble ai-modern-bubble${m.intro ? ' ai-modern-intro' : ''}`}>
                {m.role === 'assistant' ? formatMessageContent(m.content) : <p>{m.content}</p>}
                {m.role === 'assistant' && isAdmin && m.reasoning && (
                  // Collapsed by default, even while actively streaming in -
                  // viewing the reasoning is opt-in, not forced open. The
                  // text keeps accumulating in state regardless, so opening
                  // it mid-stream still shows it catching up live.
                  <details className="ai-reasoning ai-modern-reasoning">
                    <summary className="ai-reasoning-summary ai-modern-reasoning-summary">
                      {m.streaming ? (
                        <>
                          <span className="ai-reasoning-thinking-label">
                            Thinking
                            <span className="ai-thinking-dots"><span></span><span></span><span></span></span>
                          </span>
                          <i className="fas fa-chevron-down ai-reasoning-chevron"></i>
                        </>
                      ) : (
                        <>
                          <i className="fas fa-brain"></i> Show model reasoning
                        </>
                      )}
                    </summary>
                    <p className="ai-reasoning-text ai-modern-reasoning-text">{m.reasoning}</p>
                  </details>
                )}
                {m.role === 'assistant' && m.chart && <AiChartMessage chart={m.chart} />}
                {m.role === 'assistant' && m.action && !m.resolved && (
                  <div className="ai-action-confirm ai-modern-action-confirm">
                    <button
                      className="ai-action-confirm-btn ai-modern-btn-confirm"
                      onClick={() => handleConfirmAction(i)}
                      disabled={loading}
                    >
                      <i className="fas fa-check"></i> Confirm
                    </button>
                    <button
                      className="ai-action-cancel-btn ai-modern-btn-cancel"
                      onClick={() => handleCancelAction(i)}
                      disabled={loading}
                    >
                      <i className="fas fa-times"></i> Cancel
                    </button>
                  </div>
                )}
                {m.role === 'assistant' && m.options && m.options.length > 0 && !m.resolved && (
                  <div className="ai-option-choices ai-modern-option-choices">
                    {m.options.map((opt, j) => (
                      <button
                        key={j}
                        className="ai-option-btn ai-modern-option-btn"
                        onClick={() => handleOptionClick(i, opt)}
                        disabled={loading}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
                {m.role === 'assistant' && !m.intro && !m.action && !m.streaming && (
                  m.sources && m.sources.length > 0 ? (
                    <div className="ai-message-sources ai-modern-sources">
                      <span className="ai-message-sources-label">
                        <i className="fas fa-book"></i>
                        {allSourcesAreFaq(m.sources) ? ' From our clinic FAQs:' : ' Sources:'}
                      </span>
                      {m.sources.map((s, j) => (
                        <span key={j} className="ai-source-tag ai-modern-source-tag">
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
                    <div className="ai-message-sources ai-message-sources-general ai-modern-sources ai-modern-sources-general">
                      <i className="fas fa-brain"></i> General veterinary knowledge &mdash; not from a specific clinic record.
                    </div>
                  ) : null
                )}
              </div>
            </div>
          ))}
          {/* Once the streaming reasoning bubble itself has appeared (see
              sendQuestion's admin path), that bubble IS the "thinking"
              indicator - showing this generic one at the same time would
              just duplicate it below the live reasoning text. */}
          {loading && !messages[messages.length - 1]?.streaming && (
            <div className="ai-message ai-message-assistant ai-modern-message">
              <div className="ai-modern-avatar ai-modern-avatar-assistant">
                <i className="fas fa-robot"></i>
              </div>
              <div className="ai-message-bubble ai-message-loading ai-modern-bubble ai-modern-loading">
                <span>Thinking</span>
                <span className="ai-thinking-dots">
                  <span></span><span></span><span></span>
                </span>
              </div>
            </div>
          )}
        </div>

        {error && <div className="ai-assistant-error ai-modern-error">{error}</div>}

        {messages.length <= 1 && (
          <div className={`ai-suggested-prompts ai-modern-prompts${isVeterinarian ? ' ai-modern-prompts-grid' : ''}`}>
            {suggestedPrompts.map((p) => (
              <button key={p} className="ai-modern-prompt-btn" onClick={() => sendQuestion(p)}>
                <i className="fas fa-lightbulb"></i> {p}
              </button>
            ))}
          </div>
        )}

        <form
          className="ai-assistant-input-row ai-modern-input-row"
          onSubmit={(e) => { e.preventDefault(); sendQuestion(input); }}
        >
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendQuestion(input);
              }
            }}
            placeholder="Ask about a pet, consultation, or prediction..."
            disabled={loading}
            className="ai-modern-input"
          />
          <button type="submit" disabled={loading || !input.trim()} className="ai-modern-send-btn">
            <i className="fas fa-paper-plane"></i>
          </button>
        </form>
      </div>
    </Layout>
  );
};

export default AIAssistant;