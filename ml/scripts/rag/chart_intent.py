"""
Chart Intent

Turns an explicit "chart/graph/plot this" request into a small bar- or
pie-chart payload the web client renders with recharts, instead of a
sentence. Bar is the default; "pie" anywhere in the question (see
CHART_TYPE_PIE) switches the same data into a pie instead - chart *type* is
independent of chart *category* (which data gets charted).

Two rules shape everything here:

  1. **Explicit trigger only.** A chart is never produced for a plain data
     question. "What's our revenue this month?" gets the normal one-line
     structured answer; only "graph revenue by month" gets a chart. Guessing
     that a question "looks chart-shaped" would put a visualization in front
     of someone who asked for a number, and the trigger word is the only
     unambiguous signal that a picture is actually wanted.
  2. **Staff-only, and three categories narrower still.** Guest and
     pet_owner return None (fall through to the normal pipeline, never an
     error - same convention as the staff-only patterns in
     structured_query.py). A role inside STAFF_ROLES that asks for a
     category it can't see gets an explicit "I don't have access" decline
     instead - unlike the guest/pet_owner fallthrough, silently handing this
     off to RAG would either produce a confusing non-answer (there's no FAQ
     content about veterinarian performance) or, worse, look like the
     assistant is granting access the rest of the app denies. Three
     categories are gated narrower than plain STAFF_ROLES, each matching an
     existing restriction elsewhere in the app rather than inventing a new
     one:
       - Disease-case charts: CLINICAL_STAFF_ROLES (admin, veterinarian) -
         matches vetOrAdmin on diseaseCaseRoutes.js. Receptionist gets
         _clinical_detail_redirect().
       - Veterinarian-performance chart: admin only - matches
         reportRoutes.js's operational reports (authorize('admin')), which
         already include a 'veterinarian-performance' report type. Both
         veterinarian and receptionist get _admin_only_chart_redirect().
       - Revenue chart: BILLING_STAFF_ROLES (admin, receptionist) - matches
         adminOrReceptionist on GET /api/billing/stats/revenue. Veterinarian
         gets _billing_staff_redirect() (imported from structured_query.py,
         shared with its own _sum_revenue_timeframe gate - a veterinarian
         gets the same decline wording whether they ask for revenue as a
         chart or as a sentence). Note this is the one category where
         veterinarian, not receptionist, is the excluded role - the
         opposite shape from the other two.
     Appointments (status/over-time) and inventory levels stay open to every
     STAFF_ROLES member, matching those routes' authenticate-only GETs.

Like structured_query.py, every number here comes from real SQL - the model
is not involved in producing chart data at all.

This module imports FROM structured_query.py (roles, timeframe vocabulary,
the timeframe resolver, the clinical redirect) and must NOT be imported back
into it - structured_query.py is the base of this dependency chain and a
reverse import would make it circular. rag_service.py is the only caller.
"""

import re
import sys
import os
from datetime import date

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from config.db_connection import get_raw_db_connection
from scripts.rag.structured_query import (
    STAFF_ROLES,
    CLINICAL_STAFF_ROLES,
    BILLING_STAFF_ROLES,
    TIMEFRAME_WORDS,
    _resolve_timeframe,
    _clinical_detail_redirect,
    _billing_staff_redirect,
)

# The web design token used for primary data series (docs/design/design-system.md).
PRIMARY_COLOR = '#3b82f6'
# Second series in a two-series comparison (e.g. stock vs reorder level).
SECONDARY_COLOR = '#fa709a'

# The whole feature hangs off this: no trigger word, no chart, no exceptions.
# Deliberately a small closed set of words people use when they actually want
# a picture - not "show"/"list"/"break down", which are how someone asks for
# the same data as text.
CHART_TRIGGER = re.compile(
    r'\b(?:chart|graph|plot|visuali[sz]e|visuali[sz]ations?|visuali[sz]ation|pie)\b',
    re.IGNORECASE
)

# Chart *type*, independent of which category matched above. "pie" is the
# only word that unambiguously requests a pie chart in this domain; anything
# else (including a bare "chart"/"graph") keeps the long-standing bar-chart
# default. Deliberately also part of CHART_TRIGGER above, so "pie chart of
# disease cases by category" doesn't need a second trigger word.
CHART_TYPE_PIE = re.compile(r'\bpie\b', re.IGNORECASE)


def _requested_chart_type(question: str) -> str:
    return 'pie' if CHART_TYPE_PIE.search(question) else 'bar'

