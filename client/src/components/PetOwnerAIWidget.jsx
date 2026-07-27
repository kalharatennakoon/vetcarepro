import { useState, useRef, useEffect, useCallback } from 'react';
import { askCustomerAssistant } from '../services/aiService';
import { formatMessageContent, getSourceLabel, allSourcesAreFaq } from '../utils/aiChatFormat';
import '../styles/PetOwnerAIWidget.css';

const renderFormattedContent = (content) =>
  formatMessageContent(content, { listClassName: 'po-widget-list' });

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
  sources: [],
  intro: true
};

// Below this viewport width the window already goes edge-to-edge (see the
// mobile media query in PetOwnerAIWidget.css) - resizing doesn't make sense
// there, so the handle is hidden and no inline size is applied, leaving that
// CSS in full control.
const MOBILE_BREAKPOINT = 480;

const DEFAULT_SIZE = { width: 380, height: 560 };
const MIN_SIZE = { width: 320, height: 420 };
const MAX_SIZE = { width: 640, height: 800 };
const SIZE_STORAGE_KEY = 'vetcarepro_po_widget_size';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const loadStoredSize = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(SIZE_STORAGE_KEY));
    return {
      width: clamp(parsed?.width ?? DEFAULT_SIZE.width, MIN_SIZE.width, MAX_SIZE.width),
      height: clamp(parsed?.height ?? DEFAULT_SIZE.height, MIN_SIZE.height, MAX_SIZE.height)
    };
  } catch {
    return DEFAULT_SIZE;
  }
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
  const [size, setSize] = useState(loadStoredSize);
  const [isNarrowViewport, setIsNarrowViewport] = useState(
    () => window.innerWidth <= MOBILE_BREAKPOINT
  );
  const bottomRef = useRef(null);
  const resizeStartRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading, isOpen]);

  useEffect(() => {
    const onViewportResize = () => setIsNarrowViewport(window.innerWidth <= MOBILE_BREAKPOINT);
    window.addEventListener('resize', onViewportResize);
    return () => window.removeEventListener('resize', onViewportResize);
  }, []);

  // Window is anchored bottom-right, so the drag handle sits at its
  // top-left corner - dragging it up/left grows the window.
  const handleResizeMove = useCallback((e) => {
    if (!resizeStartRef.current) return;
    e.preventDefault();
    const point = e.touches ? e.touches[0] : e;
    const { startX, startY, startWidth, startHeight } = resizeStartRef.current;
    setSize({
      width: clamp(startWidth + (startX - point.clientX), MIN_SIZE.width, MAX_SIZE.width),
      height: clamp(startHeight + (startY - point.clientY), MIN_SIZE.height, MAX_SIZE.height)
    });
  }, []);

  const handleResizeEnd = useCallback(() => {
    resizeStartRef.current = null;
    window.removeEventListener('mousemove', handleResizeMove);
    window.removeEventListener('mouseup', handleResizeEnd);
    window.removeEventListener('touchmove', handleResizeMove);
    window.removeEventListener('touchend', handleResizeEnd);
    setSize((current) => {
      localStorage.setItem(SIZE_STORAGE_KEY, JSON.stringify(current));
      return current;
    });
  }, [handleResizeMove]);

  const handleResizeStart = useCallback((e) => {
    e.preventDefault();
    const point = e.touches ? e.touches[0] : e;
    resizeStartRef.current = {
      startX: point.clientX,
      startY: point.clientY,
      startWidth: size.width,
      startHeight: size.height
    };
    window.addEventListener('mousemove', handleResizeMove);
    window.addEventListener('mouseup', handleResizeEnd);
    window.addEventListener('touchmove', handleResizeMove, { passive: false });
    window.addEventListener('touchend', handleResizeEnd);
  }, [size, handleResizeMove, handleResizeEnd]);

  // Guards against leaving window-level listeners attached if the widget
  // unmounts mid-drag (e.g. the owner navigates away).
  useEffect(() => () => {
    window.removeEventListener('mousemove', handleResizeMove);
    window.removeEventListener('mouseup', handleResizeEnd);
    window.removeEventListener('touchmove', handleResizeMove);
    window.removeEventListener('touchend', handleResizeEnd);
  }, [handleResizeMove, handleResizeEnd]);

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
        <div
          className="po-widget-window"
          style={isNarrowViewport ? undefined : { width: size.width, height: size.height }}
        >
          {!isNarrowViewport && (
            <div
              className="po-widget-resize-handle"
              onMouseDown={handleResizeStart}
              onTouchStart={handleResizeStart}
              role="presentation"
              aria-hidden="true"
              title="Drag to resize"
            >
              <i className="fas fa-up-right-and-down-left-from-center"></i>
            </div>
          )}
          <div className="po-widget-header">
            <div className="po-widget-header-title">
              <i className="fas fa-robot"></i>
              <div>
                <strong>AI Assistant</strong>
                <span>Scoped to your own pets only</span>
              </div>
            </div>
          </div>

          <div className="po-widget-messages">
            {messages.map((m, i) => (
              <div key={i} className={`po-widget-message po-widget-message-${m.role}`}>
                <div className="po-widget-bubble">
                  {m.role === 'assistant' ? renderFormattedContent(m.content) : <p>{m.content}</p>}
                  {m.role === 'assistant' && !m.intro && (
                    m.sources && m.sources.length > 0 ? (
                      <div className="po-widget-sources">
                        <span className="po-widget-sources-label">
                          <i className="fas fa-book"></i>
                          {allSourcesAreFaq(m.sources) ? ' From our clinic FAQs:' : ' Sources:'}
                        </span>
                        {m.sources.map((s, j) => (
                          <span key={j} className="po-widget-source-tag">
                            {getSourceLabel(s)}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="po-widget-sources po-widget-sources-general">
                        <i className="fas fa-brain"></i> General veterinary knowledge &mdash; not from your pet's records.
                      </div>
                    )
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="po-widget-message po-widget-message-assistant">
                <div className="po-widget-bubble po-widget-bubble-loading">
                  <span>Thinking</span>
                  <span className="po-widget-thinking-dots">
                    <span></span><span></span><span></span>
                  </span>
                </div>
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
