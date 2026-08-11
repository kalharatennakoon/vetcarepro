import { Fragment } from 'react';

// Splits **bold** segments out of a single line of text into React nodes.
const formatInlineText = (line) => {
  const segments = line.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return segments.map((segment, i) =>
    segment.startsWith('**') && segment.endsWith('**')
      ? <strong key={i}>{segment.slice(2, -2)}</strong>
      : <Fragment key={i}>{segment}</Fragment>
  );
};

// One tag per heading depth (#/##/###), sized down to fit inside a chat
// bubble rather than using the page's own h1/h2/h3 (which are already
// spoken for by page titles/section headers elsewhere in the UI).
const HEADING_TAGS = { 1: 'h4', 2: 'h5', 3: 'h6' };

// Renders assistant replies with basic markdown-style formatting - headings,
// bold text, bullet/numbered lists, and paragraph breaks - without pulling
// in a markdown dependency for what the local model produces. Shared by the
// guest, pet-owner, and staff chat UIs (plus Explain-with-AI) so they all
// render consistently. `listClassName` lets each surface keep its own list
// styling.
export const formatMessageContent = (content, { listClassName = 'ai-message-list' } = {}) => {
  const nodes = [];
  let paragraphLines = [];
  let bulletItems = [];
  let numberedItems = [];
  let key = 0;

  const flushParagraph = () => {
    if (paragraphLines.length === 0) return;
    nodes.push(
      <p key={key++}>
        {paragraphLines.map((l, j) => (
          <Fragment key={j}>
            {j > 0 && <br />}
            {formatInlineText(l)}
          </Fragment>
        ))}
      </p>
    );
    paragraphLines = [];
  };
  const flushBullets = () => {
    if (bulletItems.length === 0) return;
    nodes.push(
      <ul key={key++} className={listClassName}>
        {bulletItems.map((l, j) => <li key={j}>{formatInlineText(l)}</li>)}
      </ul>
    );
    bulletItems = [];
  };
  const flushNumbered = () => {
    if (numberedItems.length === 0) return;
    nodes.push(
      <ol key={key++} className={listClassName}>
        {numberedItems.map((l, j) => <li key={j}>{formatInlineText(l)}</li>)}
      </ol>
    );
    numberedItems = [];
  };
  const flushAll = () => { flushParagraph(); flushBullets(); flushNumbered(); };

  for (const raw of content.trim().split('\n')) {
    const line = raw.trim();
    if (!line) {
      flushAll();
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.*)/);
    if (heading) {
      flushAll();
      const level = heading[1].length;
      const HeadingTag = HEADING_TAGS[level];
      nodes.push(
        <HeadingTag key={key++} className={`ai-message-heading ai-message-heading-${level}`}>
          {formatInlineText(heading[2])}
        </HeadingTag>
      );
      continue;
    }
    if (/^[-*]\s+/.test(line)) {
      flushParagraph(); flushNumbered();
      bulletItems.push(line.replace(/^[-*]\s+/, ''));
      continue;
    }
    if (/^\d+[.)]\s+/.test(line)) {
      flushParagraph(); flushBullets();
      numberedItems.push(line.replace(/^\d+[.)]\s+/, ''));
      continue;
    }
    flushBullets(); flushNumbered();
    paragraphLines.push(line);
  }
  flushAll();

  return nodes;
};

// Turns a rag_chunks source (as returned by /api/ml/rag/chat) into a short
// human-readable label, using whatever metadata that source_type carries -
// see ml/scripts/rag/chunking.py for the metadata shape per source_type.
export const getSourceLabel = (source) => {
  const meta = source.metadata || {};
  switch (source.source_type) {
    case 'faq':
    case 'staff_faq':
      return meta.question || `FAQ #${source.source_id}`;
    case 'medical_record':
      return `Medical record${meta.pet_name ? ` – ${meta.pet_name}` : ''}${meta.visit_date ? ` (${meta.visit_date})` : ''}`;
    case 'vaccination':
      return `${meta.vaccine_name || 'Vaccination'}${meta.pet_name ? ` – ${meta.pet_name}` : ''}${meta.vaccination_date ? ` (${meta.vaccination_date})` : ''}`;
    case 'disease_case':
      return `${meta.disease_name || 'Disease case'}${meta.pet_name ? ` – ${meta.pet_name}` : ''}${meta.diagnosis_date ? ` (${meta.diagnosis_date})` : ''}`;
    case 'lab_report':
      return `Lab report${meta.pet_name ? ` – ${meta.pet_name}` : ''}${meta.report_type ? ` (${meta.report_type})` : ''}`;
    case 'outbreak_risk_model':
      return `Outbreak risk model${meta.risk_level ? ` – ${meta.risk_level} risk` : ''}`;
    case 'billing':
      return meta.bill_number ? `Bill ${meta.bill_number}` : `Bill #${source.source_id}`;
    case 'billing_summary':
      return `Revenue summary${meta.start_date && meta.end_date ? ` (${meta.start_date} to ${meta.end_date})` : ''}`;
    default:
      return `${source.source_type} #${source.source_id}`;
  }
};

export const allSourcesAreFaq = (sources) =>
  sources.length > 0 && sources.every((s) => s.source_type === 'faq' || s.source_type === 'staff_faq');
