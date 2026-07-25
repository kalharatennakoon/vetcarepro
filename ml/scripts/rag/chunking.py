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
