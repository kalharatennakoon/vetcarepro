/**
 * Static FAQ content served to guests via GET /api/ai/faqs.
 *
 * This mirrors ml/scripts/rag/faq_data.py — the same list that gets
 * embedded into the RAG vector store via POST /api/ml/rag/ingest/faqs.
 * Keep the two in sync: if you add/edit an entry here, add/edit it there
 * too (and re-run the ingest) so the FAQ page and the AI Assistant give
 * consistent answers.
 */

const FAQ_CATEGORIES = [
  { id: 'general', label: 'General Care' },
  { id: 'vaccinations', label: 'Vaccinations' },
  { id: 'nutrition', label: 'Nutrition & Weight' },
  { id: 'parasites', label: 'Parasite Prevention' },
  { id: 'emergency', label: 'Emergency' },
  { id: 'aftercare', label: 'Aftercare' },
  { id: 'clinic_policy', label: 'Appointments & Policies' }
];

const FAQS = [
  {
    id: 'general-001',
    category: 'general',
    question: 'How often should my pet see a veterinarian?',
    answer:
      'Most healthy adult dogs and cats should have a wellness check-up ' +
      'at least once a year. Puppies, kittens, senior pets, and those with ' +
      'ongoing health conditions typically need more frequent visits - ' +
      'ask your veterinarian for a schedule tailored to your pet.'
  },
  {
    id: 'general-002',
    category: 'vaccinations',
    question: 'What vaccinations does my pet need?',
    answer:
      'Core vaccines (e.g. rabies, distemper, parvovirus for dogs; ' +
      'panleukopenia and calicivirus for cats) are recommended for nearly ' +
      'all pets. Non-core vaccines depend on lifestyle and regional risk. ' +
      'Your veterinarian can confirm the right schedule for your pet.'
  },
  {
    id: 'general-003',
    category: 'nutrition',
    question: 'How do I know if my pet is at a healthy weight?',
    answer:
      "You should be able to feel (but not see prominently) your pet's " +
      'ribs, and see a visible waist from above. If you\u2019re unsure, a ' +
      'veterinarian or vet tech can do a quick body condition score check ' +
      'during a visit.'
  },
  {
    id: 'general-004',
    category: 'emergency',
    question: 'What counts as a pet emergency?',
    answer:
      'Difficulty breathing, uncontrolled bleeding, suspected poisoning, ' +
      'inability to urinate, seizures, collapse, or severe trauma are all ' +
      'emergencies - seek immediate veterinary care rather than waiting ' +
      'for a routine appointment.'
  },
  {
    id: 'general-005',
    category: 'aftercare',
    question: 'How do I care for my pet after surgery?',
    answer:
      'Follow the specific discharge instructions given by your ' +
      'veterinarian. General guidance: keep your pet calm and restrict ' +
      'activity, use an e-collar if provided to prevent licking/chewing ' +
      'the incision site, and contact the clinic if you notice swelling, ' +
      'discharge, or your pet stops eating.'
  },
  {
    id: 'general-006',
    category: 'parasites',
    question: 'Does my pet need flea and tick prevention year-round?',
    answer:
      'In most climates, year-round prevention is recommended since fleas ' +
      'and ticks can survive indoors and in mild weather. Ask your ' +
      "veterinarian about the best product for your pet's species, " +
      'weight, and lifestyle.'
  },
  {
    id: 'clinic-001',
    category: 'clinic_policy',
    question: 'How do I book an appointment?',
    answer:
      'You can book an appointment by contacting the clinic directly by ' +
      'phone, or through the VetCare Pro portal if you have an account.'
  },
  {
    id: 'clinic-002',
    category: 'clinic_policy',
    question: "What should I bring to my pet's first appointment?",
    answer:
      'Bring any prior medical records, current medications, vaccination ' +
      'history, and a list of questions or concerns you have about your ' +
      "pet's health."
  }
];

export { FAQ_CATEGORIES, FAQS };