# Category patterns, checked most-specific-first in try_chart_intent below.
# Each is written both ways round ("disease cases by category" / "category of
# disease cases") because either phrasing is natural once a trigger word is
# already in the sentence.
DISEASE_BY_CATEGORY = re.compile(
    r'\bdisease\b.*\b(?:categor(?:y|ies)|types?)\b|'
    r'\b(?:categor(?:y|ies)|types?)\b.*\bdisease\b',
    re.IGNORECASE
)

DISEASE_BY_SEVERITY = re.compile(
    r'\bdisease\b.*\bsever(?:ity|ities)\b|'
    r'\bsever(?:ity|ities)\b.*\bdisease\b',
    re.IGNORECASE
)

APPOINTMENTS_BY_STATUS = re.compile(
    r'\bappointments?\b.*\bstatus(?:es)?\b|'
    r'\bstatus(?:es)?\b.*\bappointments?\b',
    re.IGNORECASE
)

# "graph veterinarian performance", "chart vet performance", "appointments by
# doctor", "appointments per vet" - a per-veterinarian breakdown. Checked
# before APPOINTMENTS_BY_STATUS/APPOINTMENTS_OVER_TIME so "appointments by
# veterinarian" resolves here rather than falling into the generic over-time
# catch-all (which APPOINTMENTS_UNSUPPORTED_BREAKDOWN below used to have to
# guard against, back when this breakdown wasn't supported at all).
#
# "vet"/"doctor" is genuinely ambiguous in English: it can be the subject
# ("vet performance", "performance of vets") or an adjective on some other
# noun ("vet supplies", "vet products", "vet workload"). An earlier version
# of this pattern used unbounded .* on both sides of "performance", which
# matched the adjective case too - "graph inventory performance for vet
# supplies" and "chart sales performance of vet products" both matched,
# hijacking an inventory/revenue chart request into this admin-only
# category (and producing a false "you don't have access" denial for a
# receptionist who never asked about veterinarians at all). Two changes fix
# it: the vet/doctor term must sit right next to "performance" with only a
# short preposition between them, and a trailing lookahead requires the
# term to end the noun phrase - followed by nothing, punctuation, or one of
# a set of real continuations ("this month", "for the vets" ...) - rather
# than immediately modifying another noun.
_VET_TERM = r'(?:veterinarians?|vets?|doctors?)'

# Continuations that mean the vet term ENDED its noun phrase rather than
# modifying a following noun. An earlier version of this list was
# end-of-string, punctuation, and "this|last|next|and" only, which rejected
# several ordinary phrasings: "appointments by vet FOR this month",
# "appointments per doctor OVER the last month". Those fell through to the
# APPOINTMENTS_OVER_TIME catch-all and came back as an appointments-per-day
# chart titled "Appointments This Month" - a real chart silently answering a
# different question, which is precisely what the catch-all guard below
# exists to prevent.
#
# "and" is deliberately NOT here. It joins two things rather than closing
# one off, so "...for vets AND stock levels" would satisfy the lookahead
# while the question is plainly about stock. "performance of vets and
# doctors" loses out as a result, but that phrasing is already caught by
# the first alternative, and letting "and" through re-opens a narrow
# version of the adjective bug this lookahead exists to close.
_VET_TERM_ENDS_PHRASE = (
    r"(?=$|['.,!?;:]|\s+(?:this|last|next|for|over|in|during|between|from|"
    r"per|each|by|so\s+far|to\s+date|ytd)\b)"
)
# Determiners allowed between the connector and the vet term. An earlier
# version was missing "each"/"our", so "performance by EACH veterinarian"
# and "performance of OUR veterinarians" both failed.
_VET_DETERMINER = r'(?:all\s+|the\s+|each\s+|our\s+|every\s+|both\s+)?'
_PERF_CONNECTOR = rf'(?:of|for|among|across|by|per)\s+{_VET_DETERMINER}'

VET_PERFORMANCE = re.compile(
    rf'\b{_VET_TERM}\b\s+performance\b|'
    rf'\bperformance\b\s+{_PERF_CONNECTOR}{_VET_TERM}\b{_VET_TERM_ENDS_PHRASE}|'
    rf'\bappointments?\b.*\b(?:by|per)\s+{_VET_DETERMINER}{_VET_TERM}\b{_VET_TERM_ENDS_PHRASE}|'
    rf'\b(?:by|per)\s+{_VET_DETERMINER}{_VET_TERM}\b{_VET_TERM_ENDS_PHRASE}.*\bappointments?\b',
    re.IGNORECASE
)

