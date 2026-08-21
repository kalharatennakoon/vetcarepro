"""
FAQ Seed Data
Static general pet-care FAQs and clinic policies. This is PUBLIC content -
visible to guest (unauthenticated) users as well as staff and pet owners.

Edit/extend this list as needed; re-run ingest_faqs() after changes to
re-embed and upsert into rag_chunks.
"""

FAQS = [
    {
        'id': 'general-001',
        'category': 'general',
        'question': 'How often should my pet see a veterinarian?',
        'answer': (
            'Most healthy adult dogs and cats should have a wellness check-up '
            'at least once a year. Puppies, kittens, senior pets, and those with '
            'ongoing health conditions typically need more frequent visits - '
            'ask your veterinarian for a schedule tailored to your pet.'
        ),
    },
    {
        'id': 'general-002',
        'category': 'vaccinations',
        'question': 'What vaccinations does my pet need?',
        'answer': (
            'Core vaccines (e.g. rabies, distemper, parvovirus for dogs; '
            'panleukopenia and calicivirus for cats) are recommended for nearly '
            'all pets. Non-core vaccines depend on lifestyle and regional risk. '
            'Your veterinarian can confirm the right schedule for your pet.'
        ),
    },
    {
        'id': 'general-003',
        'category': 'nutrition',
        'question': 'How do I know if my pet is at a healthy weight?',
        'answer': (
            'You should be able to feel (but not see prominently) your pet\'s '
            'ribs, and see a visible waist from above. If you\'re unsure, a '
            'veterinarian or vet tech can do a quick body condition score check '
            'during a visit.'
        ),
    },
    {
        'id': 'general-004',
        'category': 'emergency',
        'question': 'What counts as a pet emergency?',
        'answer': (
            'Difficulty breathing, uncontrolled bleeding, suspected poisoning, '
            'inability to urinate, seizures, collapse, or severe trauma are all '
            'emergencies - seek immediate veterinary care rather than waiting '
            'for a routine appointment.'
        ),
    },
    {
        'id': 'general-005',
        'category': 'aftercare',
        'question': 'How do I care for my pet after surgery?',
        'answer': (
            'Follow the specific discharge instructions given by your '
            'veterinarian. General guidance: keep your pet calm and restrict '
            'activity, use an e-collar if provided to prevent licking/chewing '
            'the incision site, and contact the clinic if you notice swelling, '
            'discharge, or your pet stops eating.'
        ),
    },
    {
        'id': 'general-006',
        'category': 'parasites',
        'question': 'Does my pet need flea and tick prevention year-round?',
        'answer': (
            'In most climates, year-round prevention is recommended since fleas '
            'and ticks can survive indoors and in mild weather. Ask your '
            'veterinarian about the best product for your pet\'s species, '
            'weight, and lifestyle.'
        ),
    },
    {
        'id': 'parasites-002',
        'category': 'parasites',
        'question': 'How do I know if my dog or cat has ticks?',
        'answer': (
            'Check your pet\'s skin and fur regularly, especially after time '
            'outdoors in grassy or wooded areas - ticks look like small, flat, '
            'brown or black bumps and are often found around the ears, neck, '
            'under the collar, and between the toes. If you find one, remove '
            'it promptly with a tick remover tool or fine-tipped tweezers, '
            'pulling straight out with steady pressure, and contact your '
            'veterinarian if your pet later seems unwell or the bite area '
            'looks infected.'
        ),
    },
    {
        'id': 'clinic-001',
        'category': 'clinic_policy',
        'question': 'How do I book an appointment?',
        'answer': (
            'You can book an appointment by contacting the clinic directly by '
            'phone, or through the VetCare Pro portal if you have an account.'
        ),
    },
    {
        'id': 'clinic-002',
        'category': 'clinic_policy',
        'question': 'What should I bring to my pet\'s first appointment?',
        'answer': (
            'Bring any prior medical records, current medications, vaccination '
            'history, and a list of questions or concerns you have about your '
            'pet\'s health.'
        ),
    },
    {
        'id': 'clinic-003',
        'category': 'clinic_policy',
        'question': 'How do I cancel or reschedule an appointment?',
        'answer': (
            'Contact the clinic directly by phone, or through the VetCare Pro '
            'portal if you have an account, as soon as you know you need to '
            'change your appointment so the time slot can be offered to '
            'someone else.'
        ),
    },
    {
        'id': 'general-007',
        'category': 'general',
        'question': 'Should I get my pet spayed or neutered?',
        'answer': (
            'Spaying/neutering is recommended for most pets not intended for '
            'breeding - it helps prevent certain cancers and reproductive '
            'infections, unwanted litters, and some behavioral issues. Your '
            'veterinarian can advise on the right timing based on your pet\'s '
            'species, breed, and health.'
        ),
    },
    {
        'id': 'general-008',
        'category': 'general',
        'question': 'What deworming schedule does my pet need?',
        'answer': (
            'Puppies and kittens typically need deworming every 2-3 weeks '
            'until 12 weeks old, then regularly through adulthood based on '
            'lifestyle and regional risk. Ask your veterinarian for a schedule '
            'tailored to your pet.'
        ),
    },
    {
        'id': 'general-009',
        'category': 'general',
        'question': 'What are signs my senior pet may need extra care?',
        'answer': (
            'Decreased mobility or stiffness, weight change, cloudy eyes, bad '
            'breath, increased thirst or urination, and behavior changes can '
            'all signal age-related conditions. Senior pets (generally 7+ '
            'years, earlier for large breeds) benefit from more frequent '
            'check-ups so issues are caught early.'
        ),
    },
    {
        'id': 'dental-001',
        'category': 'dental',
        'question': 'How important is dental care for my pet?',
        'answer': (
            'Very - dental disease is one of the most common health issues in '
            'dogs and cats and can affect other organs if left untreated. '
            'Regular tooth brushing, dental chews, and professional cleanings '
            'recommended by your veterinarian all help prevent it.'
        ),
    },
    {
        'id': 'nutrition-002',
        'category': 'nutrition',
        'question': 'Which human foods are dangerous for my pet?',
        'answer': (
            'Chocolate, grapes and raisins, onions, garlic, xylitol (found in '
            'sugar-free gum and some peanut butter), alcohol, and caffeine are '
            'all toxic to dogs and cats. If your pet eats any of these, '
            'contact your veterinarian or an emergency clinic immediately.'
        ),
    },
    {
        'id': 'emergency-002',
        'category': 'emergency',
        'question': 'My pet was bitten by a stray dog or cat - what should I do?',
        'answer': (
            'Clean the wound gently and seek veterinary care right away - bite '
            'wounds can become infected, and since rabies is present in stray '
            'animal populations in Sri Lanka, your pet\'s rabies vaccination '
            'status will need to be checked. Do not wait for symptoms to '
            'appear before getting care.'
        ),
    },
    {
        'id': 'ai-001',
        'category': 'ai_assistant',
        'question': 'What can the VetCare Pro AI assistant help me with?',
        'answer': (
            'Anyone can ask it general pet-care questions. Once you sign in as '
            'a pet owner, it can also summarize your own pet\'s medical history, '
            'consultation notes, and aftercare instructions in plain language. '
            'Clinic staff additionally use it to get plain-language explanations '
            'of forecasting models such as disease outbreak risk, sales, and '
            'inventory predictions.'
        ),
    },
    {
        'id': 'ai-002',
        'category': 'ai_assistant',
        'question': 'Is the AI assistant a replacement for my veterinarian?',
        'answer': (
            'No. The AI assistant is a decision-support tool only - it never '
            'gives a diagnosis or prescribes treatment, for pet owners or for '
            'clinic staff. Always follow up with a licensed veterinarian for '
            'anything related to your pet\'s actual health or care.'
        ),
    },
    {
        'id': 'ai-003',
        'category': 'ai_assistant',
        'question': 'Where does the AI assistant get its answers from?',
        'answer': (
            'It\'s grounded in trusted VetCare Pro data - these FAQs, general '
            'care instructions, and, once you\'re signed in, your own pet\'s '
            'records - rather than making things up. As a guest, if a question '
            'isn\'t covered by that data it will fall back to general veterinary '
            'knowledge for common pet-care topics; signed-in owner and staff '
            'answers stick strictly to your own clinic records.'
        ),
    },
    {
        'id': 'ai-004',
        'category': 'ai_assistant',
        'question': 'Can the AI assistant see my pet\'s medical records?',
        'answer': (
            'Only if you\'re signed in as that pet\'s owner, and even then it '
            'only sees your own pets, never anyone else\'s. As a guest '
            '(not signed in), it only has access to general public FAQs and '
            'care information, never private clinic or pet data. Clinic staff '
            'have broader access to clinic records based on their role.'
        ),
    },
    {
        'id': 'ai-005',
        'category': 'ai_assistant',
        'question': 'Can the AI assistant summarize my pet\'s medical history?',
        'answer': (
            'Yes - once signed in as your pet\'s owner, you can ask the '
            'assistant to summarize your pet\'s medical history, recent '
            'consultation notes, or aftercare instructions in plain, '
            'easy-to-follow language.'
        ),
    },
    {
        'id': 'platform-001',
        'category': 'platform',
        'question': 'Is VetCare Pro available on mobile?',
        'answer': (
            'Yes - VetCare Pro has an iOS app for pet owners and the public '
            'alongside the web platform, so you can check pet records, book '
            'appointments, and use the AI assistant on the go. There is no '
            'Android app at this time. Clinic staff use the web platform '
            'only.'
        ),
    },
]

