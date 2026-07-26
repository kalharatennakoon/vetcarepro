import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { askPublicAssistant } from '../services/aiService';
import '../styles/AIAssistant.css';
import '../styles/GuestAIAssistant.css';

const SUGGESTED_PROMPTS = [
  'What vaccines does a new puppy need?',
  'How often should I feed my cat?',
  'When should I bring my pet in for a check-up?'
];

const GuestAIAssistant = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content:
        "Hi! I'm the VetCare Pro AI assistant. I can answer general pet care " +
        "questions using our clinic's FAQs and care guides. Sign in to ask about " +
        'your own pets\u2019 records.',
      sources: []
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
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
      const result = await askPublicAssistant(question);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: result.answer, sources: result.sources || [] }
      ]);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'The AI assistant is unavailable right now. Please try again shortly.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="guest-ai-page">
      <header className="guest-ai-header">
        <div className="guest-ai-header-left">
          <div className="guest-ai-logo-icon">
            <i className="fas fa-paw"></i>
          </div>
          <div>
            <h2 className="guest-ai-logo-title">VetCare Pro</h2>
            <span className="guest-ai-mode-badge">Guest Mode</span>
          </div>
        </div>
        <button
          type="button"
          className="guest-ai-signin-btn"
          onClick={() => navigate('/')}
        >
          Sign In
        </button>
      </header>

      <main className="ai-assistant-page guest-ai-main">
        <div className="ai-assistant-header">
          <div>
            <h1><i className="fas fa-robot"></i> AI Assistant</h1>
            <p className="ai-assistant-subtitle">
              Decision-support only &mdash; always confirm medical decisions with a veterinarian.
            </p>
          </div>
        </div>

        <div className="guest-ai-scope-banner">
          General pet care info only &mdash; sign in to ask about your own pet&rsquo;s records.
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
            placeholder="Ask a general pet care question..."
            disabled={loading}
          />
          <button type="submit" disabled={loading || !input.trim()}>
            <i className="fas fa-paper-plane"></i>
          </button>
        </form>
      </main>

      <footer className="guest-ai-footer">
        <p>&copy; 2026 VetCare Systems</p>
      </footer>
    </div>
  );
};

export default GuestAIAssistant;