# Belt-and-braces on top of the lookahead above. The lookahead decides
# whether the vet term is a subject or an adjective using local grammar
# alone; this asks a different question - does the sentence name a DIFFERENT
# chart subject entirely? "graph inventory performance for vets and stock
# levels" is about stock no matter how its clauses parse. Because
# VET_PERFORMANCE is checked before the inventory and revenue handlers, a
# wrong match here doesn't just draw the wrong chart - this category is
# admin-only, so it denies a receptionist data they're entitled to. Two
# independent guards is the right price for that failure mode.
VET_PERFORMANCE_FOREIGN_SUBJECT = re.compile(
    r'\b(?:inventory|stock|reorder|revenue|income|sales|earnings|'
    r'expiry|expiring|supplies|products)\b',
    re.IGNORECASE
)

# Deliberately broad: once "chart"/"graph" is present, any appointment question
# that isn't a status breakdown or a vet breakdown is a request to see them
# over time.
APPOINTMENTS_OVER_TIME = re.compile(r'\bappointments?\b', re.IGNORECASE)

# ...but not broad enough to swallow a breakdown this module doesn't support.
# "graph appointments by reason" would otherwise fall into the catch-all above
# and come back as an appointments-per-day chart titled "Appointments This
# Month" - a real chart, drawn from real data, silently answering a different
# question than the one asked. Falling through instead lets the rest of the
# pipeline respond (or decline) honestly, which is the same "ask rather than
# guess" discipline action_intent.py applies to ambiguous slots. "by
# vet(erinarian)/doctor" used to be listed here too, until VET_PERFORMANCE
# above gave it a real handler - it's checked first, so this catch-all no
# longer needs to name it.
APPOINTMENTS_UNSUPPORTED_BREAKDOWN = re.compile(
    r'\bby\s+(?:types?|reasons?|pets?|customers?|owners?|species|breeds?)\b',
    re.IGNORECASE
)

INVENTORY_LEVELS = re.compile(
    r'\b(?:inventory|stock|stock\s+levels?|reorder)\b',
    re.IGNORECASE
)

REVENUE_BY_MONTH = re.compile(r'\b(?:revenue|income|sales|earnings)\b', re.IGNORECASE)

# An explicit appointment-status word inside an appointments chart request -
# "graph completed appointments this year" - filters the query to that one
# status instead of blending every status into one series. Written against
# the same appointments.status enum as APPOINTMENT_STATUS_ORDER below.
APPOINTMENT_STATUS_WORD = re.compile(
    r'\b(scheduled|confirmed|in[\s-]?progress|completed|cancell?ed|no[\s-]?shows?)\b',
    re.IGNORECASE
)

# American spelling / plural forms that don't match the DB enum verbatim
# after underscore-normalizing whitespace and hyphens.
_STATUS_ALIASES = {'canceled': 'cancelled', 'no_shows': 'no_show'}

# "my"/"mine" - only meaningful for a veterinarian, whose appointments have a
# real owner (appointments.veterinarian_id). Admin and receptionist aren't
# assigned appointments themselves, so for them the word is left unmatched
# rather than guessed at - same as if it weren't in the question at all.
SELF_SCOPE = re.compile(r'\b(?:my|mine)\b', re.IGNORECASE)

# "last 3 months", "past 12 months", "previous 6 months".
MONTHS_BACK = re.compile(
    r'\b(?:last|past|previous|recent)\s+(\d{1,2})\s+months?\b',
    re.IGNORECASE
)

DEFAULT_MONTHS_BACK = 6
MIN_MONTHS_BACK = 2
MAX_MONTHS_BACK = 24

# A day-per-bar chart stops being readable somewhere around a month of bars;
# past that, roll up to months instead.
MAX_DAYS_FOR_DAILY_BUCKETS = 31

# Severity and status are ordinal, not magnitudes - ordering these by count
# would scramble a scale the reader already knows how to read. Category has no
# inherent order, so it stays sorted by count.
SEVERITY_ORDER = ['mild', 'moderate', 'severe', 'critical']
APPOINTMENT_STATUS_ORDER = [
    'scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'
]


def _humanize(value: str) -> str:
    """'in_progress' -> 'In Progress', 'immune_mediated' -> 'Immune Mediated'."""
    return str(value).replace('_', ' ').title()


def _normalize_status(raw: str) -> str:
    """'in-progress' / 'no show' -> 'in_progress' / 'no_show', matching the
    appointments.status enum."""
    value = re.sub(r'[\s-]+', '_', raw.strip().lower())
    return _STATUS_ALIASES.get(value, value)