# Internal/operational FAQs for clinic staff - NOT public. Ingested with
# source_type='staff_faq' (see chunking.chunk_staff_faq), which guest and
# pet_owner retrieval explicitly exclude even though these chunks also have
# pet_id/customer_id NULL (see retrieval.py). Kept deliberately small and
# front-desk-focused for now (receptionist is the first staff role being
# configured) - extend as more staff roles/workflows are covered.
STAFF_FAQS = [
    {
        'id': 'staff-001',
        'category': 'front_desk',
        'question': 'How do I book, reschedule, or cancel an appointment for a customer?',
        'answer': (
            'Use the Appointments section to create a new appointment, or '
            'open an existing one to change its date, time, or status. If a '
            'customer needs to cancel, update the appointment status rather '
            'than deleting the record, so the visit history is kept.'
        ),
    },
    {
        'id': 'staff-002',
        'category': 'front_desk',
        'question': 'How do I register a new customer and their pet?',
        'answer': (
            'Add the customer first from the Customers section, then add '
            'their pet(s) from the Pets section (or directly from the '
            'customer\'s profile). There is no default portal password to '
            'hand out - the customer sets their own the first time they log '
            'in, from the login page\'s "Set Up Your Account" option, by '
            'confirming the email and phone number the clinic has on file '
            'and then choosing a password themselves.'
        ),
    },
    {
        'id': 'staff-003',
        'category': 'front_desk',
        'question': 'How do I check a customer\'s outstanding balance or record a payment?',
        'answer': (
            'Open the Billing section to see outstanding and paid invoices '
            'for a customer, and record a new payment against a bill from '
            'there.'
        ),
    },
    {
        'id': 'staff-004',
        'category': 'front_desk',
        'question': 'What do I do if a customer asks about their pet\'s diagnosis or treatment?',
        'answer': (
            'Receptionists don\'t have access to diagnosis, treatment, or '
            'other clinical details in this system - politely let the '
            'customer know a veterinarian will need to answer that, and '
            'offer to book a follow-up appointment if needed.'
        ),
    },
    {
        'id': 'staff-005',
        'category': 'front_desk',
        'question': 'How do I check whether an inventory item is in stock?',
        'answer': (
            'Open the Inventory section and search for the item - it shows '
            'the current quantity and flags items that are low or out of '
            'stock.'
        ),
    },
]