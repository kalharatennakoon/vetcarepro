import { useState, useRef, useEffect } from 'react';
import { askCustomerAssistant } from '../services/aiService';
import '../styles/PetOwnerAIWidget.css';

const SUGGESTED_PROMPTS = [
  "What vaccines has my pet had?",
  "Summarize my pet's recent medical history",
  'What aftercare should I follow after the last visit?'
];

const INITIAL_MESSAGE = {
  role: 'assistant',
  content:
    "Hi! Ask me about your pets' records, vaccination history, or care " +
    'instructions. I only answer using your own pets’ data, and always ' +
    'defer final medical judgment to your veterinarian.',
  sources: []
};

/**
 * Floating chat widget, available on any pet-owner page. Opens in-page as
 * an overlay window rather than navigating to a separate route - keeps the
 * owner on their profile while asking questions.
 */
const PetOwnerAIWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading, isOpen]);

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

  return (
    <>
      {isOpen && (
        <div className="po-widget-window">
          <div className="po-widget-header">
            <div className="po-widget-header-title">
              <i className="fas fa-robot"></i>
              <div>
                <strong>AI Assistant</strong>
                <span>Scoped to your own pets only</span>
              </div>
            </div>
            <button
              type="button"
              className="po-widget-close"
              onClick={() => setIsOpen(false)}
              aria-label="Close AI assistant"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>

          <div className="po-widget-messages">
            {messages.map((m, i) => (
              <div key={i} className={`po-widget-message po-widget-message-${m.role}`}>
                <div className="po-widget-bubble">
                  <p>{m.content}</p>
                  {m.sources && m.sources.length > 0 && (
                    <div className="po-widget-sources">
                      <span>Sources: </span>
                      {m.sources.map((s, j) => (
                        <span key={j} className="po-widget-source-tag">
                          {s.source_type} #{s.source_id}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="po-widget-message po-widget-message-assistant">
                <div className="po-widget-bubble po-widget-bubble-loading">Thinking...</div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {error && <div className="po-widget-error">{error}</div>}

          {messages.length <= 1 && (
            <div className="po-widget-prompts">
              {SUGGESTED_PROMPTS.map((p) => (
                <button key={p} onClick={() => sendQuestion(p)}>{p}</button>
              ))}
            </div>
          )}

          <form
            className="po-widget-input-row"
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
        </div>
      )}

      <button
        type="button"
        className="po-widget-fab"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={isOpen ? 'Close AI assistant' : 'Open AI assistant'}
      >
        <i className={`fas ${isOpen ? 'fa-times' : 'fa-robot'}`}></i>
        {!isOpen && <span>Ask AI</span>}
      </button>
    </>
  );
};

export default PetOwnerAIWidget;