def _chart_result(
    answer: str, title: str, data: list, series: list, multi_color: bool, chart_type: str = 'bar'
) -> dict:
    """Assemble the structured_query.py-shaped dict, plus the `chart` key."""
    return {
        'answer': answer,
        'sources': [],
        'chunks_used': 0,
        'structured': True,
        'chart': {
            'type': chart_type,
            'title': title,
            'data': data,
            'series': series,
            'multi_color': multi_color,
        },
    }


def _no_data(subject: str) -> dict:
    """No rows to plot. Say so as plain text rather than rendering an empty
    chart frame, which reads as a broken component rather than an answer."""
    return {
        'answer': f"There's no {subject} data to chart yet.",
        'sources': [],
        'chunks_used': 0,
        'structured': True,
    }


def _admin_only_chart_redirect(subject: str) -> dict:
    """Returned instead of a chart for a non-admin staff role asking for a
    category that's admin-only in the rest of the app too - see
    reportRoutes.js's operational reports (authorize('admin')), which
    already include a 'veterinarian-performance' report type. Explicit and
    immediate, same convention as _clinical_detail_redirect - a role inside
    STAFF_ROLES asking for something it can't see should be told so plainly,
    not handed a confusing RAG fallthrough or, worse, the chart anyway."""
    return {
        'answer': (
            f"I don't have access to share {subject} with your role - this is "
            "restricted to admin. Please check with an admin if you need it."
        ),
        'sources': [],
        'chunks_used': 0,
        'structured': True,
    }


def _query(sql: str, params: tuple = ()) -> list:
    """Run one read query and return all rows - same connection handling as
    every handler in structured_query.py."""
    conn = get_raw_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            return cur.fetchall()
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# Category handlers
# ---------------------------------------------------------------------------

def _chart_disease_by_category(chart_type: str = 'bar') -> dict:
    rows = _query("""
        SELECT disease_category, COUNT(*)
        FROM disease_cases
        WHERE disease_category IS NOT NULL
        GROUP BY disease_category
        ORDER BY COUNT(*) DESC
    """)
    if not rows:
        return _no_data('disease case')

    data = [{'label': _humanize(r[0]), 'count': int(r[1])} for r in rows]
    total = sum(d['count'] for d in data)
    return _chart_result(
        answer=f'Here are {total} disease cases broken down by category.',
        title='Disease Cases by Category',
        data=data,
        series=[{'key': 'count', 'name': 'Cases', 'color': PRIMARY_COLOR}],
        multi_color=True,
        chart_type=chart_type,
    )


def chart_recent_disease_cases(days_lookback: int, by: str = 'category', chart_type: str = 'bar') -> dict:
    """
    Disease-case breakdown scoped to a lookback window, rather than
    _chart_disease_by_category/_chart_disease_by_severity's all-time totals.

    Called directly from ml/app.py's outbreak-risk live-model gate (not via
    try_chart_intent below) when a chart trigger word is present alongside
    an outbreak-risk question ("graph the outbreak risk") - that gate short-
    circuits before try_chart_intent ever runs (see CLAUDE.md's description
    of the pre-pipeline live-model gates), so without this a chart request
    for outbreak risk silently got a text-only answer. Scoped to the SAME
    days_lookback the risk model used, so the chart can't show a different
    case count than the risk score/reasons text next to it describes (an
    all-time chart could show live cases while the text says "no cases in
    the last 30 days").
    """
    column = 'severity' if by == 'severity' else 'disease_category'
    rows = _query(
        f"""
        SELECT {column}, COUNT(*)
        FROM disease_cases
        WHERE {column} IS NOT NULL AND diagnosis_date >= CURRENT_DATE - (INTERVAL '1 day' * %s)
        GROUP BY {column}
        ORDER BY COUNT(*) DESC
        """,
        (days_lookback,)
    )
    if not rows:
        return _no_data('disease case')

    if by == 'severity':
        counts = {str(r[0]): int(r[1]) for r in rows}
        ordered = [s for s in SEVERITY_ORDER if s in counts]
        ordered += [s for s in counts if s not in SEVERITY_ORDER]
        data = [{'label': _humanize(s), 'count': counts[s]} for s in ordered]
        title = f'Disease Cases by Severity (Last {days_lookback} Days)'
        breakdown = 'severity'
    else:
        data = [{'label': _humanize(r[0]), 'count': int(r[1])} for r in rows]
        title = f'Disease Cases by Category (Last {days_lookback} Days)'
        breakdown = 'category'

    total = sum(d['count'] for d in data)
    return _chart_result(
        answer=f'Here are {total} disease cases from the last {days_lookback} days, broken down by {breakdown}.',
        title=title,
        data=data,
        series=[{'key': 'count', 'name': 'Cases', 'color': PRIMARY_COLOR}],
        multi_color=True,
        chart_type=chart_type,
    )


