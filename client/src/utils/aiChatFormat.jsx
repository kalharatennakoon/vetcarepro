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

// Metadata dates arrive as ISO strings (YYYY-MM-DD) - the correct wire
// format, matching what the DB/Python side stores and computes with. The
// answer prose renders the same dates as "05 January 2024" via _fmt_date on
// the Python side (ml/scripts/rag/structured_query.py), so a chip showing
// the raw ISO string underneath that prose reads as two different dates for
// the same fact. Reformatting only the display, only here, keeps the wire
// format (and every other consumer of `metadata`) untouched.
const formatChipDate = (isoDate) => {
  if (!isoDate) return isoDate;
  // Parsed as local midnight (not `new Date(isoDate)`, which parses
  // date-only strings as UTC midnight and can roll back a day in any
  // timezone behind UTC).
  const parsed = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return isoDate;
  return parsed.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
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
      return `Medical record${meta.pet_name ? ` – ${meta.pet_name}` : ''}${meta.visit_date ? ` (${formatChipDate(meta.visit_date)})` : ''}`;
    case 'vaccination': {
      // Two different handlers emit this source_type under two different
      // date keys for two genuinely different things: _last_vaccination_for_pet's
      // vaccination_date is one exact dose; _list_vaccinations_for_pet's
      // first_date is a MIN() across however many doses of that vaccine the
      // pet has had (structured_query.py). Either is worth showing on the chip.
      const vaccinationDate = meta.vaccination_date || meta.first_date;
      return `${meta.vaccine_name || 'Vaccination'}${meta.pet_name ? ` – ${meta.pet_name}` : ''}${vaccinationDate ? ` (${formatChipDate(vaccinationDate)})` : ''}`;
    }
    case 'disease_case':
      return `${meta.disease_name || 'Disease case'}${meta.pet_name ? ` – ${meta.pet_name}` : ''}${meta.diagnosis_date ? ` (${formatChipDate(meta.diagnosis_date)})` : ''}`;
    case 'lab_report':
      return `Lab report${meta.pet_name ? ` – ${meta.pet_name}` : ''}${meta.report_type ? ` (${meta.report_type})` : ''}`;
    case 'outbreak_risk_model':
      return `Outbreak risk model${meta.risk_level ? ` – ${meta.risk_level} risk` : ''}`;
    // The three risk-model types below (pet_health_intent.py) carry no
    // metadata at all - source_id is just a pet_id (or 'current' for the
    // clinic-wide pandemic one), not something worth surfacing in a chip.
    case 'pet_disease_risk_model':
      return 'Disease risk model';
    case 'cancer_risk_model':
      return 'Cancer risk model';
    case 'pandemic_risk_model':
      return 'Pandemic risk model';
    case 'appointment':
      return `Appointment${meta.appointment_date ? ` (${formatChipDate(meta.appointment_date)})` : ''}${meta.status ? ` – ${meta.status.replace(/_/g, ' ')}` : ''}`;
    case 'inventory':
      return `${meta.item_name || 'Inventory item'}${meta.expiry_date ? ` (expires ${formatChipDate(meta.expiry_date)})` : ''}`;
    case 'pet':
    case 'pets':
      return meta.pet_name ? `Pet – ${meta.pet_name}` : 'Pet record';
    case 'customer':
      return meta.name ? `Customer – ${meta.name}` : 'Customer record';
    case 'user':
      return meta.name || 'Staff member';
    case 'clinic_settings': {
      const settingLabels = {
        business_hours: 'Business hours',
        clinic_address: 'Clinic address',
        clinic_contact: 'Clinic contact info',
      };
      return settingLabels[source.source_id] || 'Clinic settings';
    }
    case 'billing':
      return meta.bill_number ? `Bill ${meta.bill_number}` : `Bill #${source.source_id}`;
    // The four "_summary" types below back a pure count/aggregate answer
    // (see _summary_source in structured_query.py) rather than a list of
    // individually-named items, so there's exactly one of these chips per
    // answer - the label just needs to say what was counted.
    case 'billing_summary':
      if (meta.start_date && meta.end_date) return `Revenue summary (${formatChipDate(meta.start_date)} to ${formatChipDate(meta.end_date)})`;
      if (meta.payment_method) return `Billing summary – ${meta.payment_method.replace(/_/g, ' ')}`;
      return 'Billing summary';
    case 'appointment_summary':
      if (meta.vet_name) return `Appointment summary – Dr. ${meta.vet_name}`;
      if (meta.status) return `Appointment summary – ${meta.status.replace(/_/g, ' ')}`;
      if (meta.start_date && meta.end_date) return `Appointment summary (${formatChipDate(meta.start_date)} to ${formatChipDate(meta.end_date)})`;
      return 'Appointment summary';
    case 'disease_case_summary':
      if (meta.category) return `Disease case summary – ${meta.category.replace(/_/g, ' ')}`;
      if (meta.severity) return `Disease case summary – ${meta.severity}`;
      return 'Disease case summary (contagious)';
    case 'vaccination_summary':
      return `Vaccination summary${meta.pet_name ? ` – ${meta.pet_name}` : ''}`;
    // Last resort for a source_type that gains no case above (a future
    // addition, or one of the very rare handlers that pass an unlisted
    // type) - at least reads as words instead of a raw snake_case DB name.
    default:
      return `${source.source_type.replace(/_/g, ' ')} #${source.source_id}`;
  }
};

export const allSourcesAreFaq = (sources) =>
  sources.length > 0 && sources.every((s) => s.source_type === 'faq' || s.source_type === 'staff_faq');
