import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { askCustomerAssistant } from '../services/aiService';
import { useCustomerAuth } from '../context/CustomerAuthContext';
import '../styles/AIAssistant.css';
import '../styles/PetOwnerAIAssistant.css';

const SUGGESTED_PROMPTS = [
  "What vaccines has my pet had?",
  "Summarize my pet's recent medical history",
  'What aftercare should I follow after the last visit?'
];

const PetOwnerAIAssistant = () => {
  const { customer, logout } = useCustomerAuth();
  const navigate = useNavigate();

  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content:
        "Hi! Ask me about your pets' records, vaccination history, or care " +
        'instructions. I only answer using your own pets\u2019 data, and always ' +
        'defer final medical judgment to your veterinarian.',
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
      const result = await askCustomerAssistant(question);
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

  const handleSignOut = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="po-ai-page">
      <header className="po-ai-header">
        <div className="po-ai-header-left">
          <div className="po-ai-logo-icon">
            <i className="fas fa-paw"></i>
          </div>
          <div>
            <h2 className="po-ai-logo-title">VetCare Pro</h2>
            <span className="po-ai-mode-badge">Pet Owner</span>
          </div>
        </div>
        <div className="po-ai-header-right">
          {customer && <span className="po-ai-user-name">{customer.first_name} {customer.last_name}</span>}
          <button type="button" className="po-ai-signout-btn" onClick={() => navigate('/pet-owner/profile')}>
            My Profile
          </button>
          <button type="button" className="po-ai-signout-btn" onClick={handleSignOut}>
            Sign Out
          </button>
        </div>
      </header>

      <main className="ai-assistant-page po-ai-main">
        <div className="ai-assistant-header">
          <div>
            <h1><i className="fas fa-robot"></i> AI Assistant</h1>
            <p className="ai-assistant-subtitle">
              Decision-support only &mdash; always confirm medical decisions with a veterinarian.
            </p>
          </div>
        </div>

        <div className="po-ai-scope-banner">
          Scoped to your own pets only &mdash; not the clinic&rsquo;s full records.
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
            placeholder="Ask about your pets..."
            disabled={loading}
          />
          <button type="submit" disabled={loading || !input.trim()}>
            <i className="fas fa-paper-plane"></i>
          </button>
        </form>
      </main>
    </div>
  );
};

export default PetOwnerAIAssistant;