def _chart_disease_by_severity(chart_type: str = 'bar') -> dict:
    rows = _query("""
        SELECT severity, COUNT(*)
        FROM disease_cases
        WHERE severity IS NOT NULL
        GROUP BY severity
    """)
    if not rows:
        return _no_data('disease case')

    counts = {str(r[0]): int(r[1]) for r in rows}
    # Ordered mild -> critical so the chart reads as the scale it is. Any
    # severity value not in SEVERITY_ORDER (shouldn't happen given the schema
    # CHECK, but don't silently drop rows) is appended after the known ones.
    ordered = [s for s in SEVERITY_ORDER if s in counts]
    ordered += [s for s in counts if s not in SEVERITY_ORDER]

    data = [{'label': _humanize(s), 'count': counts[s]} for s in ordered]
    total = sum(d['count'] for d in data)
    return _chart_result(
        answer=f'Here are {total} disease cases broken down by severity.',
        title='Disease Cases by Severity',
        data=data,
        series=[{'key': 'count', 'name': 'Cases', 'color': PRIMARY_COLOR}],
        multi_color=True,
        chart_type=chart_type,
    )


def _chart_appointments_by_status(question: str, role: str, user_id: str = None, chart_type: str = 'bar') -> dict:
    timeframe_match = re.search(TIMEFRAME_WORDS, question, re.IGNORECASE)
    start = end = None
    scope = ''
    if timeframe_match:
        start, end = _resolve_timeframe(timeframe_match.group(0))
        if start is not None:
            scope = ' ' + re.sub(r'\s+', ' ', timeframe_match.group(0).strip().lower())

    self_scoped = bool(role == 'veterinarian' and user_id and SELF_SCOPE.search(question))

    conditions = []
    params = []
    if start is not None:
        conditions.append('appointment_date BETWEEN %s AND %s')
        params += [start, end]
    if self_scoped:
        conditions.append('veterinarian_id = %s')
        params.append(user_id)
    where_sql = f"WHERE {' AND '.join(conditions)}" if conditions else ''

    rows = _query(f"""
        SELECT status, COUNT(*)
        FROM appointments
        {where_sql}
        GROUP BY status
    """, tuple(params))

    if not rows:
        return _no_data('appointment')

    counts = {str(r[0]): int(r[1]) for r in rows}
    ordered = [s for s in APPOINTMENT_STATUS_ORDER if s in counts]
    ordered += [s for s in counts if s not in APPOINTMENT_STATUS_ORDER]

    data = [{'label': _humanize(s), 'count': counts[s]} for s in ordered]
    total = sum(d['count'] for d in data)
    mine = ' of yours' if self_scoped else ''
    return _chart_result(
        answer=f'Here are {total} appointments{mine}{scope} broken down by status.',
        title=f'Appointments{" (Mine)" if self_scoped else ""} by Status{scope.title() if scope else ""}',
        data=data,
        series=[{'key': 'count', 'name': 'Appointments', 'color': PRIMARY_COLOR}],
        multi_color=True,
        chart_type=chart_type,
    )


