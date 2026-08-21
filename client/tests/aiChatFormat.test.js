import { describe, test, expect } from 'vitest';
import { getSourceLabel, allSourcesAreFaq } from '../src/utils/aiChatFormat.jsx';

describe('getSourceLabel', () => {
  test('faq source uses the question text', () => {
    const label = getSourceLabel({ source_type: 'faq', source_id: 12, metadata: { question: 'What are your opening hours?' } });
    expect(label).toBe('What are your opening hours?');
  });

  test('faq source falls back to an id when metadata is missing', () => {
    const label = getSourceLabel({ source_type: 'faq', source_id: 12, metadata: {} });
    expect(label).toBe('FAQ #12');
  });

  test('medical_record includes pet name and formatted date', () => {
    const label = getSourceLabel({
      source_type: 'medical_record',
      source_id: 1,
      metadata: { pet_name: 'Max', visit_date: '2026-01-14' },
    });
    expect(label).toBe('Medical record – Max (14 January 2026)');
  });

  test('medical_record with no metadata still reads as a label, not undefined', () => {
    const label = getSourceLabel({ source_type: 'medical_record', source_id: 1, metadata: {} });
    expect(label).toBe('Medical record');
  });

  test('the three risk-model source types carry no metadata by design', () => {
    expect(getSourceLabel({ source_type: 'pet_disease_risk_model', source_id: 'PET-0003' })).toBe('Disease risk model');
    expect(getSourceLabel({ source_type: 'cancer_risk_model', source_id: 'PET-0003' })).toBe('Cancer risk model');
    expect(getSourceLabel({ source_type: 'pandemic_risk_model', source_id: 'current' })).toBe('Pandemic risk model');
  });

  test('billing_summary picks a revenue-range label when both dates are present', () => {
    const label = getSourceLabel({
      source_type: 'billing_summary',
      source_id: 1,
      metadata: { start_date: '2026-08-01', end_date: '2026-08-21' },
    });
    expect(label).toBe('Revenue summary (01 August 2026 to 21 August 2026)');
  });

  test('an unlisted source_type falls back to a humanized default rather than crashing', () => {
    const label = getSourceLabel({ source_type: 'some_future_type', source_id: 5 });
    expect(label).toBe('some future type #5');
  });
});

describe('allSourcesAreFaq', () => {
  test('true when every source is faq or staff_faq', () => {
    expect(allSourcesAreFaq([{ source_type: 'faq' }, { source_type: 'staff_faq' }])).toBe(true);
  });

  test('false when any source is not an FAQ type', () => {
    expect(allSourcesAreFaq([{ source_type: 'faq' }, { source_type: 'medical_record' }])).toBe(false);
  });

  test('false for an empty source list (nothing to ground the answer in)', () => {
    expect(allSourcesAreFaq([])).toBe(false);
  });
});
