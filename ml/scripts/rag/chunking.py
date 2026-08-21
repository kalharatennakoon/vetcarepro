"""
Chunking
Converts structured clinic records into clean text chunks suitable for
embedding. One function per source_type. Add new ones here as we expand
ingestion beyond medical_records.
"""


def chunk_medical_record(row: dict) -> dict:
    """
    Build a RAG chunk from a medical_records row (joined with pet/customer info).

    Expects row to contain:
        record_id, pet_id, customer_id, pet_name, species, breed, visit_date,
        chief_complaint, symptoms, diagnosis, treatment, prescription,
        follow_up_required, follow_up_date, veterinarian_name
    """
    lines = [
        f"Medical record for {row.get('pet_name', 'unknown pet')} "
        f"({row.get('species', '')} {row.get('breed', '') or ''}).".strip(),
        f"Visit date: {row.get('visit_date')}",
    ]

    if row.get('chief_complaint'):
        lines.append(f"Chief complaint: {row['chief_complaint']}")
    if row.get('symptoms'):
        lines.append(f"Symptoms: {row['symptoms']}")
    if row.get('diagnosis'):
        lines.append(f"Diagnosis: {row['diagnosis']}")
    if row.get('treatment'):
        lines.append(f"Treatment: {row['treatment']}")
    if row.get('prescription'):
        lines.append(f"Prescription: {row['prescription']}")
    if row.get('follow_up_required'):
        lines.append(f"Follow-up required, date: {row.get('follow_up_date', 'not scheduled')}")
    if row.get('veterinarian_name'):
        lines.append(f"Attending veterinarian: {row['veterinarian_name']}")

    content = '\n'.join(lines)

    return {
        'source_type': 'medical_record',
        'source_id': str(row['record_id']),
        'pet_id': row.get('pet_id'),
        'customer_id': row.get('customer_id'),
        'content': content,
        'metadata': {
            'visit_date': str(row.get('visit_date')) if row.get('visit_date') else None,
            'pet_name': row.get('pet_name'),
        }
    }


def chunk_disease_case(row: dict) -> dict:
    """
    Build a RAG chunk from a disease_cases row (joined with pet/customer info).

    Expects row to contain:
        case_id, pet_id, customer_id, pet_name, species, breed, disease_name,
        disease_category, diagnosis_date, severity, outcome, symptoms,
        is_contagious, transmission_method, notes, requires_followup,
        next_followup_date
    """
    lines = [
        f"Disease case for {row.get('pet_name', 'unknown pet')} "
        f"({row.get('species', '')} {row.get('breed', '') or ''}).".strip(),
        f"Disease: {row.get('disease_name')} ({row.get('disease_category', 'uncategorized')})",
        f"Diagnosis date: {row.get('diagnosis_date')}",
    ]

    if row.get('severity'):
        lines.append(f"Severity: {row['severity']}")
    if row.get('outcome'):
        lines.append(f"Outcome: {row['outcome']}")
    if row.get('symptoms'):
        lines.append(f"Symptoms: {row['symptoms']}")
    if row.get('is_contagious'):
        lines.append(
            f"Contagious: yes"
            + (f" (transmission: {row['transmission_method']})" if row.get('transmission_method') else '')
        )
    if row.get('requires_followup'):
        lines.append(f"Follow-up required, next date: {row.get('next_followup_date', 'not scheduled')}")
    if row.get('notes'):
        lines.append(f"Notes: {row['notes']}")

    content = '\n'.join(lines)

    return {
        'source_type': 'disease_case',
        'source_id': str(row['case_id']),
        'pet_id': row.get('pet_id'),
        'customer_id': row.get('customer_id'),
        'content': content,
        'metadata': {
            'diagnosis_date': str(row.get('diagnosis_date')) if row.get('diagnosis_date') else None,
            'pet_name': row.get('pet_name'),
            'disease_name': row.get('disease_name'),
            'severity': row.get('severity'),
        }
    }