def _chart_veterinarian_performance(question: str, chart_type: str = 'bar') -> dict:
    """Per-veterinarian appointment volume and outcome - completed vs.
    no-show counts are the two concrete numbers "performance" can mean here
    without inventing a metric the schema doesn't have. Optional timeframe
    narrows both counts to the same window, same convention as
    _chart_appointments_by_status.

    Admin-only - the caller in try_chart_intent checks this, not this
    function. Unlike _count_appointments_by_vet in structured_query.py
    (a single named vet's own appointment count, open to every staff role),
    "veterinarian performance" evaluates staff against each other, which
    reportRoutes.js already treats as admin-only operational-report data
    (its 'veterinarian-performance' report type sits behind
    authorize('admin')) - this mirrors that restriction rather than
    inventing a laxer one for the same data reached through the assistant."""
    timeframe_match = re.search(TIMEFRAME_WORDS, question, re.IGNORECASE)
    start = end = None
    scope = ''
    if timeframe_match:
        start, end = _resolve_timeframe(timeframe_match.group(0))
        if start is not None:
            scope = ' ' + re.sub(r'\s+', ' ', timeframe_match.group(0).strip().lower())

    # The date filter has to live inside the LEFT JOIN's ON clause, not a
    # WHERE - a WHERE would drop veterinarians with zero appointments in the
    # window instead of showing them as a zero bar, same reasoning as the
    # generated-series joins above.
    date_filter = ''
    params: list = []
    if start is not None:
        date_filter = 'AND a.appointment_date BETWEEN %s AND %s'
        params = [start, end]

    rows = _query(f"""
        SELECT u.user_id, u.first_name, u.last_name,
               COUNT(a.appointment_id) AS total,
               COUNT(a.appointment_id) FILTER (WHERE a.status = 'completed') AS completed,
               COUNT(a.appointment_id) FILTER (WHERE a.status = 'no_show') AS no_shows
        FROM users u
        LEFT JOIN appointments a
               ON a.veterinarian_id = u.user_id {date_filter}
        WHERE u.role = 'veterinarian' AND u.is_active = true
        GROUP BY u.user_id, u.first_name, u.last_name
        ORDER BY total DESC
    """, tuple(params))

    if not rows:
        return _no_data('veterinarian')
    if all(int(r[3]) == 0 for r in rows):
        return _no_data(f'veterinarian appointment{scope}')

    data = [
        {'label': f'Dr. {r[1]} {r[2]}', 'completed': int(r[4]), 'no_shows': int(r[5])}
        for r in rows
    ]
    total_appointments = sum(int(r[3]) for r in rows)

    # The "not all rows are zero" guard above checks TOTAL appointments
    # (r[3]), but a pie is sized by series[0] alone - 'completed'. A window
    # where every appointment is still scheduled (asked on a Monday, say)
    # has a real total and zero completions: the guard above correctly says
    # "there's data" while every pie slice would still be sized zero, which
    # recharts can't render as a meaningful pie at all. Bar shows both
    # series honestly instead, so fall back to it rather than draw nothing.
    if chart_type == 'pie' and all(d['completed'] == 0 for d in data):
        chart_type = 'bar'

    return _chart_result(
        answer=(
            f'Here is appointment performance across {len(data)} veterinarian'
            f'{"s" if len(data) != 1 else ""}{scope} ({total_appointments} appointment'
            f'{"s" if total_appointments != 1 else ""} total): completed vs. no-show '
            f'counts per veterinarian.'
        ),
        title=f'Veterinarian Performance{scope.title() if scope else ""}',
        data=data,
        series=[
            {'key': 'completed', 'name': 'Completed', 'color': PRIMARY_COLOR},
            {'key': 'no_shows', 'name': 'No-shows', 'color': SECONDARY_COLOR},
        ],
        multi_color=False,
        chart_type=chart_type,
    )


