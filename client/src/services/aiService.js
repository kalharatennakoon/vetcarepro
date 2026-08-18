import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const getAuthHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

/**
 * Ask the AI assistant a question (full clinic-data scope, staff only)
 * @param {string} question
 * @param {Object} [options]
 * @param {Array} [options.history] - recent {role, content} turns, needed for multi-turn
 *   write-action requests (booking, rescheduling, reminders, intake)
 * @param {Object} [options.pendingIntent] - an in-progress write-action proposal echoed back
 *   from the previous turn's response, so slot-filling can continue
 */
export const askAssistant = async (question, { history, pendingIntent } = {}) => {
  const response = await axios.post(
    `${API_URL}/ai/chat`,
    { question, history, pending_intent: pendingIntent },
    getAuthHeaders()
  );
  return response.data;
};

/**
 * Stream the AI assistant's answer in real time (admin-only "show model
 * reasoning live" chat view) - the server only ever turns thinking mode on
 * for that role, and /ai/chat/stream is admin-only regardless. Uses fetch()
 * rather than axios since axios has no browser streaming-body support;
 * invokes onEvent for each Server-Sent Events message as it arrives instead
 * of returning a single response, since the whole point is showing
 * reasoning incrementally rather than after the fact.
 * @param {string} question
 * @param {Object} [options] - see askAssistant
 * @param {(event: {type: string, [key: string]: any}) => void} onEvent - called for each
 *   {type: 'reasoning_delta', text} as the model thinks, then exactly one
 *   {type: 'final', success, ...} with the same shape askAssistant resolves to
 * @param {AbortSignal} [signal] - lets the caller cancel an in-flight stream
 */
export const askAssistantStream = async (question, { history, pendingIntent } = {}, onEvent, signal) => {
  const response = await fetch(`${API_URL}/ai/chat/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('token')}`
    },
    body: JSON.stringify({ question, history, pending_intent: pendingIntent }),
    signal
  });

  if (!response.ok || !response.body) {
    throw new Error(`AI stream request failed (${response.status})`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // SSE events are separated by a blank line; each line inside one is
    // "data: <json>" - buffer across chunk boundaries since a single read()
    // can split an event (or even a single data: line) mid-way.
    let boundary;
    while ((boundary = buffer.indexOf('\n\n')) !== -1) {
      const rawEvent = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      const line = rawEvent.split('\n').find((l) => l.startsWith('data: '));
      if (line) onEvent(JSON.parse(line.slice('data: '.length)));
    }
  }
};

/**
 * Execute a write action the assistant proposed (book/reschedule/cancel an
 * appointment, send a reminder, register a customer, add a pet) - only ever
 * called after the staff member explicitly confirms it in the chat UI.
 * @param {Object} action - the `action` object returned by askAssistant
 *   (`{ type, slots }`)
 */
export const confirmAiAction = async (action) => {
  const response = await axios.post(
    `${API_URL}/ai/actions/confirm`,
    { action },
    getAuthHeaders()
  );
  return response.data;
};

/**
 * Ask the AI assistant a question as a logged-in pet owner (scoped to their
 * own pets/records only). Uses the customer-portal token, not the staff one.
 * @param {string} question
 * @param {Object} [options]
 * @param {Array} [options.history] - recent {role, content} turns, needed for multi-turn
 *   pet disambiguation ("which pet do you mean?") to round-trip statelessly
 * @param {Object} [options.pendingIntent] - an in-progress pet disambiguation echoed back
 *   from the previous turn's response, so picking an option resolves the original question
 */
export const askCustomerAssistant = async (question, { history, pendingIntent } = {}) => {
  const customerToken = localStorage.getItem('customerToken');
  const response = await axios.post(
    `${API_URL}/ai/customer-chat`,
    { question, history, pending_intent: pendingIntent },
    { headers: { Authorization: `Bearer ${customerToken}` } }
  );
  return response.data;
};

/**
 * Ask the AI assistant a general pet-care question as a guest (no login,
 * no clinic-specific data - general info only, backed by the public FAQ/
 * care-instruction sources).
 * @param {string} question
 */
export const askPublicAssistant = async (question) => {
  const response = await axios.post(`${API_URL}/ai/public-chat`, { question });
  return response.data;
};

/**
 * Check whether the local AI assistant (Ollama) is reachable and the
 * required models are installed.
 */
export const checkAssistantHealth = async () => {
  const response = await axios.get(`${API_URL}/ai/health`, getAuthHeaders());
  return response.data;
};

/**
 * Backfill the vector store from all existing medical records only.
 */
export const backfillMedicalRecords = async () => {
  const response = await axios.post(
    `${API_URL}/ai/ingest/medical-records`,
    {},
    getAuthHeaders()
  );
  return response.data;
};

/**
 * Explain a raw ML model output (outbreak risk, sales forecast, inventory
 * forecast) in plain language.
 * @param {string} outputType - e.g. 'outbreak_risk', 'sales_forecast', 'inventory_forecast'
 * @param {Object} data - the raw ML output to explain
 */
export const explainMlOutput = async (outputType, data) => {
  const response = await axios.post(
    `${API_URL}/ai/explain`,
    { output_type: outputType, data },
    getAuthHeaders()
  );
  return response.data;
};