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

// Renders assistant replies with basic markdown-style formatting - bold
// text, bullet/numbered lists, and paragraph breaks - without pulling in a
// markdown dependency for what the local model produces. Shared by the
// guest, pet-owner, and staff chat UIs so all three render consistently.
// `listClassName` lets each surface keep its own list styling.
export const formatMessageContent = (content, { listClassName = 'ai-message-list' } = {}) => {
  const blocks = content.trim().split(/\n\s*\n/);

  return blocks.map((block, i) => {
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
    const isBulletList = lines.length > 0 && lines.every((l) => /^[-*]\s+/.test(l));
    const isNumberedList = lines.length > 0 && lines.every((l) => /^\d+[.)]\s+/.test(l));

    if (isBulletList) {
      return (
        <ul key={i} className={listClassName}>
          {lines.map((l, j) => <li key={j}>{formatInlineText(l.replace(/^[-*]\s+/, ''))}</li>)}
        </ul>
      );
    }
    if (isNumberedList) {
      return (
        <ol key={i} className={listClassName}>
          {lines.map((l, j) => <li key={j}>{formatInlineText(l.replace(/^\d+[.)]\s+/, ''))}</li>)}
        </ol>
      );
    }
    return (
      <p key={i}>
        {lines.map((l, j) => (
          <Fragment key={j}>
            {j > 0 && <br />}
            {formatInlineText(l)}
          </Fragment>
        ))}
      </p>
    );
  });
};

// Turns a rag_chunks source (as returned by /api/ml/rag/chat) into a short
// human-readable label, using whatever metadata that source_type carries -
// see ml/scripts/rag/chunking.py for the metadata shape per source_type.
export const getSourceLabel = (source) => {
  const meta = source.metadata || {};
  switch (source.source_type) {
    case 'faq':
      return meta.question || `FAQ #${source.source_id}`;
    case 'medical_record':
      return `Medical record${meta.pet_name ? ` – ${meta.pet_name}` : ''}${meta.visit_date ? ` (${meta.visit_date})` : ''}`;
    case 'vaccination':
      return `${meta.vaccine_name || 'Vaccination'}${meta.pet_name ? ` – ${meta.pet_name}` : ''}${meta.vaccination_date ? ` (${meta.vaccination_date})` : ''}`;
    case 'disease_case':
      return `${meta.disease_name || 'Disease case'}${meta.pet_name ? ` – ${meta.pet_name}` : ''}${meta.diagnosis_date ? ` (${meta.diagnosis_date})` : ''}`;
    case 'lab_report':
      return `Lab report${meta.pet_name ? ` – ${meta.pet_name}` : ''}${meta.report_type ? ` (${meta.report_type})` : ''}`;
    default:
      return `${source.source_type} #${source.source_id}`;
  }
};

export const allSourcesAreFaq = (sources) =>
  sources.length > 0 && sources.every((s) => s.source_type === 'faq');