def _chart_appointments_over_time(question: str, role: str, user_id: str = None, chart_type: str = 'bar') -> dict:
    timeframe_match = re.search(TIMEFRAME_WORDS, question, re.IGNORECASE)
    raw_timeframe = timeframe_match.group(0) if timeframe_match else 'this month'
    start, end = _resolve_timeframe(raw_timeframe)
    if start is None:
        start, end = _resolve_timeframe('this month')
        raw_timeframe = 'this month'
    label = re.sub(r'\s+', ' ', raw_timeframe.strip().lower())

    # An explicit status word ("completed appointments...") narrows the count
    # to that one status; "my"/"mine" (veterinarian only - see SELF_SCOPE)
    # narrows it to that vet's own appointments. Both are applied inside the
    # LEFT JOIN's ON clause below, never a bare WHERE - a WHERE would turn the
    # LEFT JOIN into an effective INNER JOIN and drop the zero-count buckets
    # the comment below the join explains are the point of generating them.
    status_match = APPOINTMENT_STATUS_WORD.search(question)
    status = _normalize_status(status_match.group(1)) if status_match else None
    self_scoped = bool(role == 'veterinarian' and user_id and SELF_SCOPE.search(question))

    extra_conditions = []
    extra_params = []
    if status:
        extra_conditions.append('a.status = %s')
        extra_params.append(status)
    if self_scoped:
        extra_conditions.append('a.veterinarian_id = %s')
        extra_params.append(user_id)
    extra_sql = (' AND ' + ' AND '.join(extra_conditions)) if extra_conditions else ''

    span_days = (end - start).days + 1
    # Both branches LEFT JOIN onto a generated series rather than grouping the
    # rows that happen to exist. A GROUP BY alone silently omits empty buckets,
    # so a quiet Tuesday vanishes instead of showing zero - which reads as
    # "that day didn't happen" and makes the remaining bars look continuous
    # when they aren't. For a time series the zeros are the information.
    if span_days <= MAX_DAYS_FOR_DAILY_BUCKETS:
        rows = _query(f"""
            WITH days AS (
                SELECT generate_series(%s::date, %s::date, interval '1 day')::date AS bucket
            )
            SELECT d.bucket, COUNT(a.appointment_id)
            FROM days d
            LEFT JOIN appointments a ON a.appointment_date = d.bucket{extra_sql}
            GROUP BY d.bucket
            ORDER BY d.bucket
        """, (start, end, *extra_params))
        data = [{'label': r[0].strftime('%d %b'), 'count': int(r[1])} for r in rows]
        grouping = 'day'
    else:
        # A multi-month range at one bar per day is unreadable - roll up.
        rows = _query(f"""
            WITH months AS (
                SELECT generate_series(
                    date_trunc('month', %s::date),
                    date_trunc('month', %s::date),
                    interval '1 month'
                )::date AS bucket
            )
            SELECT m.bucket, COUNT(a.appointment_id)
            FROM months m
            LEFT JOIN appointments a
                   ON date_trunc('month', a.appointment_date)::date = m.bucket{extra_sql}
            GROUP BY m.bucket
            ORDER BY m.bucket
        """, (start, end, *extra_params))
        data = [{'label': r[0].strftime('%b %Y'), 'count': int(r[1])} for r in rows]
        grouping = 'month'

    if not data:
        return _no_data(f'{status} appointment' if status else 'appointment')

    total = sum(d['count'] for d in data)
    status_phrase = f'{status.replace("_", " ")} ' if status else ''
    mine = ' of yours' if self_scoped else ''
    title_status = f'{_humanize(status)} ' if status else ''
    title_mine = ' (Mine)' if self_scoped else ''
    return _chart_result(
        answer=f'Here are {total} {status_phrase}appointments{mine} {label}, grouped by {grouping}.',
        title=f'{title_status}Appointments{title_mine} {label.title()}',
        data=data,
        series=[{'key': 'count', 'name': 'Appointments', 'color': PRIMARY_COLOR}],
        multi_color=False,
        chart_type=chart_type,
    )


def _chart_inventory_levels(chart_type: str = 'bar') -> dict:
    # Closest to (or already below) reorder level first - the items someone
    # asking to "see stock levels" actually needs to act on. Ordering by raw
    # quantity would just surface whatever happens to be stocked in small
    # units, which says nothing about whether it needs reordering.
    rows = _query("""
        SELECT item_name, quantity, reorder_level
        FROM inventory
        WHERE is_active = true
        ORDER BY (quantity - reorder_level) ASC, item_name ASC
        LIMIT 10
    """)
    if not rows:
        return _no_data('inventory')

    data = [
        {'label': str(r[0]), 'quantity': int(r[1]), 'reorder_level': int(r[2] or 0)}
        for r in rows
    ]
    below = sum(1 for d in data if d['quantity'] <= d['reorder_level'])
    # A pie has room for one value per slice, not a two-series comparison -
    # the web client falls back to the first series (current stock) and
    # drops reorder_level rather than refusing the request outright.
    return _chart_result(
        answer=(
            f'Here are the {len(data)} items closest to their reorder level '
            f'({below} at or below it).'
        ),
        title='Stock Level vs Reorder Level',
        data=data,
        series=[
            {'key': 'quantity', 'name': 'In Stock', 'color': PRIMARY_COLOR},
            {'key': 'reorder_level', 'name': 'Reorder Level', 'color': SECONDARY_COLOR},
        ],
        multi_color=False,
        chart_type=chart_type,
    )