def chunk_lab_report(row: dict) -> dict:
    """
    Build a RAG chunk from a lab_reports row (joined with pet/customer info).
    Note: only metadata + notes are chunked, not the file itself (PDF/image
    text extraction can be added later - see docs/ai-assistant-requirements.md).

    Expects row to contain:
        report_id, pet_id, customer_id, pet_name, report_name, report_type,
        notes, created_at
    """
    lines = [
        f"Lab report for {row.get('pet_name', 'unknown pet')}: {row.get('report_name')} "
        f"({row.get('report_type')}).",
        f"Date: {row.get('created_at')}",
    ]
    if row.get('notes'):
        lines.append(f"Notes: {row['notes']}")

    content = '\n'.join(lines)

    return {
        'source_type': 'lab_report',
        'source_id': str(row['report_id']),
        'pet_id': row.get('pet_id'),
        'customer_id': row.get('customer_id'),
        'content': content,
        'metadata': {
            'report_type': row.get('report_type'),
            'pet_name': row.get('pet_name'),
        }
    }


def chunk_vaccination(row: dict) -> dict:
    """
    Build a RAG chunk from a vaccinations row (joined with pet/customer info).

    Expects row to contain:
        vaccination_id, pet_id, customer_id, pet_name, species, breed,
        vaccine_name, vaccine_type, vaccination_date, next_due_date,
        manufacturer, adverse_reaction, reaction_details, administered_by_name,
        notes
    """
    lines = [
        f"Vaccination record for {row.get('pet_name', 'unknown pet')} "
        f"({row.get('species', '')} {row.get('breed', '') or ''}).".strip(),
        f"Vaccine: {row.get('vaccine_name')}"
        + (f" ({row['vaccine_type']})" if row.get('vaccine_type') else ''),
        f"Date administered: {row.get('vaccination_date')}",
    ]

    if row.get('next_due_date'):
        lines.append(f"Next due date: {row['next_due_date']}")
    if row.get('manufacturer'):
        lines.append(f"Manufacturer: {row['manufacturer']}")
    if row.get('adverse_reaction'):
        lines.append(
            f"Adverse reaction: yes"
            + (f" - {row['reaction_details']}" if row.get('reaction_details') else '')
        )
    if row.get('administered_by_name'):
        lines.append(f"Administered by: {row['administered_by_name']}")
    if row.get('notes'):
        lines.append(f"Notes: {row['notes']}")

    content = '\n'.join(lines)

    return {
        'source_type': 'vaccination',
        'source_id': str(row['vaccination_id']),
        'pet_id': row.get('pet_id'),
        'customer_id': row.get('customer_id'),
        'content': content,
        'metadata': {
            'vaccination_date': str(row.get('vaccination_date')) if row.get('vaccination_date') else None,
            'pet_name': row.get('pet_name'),
            'vaccine_name': row.get('vaccine_name'),
        }
    }


def chunk_faq(faq: dict) -> dict:
    """
    Build a RAG chunk from a static FAQ / care-instruction entry.
    These are PUBLIC (pet_id and customer_id are None), so they're visible
    to guest/public users as well as staff and pet owners.

    Expects faq to contain: id, category, question, answer
    """
    content = f"Q: {faq['question']}\nA: {faq['answer']}"

    return {
        'source_type': 'faq',
        'source_id': str(faq['id']),
        'pet_id': None,
        'customer_id': None,
        'content': content,
        'metadata': {
            'category': faq.get('category'),
            'question': faq.get('question'),
        }
    }


def chunk_staff_faq(faq: dict) -> dict:
    """
    Build a RAG chunk from a static staff/internal FAQ entry (see
    faq_data.STAFF_FAQS). Also has pet_id/customer_id None like chunk_faq,
    but uses a distinct source_type='staff_faq' so guest and pet_owner
    retrieval - which otherwise match on "pet_id IS NULL AND customer_id IS
    NULL" - can explicitly exclude it (see retrieval.py).

    Expects faq to contain: id, category, question, answer
    """
    content = f"Q: {faq['question']}\nA: {faq['answer']}"

    return {
        'source_type': 'staff_faq',
        'source_id': str(faq['id']),
        'pet_id': None,
        'customer_id': None,
        'content': content,
        'metadata': {
            'category': faq.get('category'),
            'question': faq.get('question'),
        }
    }