def _chart_revenue_by_month(question: str, chart_type: str = 'bar') -> dict:
    months = DEFAULT_MONTHS_BACK
    match = MONTHS_BACK.search(question)
    if match:
        months = max(MIN_MONTHS_BACK, min(MAX_MONTHS_BACK, int(match.group(1))))

    # make_interval(months => %s) takes the count as a real parameter. Building
    # the interval by string-concatenating the number and casting it is the
    # fragile alternative this deliberately avoids.
    # months - 1 because the window is inclusive of the current month.
    #
    # LEFT JOINed onto a generated month series for the same reason as the
    # appointments series above: a month that billed nothing is a zero bar,
    # not an absent one. Grouping the billing rows alone would also make an
    # entirely-empty window look like "no revenue data exists" when the real
    # answer is "no revenue in these months" - a meaningful difference when
    # the last invoice predates the window.
    rows = _query("""
        WITH months AS (
            SELECT generate_series(
                date_trunc('month', CURRENT_DATE) - make_interval(months => %s),
                date_trunc('month', CURRENT_DATE),
                interval '1 month'
            )::date AS month_start
        )
        SELECT m.month_start, COALESCE(SUM(b.paid_amount), 0)
        FROM months m
        LEFT JOIN billing b
               ON date_trunc('month', b.bill_date)::date = m.month_start
        GROUP BY m.month_start
        ORDER BY m.month_start
    """, (months - 1,))
    if not rows:
        return _no_data('revenue')

    # paid_amount, matching _sum_revenue_timeframe in structured_query.py -
    # revenue means money actually collected, not invoiced.
    data = [{'label': r[0].strftime('%b %Y'), 'revenue': float(r[1])} for r in rows]
    total = sum(d['revenue'] for d in data)
    return _chart_result(
        answer=(
            f'Here is revenue collected over the last {months} months '
            f'(Rs. {total:,.2f} in total).'
        ),
        title=f'Revenue - Last {months} Months',
        data=data,
        series=[{'key': 'revenue', 'name': 'Revenue (Rs.)', 'color': PRIMARY_COLOR}],
        multi_color=False,
        chart_type=chart_type,
    )


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def try_chart_intent(question: str, role: str, user_id: str = None) -> dict:
    """
    Detect an explicit request to chart clinic data and answer it with a
    bar- or pie-chart payload (see _requested_chart_type).

    user_id scopes "my"/"mine" appointment charts to that veterinarian's own
    appointments (see SELF_SCOPE) - None for roles/questions where it's
    unused, same as customer_id elsewhere in this module chain.

    Returns:
        dict with a `chart` key when a chart was produced; the clinical
        redirect dict for a receptionist asking for disease-case data; a
        plain "no data" dict when the category matched but has no rows;
        otherwise None, meaning the question falls through to the rest of
        the pipeline untouched.
    """
    if not question:
        return None

    # Rule 1: no explicit trigger word, no chart - checked before anything
    # else so a plain data question never even reaches the category patterns.
    if not CHART_TRIGGER.search(question):
        return None

    # Rule 2: staff-only. Falling through (rather than erroring) keeps a guest
    # or pet owner asking "can you graph my pet's weight?" on the normal path,
    # which answers from their own scoped data or declines naturally.
    if role not in STAFF_ROLES:
        return None

    chart_type = _requested_chart_type(question)

    # Most-specific first: the disease patterns require their own noun, the
    # appointment status pattern is narrower than the over-time one, and the
    # bare-noun inventory/revenue patterns come last.
    if DISEASE_BY_CATEGORY.search(question):
        if role not in CLINICAL_STAFF_ROLES:
            return _clinical_detail_redirect()
        return _chart_disease_by_category(chart_type=chart_type)

    if DISEASE_BY_SEVERITY.search(question):
        if role not in CLINICAL_STAFF_ROLES:
            return _clinical_detail_redirect()
        return _chart_disease_by_severity(chart_type=chart_type)

    if VET_PERFORMANCE.search(question) and not VET_PERFORMANCE_FOREIGN_SUBJECT.search(question):
        if role != 'admin':
            return _admin_only_chart_redirect('veterinarian performance data')
        return _chart_veterinarian_performance(question, chart_type=chart_type)

    if APPOINTMENTS_BY_STATUS.search(question):
        return _chart_appointments_by_status(question, role=role, user_id=user_id, chart_type=chart_type)

    if APPOINTMENTS_OVER_TIME.search(question):
        if APPOINTMENTS_UNSUPPORTED_BREAKDOWN.search(question):
            return None
        return _chart_appointments_over_time(question, role=role, user_id=user_id, chart_type=chart_type)

    if INVENTORY_LEVELS.search(question):
        return _chart_inventory_levels(chart_type=chart_type)

    if REVENUE_BY_MONTH.search(question):
        if role not in BILLING_STAFF_ROLES:
            return _billing_staff_redirect('revenue data')
        return _chart_revenue_by_month(question, chart_type=chart_type)

    # Trigger word present but nothing recognizable to chart ("graph the
    # weather"). Fall through rather than guessing at a category - the rest
    # of the pipeline will handle or decline it normally.
    return None
