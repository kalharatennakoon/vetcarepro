import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { universalSearch } from '../services/searchService';

const CATEGORIES = [
  { key: 'customers', label: 'Customers', icon: 'fa-users', color: '#3b82f6' },
  { key: 'pets',      label: 'Pets',       icon: 'fa-paw',   color: '#f59e0b' },
  { key: 'appointments', label: 'Appointments', icon: 'fa-calendar-alt', color: '#10b981' },
  { key: 'billing',   label: 'Billing',    icon: 'fa-file-invoice-dollar', color: '#8b5cf6' },
  { key: 'inventory', label: 'Inventory',  icon: 'fa-boxes', color: '#ef4444' },
  { key: 'medicalRecords', label: 'Medical Records', icon: 'fa-file-medical', color: '#6366f1' },
  { key: 'staff', label: 'Staff', icon: 'fa-user-md', color: '#0891b2' },
  { key: 'suppliers', label: 'Suppliers', icon: 'fa-truck', color: '#d97706' },
];

const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
const formatTime = (t) => {
  if (!t) return '';
  const [h, m] = t.split(':');
  const hour = parseInt(h);
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
};
const capitalize = (s) => s ? s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '';

const UniversalSearch = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);
  const navigate = useNavigate();

  const search = useCallback(async (q) => {
    if (!q || q.trim().length < 2) { setResults(null); setOpen(false); return; }
    setLoading(true);
    try {
      const res = await universalSearch(q.trim());
      setResults(res.data);
      setOpen(true);
    } catch {
      setResults(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (query.trim().length < 2) { setResults(null); setOpen(false); return; }
    debounceRef.current = setTimeout(() => search(query), 300);
    return () => clearTimeout(debounceRef.current);
  }, [query, search]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') { setOpen(false); inputRef.current?.blur(); } };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const hasResults = results && CATEGORIES.some(c => results[c.key]?.length > 0);

  const handleSelect = (category, item) => {
    setOpen(false);
    setQuery('');
    switch (category) {
      case 'customers':
        navigate(`/customers/${item.customer_id}`);
        break;
      case 'pets':
        navigate(`/pets/${item.pet_id}`);
        break;
      case 'appointments':
        navigate('/appointments', {
          state: { viewDate: item.appointment_date, viewAppointmentId: item.appointment_id }
        });
        break;
      case 'billing':
        navigate(`/billing/${item.bill_id}`);
        break;
      case 'inventory':
        navigate(`/inventory/${item.item_id}`);
        break;
      case 'medicalRecords':
        navigate(`/medical-records/${item.record_id}`);
        break;
      case 'staff':
        navigate(`/staff/${item.user_id}`);
        break;
      case 'suppliers':
        navigate('/inventory', { state: { filterSupplier: item.supplier } });
        break;
    }
  };

  const renderItem = (category, item) => {
    switch (category) {
      case 'customers':
        return (
          <div style={s.itemMain}>
            <span style={s.itemTitle}>{item.first_name} {item.last_name}</span>
            <span style={s.itemSub}>{item.phone}{item.email ? ` · ${item.email}` : ''}</span>
          </div>
        );
      case 'pets':
        return (
          <div style={s.itemMain}>
            <span style={s.itemTitle}>{item.pet_name}</span>
            <span style={s.itemSub}>{capitalize(item.species)}{item.breed ? ` · ${item.breed}` : ''} · Owner: {item.owner_name}</span>
          </div>
        );
      case 'appointments':
        return (
          <div style={s.itemMain}>
            <span style={s.itemTitle}>{item.pet_name} — {item.customer_name}</span>
            <span style={s.itemSub}>{formatDate(item.appointment_date)} {formatTime(item.appointment_time)} · {capitalize(item.appointment_type)} · {capitalize(item.status)}</span>
          </div>
        );
      case 'billing':
        return (
          <div style={s.itemMain}>
            <span style={s.itemTitle}>#{item.bill_number}</span>
            <span style={s.itemSub}>{item.customer_name} · Rs. {parseFloat(item.total_amount).toFixed(2)} · {capitalize(item.payment_status)}</span>
          </div>
        );
      case 'inventory':
        return (
          <div style={s.itemMain}>
            <span style={s.itemTitle}>{item.item_name}</span>
            <span style={s.itemSub}>{item.item_code ? `${item.item_code} · ` : ''}{capitalize(item.category)} · Stock: {item.quantity} {item.unit}</span>
          </div>
        );
      case 'medicalRecords':
        return (
          <div style={s.itemMain}>
            <span style={s.itemTitle}>{item.pet_name} — {item.diagnosis || 'No diagnosis'}</span>
            <span style={s.itemSub}>{formatDate(item.visit_date)}{item.chief_complaint ? ` · ${item.chief_complaint}` : ''} · Owner: {item.owner_name}</span>
          </div>
        );
      case 'staff':
        return (
          <div style={s.itemMain}>
            <span style={s.itemTitle}>{item.first_name} {item.last_name}</span>
            <span style={s.itemSub}>{capitalize(item.role)}{item.specialization ? ` · ${item.specialization}` : ''} · {item.email}</span>
          </div>
        );
      case 'suppliers':
        return (
          <div style={s.itemMain}>
            <span style={s.itemTitle}>{item.supplier}</span>
            <span style={s.itemSub}>{item.supplier_contact ? `${item.supplier_contact} · ` : ''}{item.item_count} item{item.item_count !== '1' ? 's' : ''}</span>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div ref={wrapperRef} style={s.wrapper}>
      <div style={s.inputRow}>
        <i className="fas fa-search" style={s.searchIcon}></i>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => { if (results && hasResults) setOpen(true); }}
          placeholder="Type to search..."
          style={s.input}
        />
        {loading && <i className="fas fa-circle-notch fa-spin" style={s.spinner}></i>}
        {query && !loading && (
          <button onClick={() => { setQuery(''); setResults(null); setOpen(false); }} style={s.clearBtn}>
            <i className="fas fa-times"></i>
          </button>
        )}
      </div>

      {open && (
        <div style={s.dropdown}>
          {!hasResults ? (
            <div style={s.noResults}>
              <i className="fas fa-search" style={{ marginRight: '0.5rem', color: '#9ca3af' }}></i>
              No results found for "{query}"
            </div>
          ) : (
            CATEGORIES.map(cat => {
              const items = results[cat.key];
              if (!items?.length) return null;
              return (
                <div key={cat.key}>
                  <div style={s.categoryHeader}>
                    <i className={`fas ${cat.icon}`} style={{ color: cat.color, marginRight: '0.4rem', fontSize: '0.75rem' }}></i>
                    {cat.label}
                  </div>
                  {items.map((item, idx) => (
                    <div
                      key={idx}
                      style={s.item}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f9fafb'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                      onClick={() => handleSelect(cat.key, item)}
                    >
                      <div style={{ ...s.itemIcon, backgroundColor: `${cat.color}18`, color: cat.color }}>
                        <i className={`fas ${cat.icon}`} style={{ fontSize: '0.75rem' }}></i>
                      </div>
                      {renderItem(cat.key, item)}
                      <i className="fas fa-arrow-right" style={s.arrow}></i>
                    </div>
                  ))}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

const s = {
  wrapper: { position: 'relative', width: '100%' },
  inputRow: {
    display: 'flex', alignItems: 'center', gap: '0.65rem',
    backgroundColor: 'white', border: '2px solid #bfdbfe', borderRadius: '12px',
    padding: '0.75rem 1.1rem', boxShadow: '0 2px 8px rgba(59,130,246,0.08)',
    transition: 'border-color 0.2s'
  },
  searchIcon: { color: '#3b82f6', fontSize: '1.05rem', flexShrink: 0 },
  input: {
    flex: 1, border: 'none', outline: 'none', fontSize: '1rem',
    color: '#1f2937', backgroundColor: 'transparent', minWidth: 0
  },
  spinner: { color: '#6b7280', fontSize: '0.85rem', flexShrink: 0 },
  clearBtn: {
    background: 'none', border: 'none', cursor: 'pointer',
    color: '#9ca3af', fontSize: '0.8rem', padding: '0', flexShrink: 0,
    display: 'flex', alignItems: 'center'
  },
  dropdown: {
    position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
    backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '10px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 1000,
    maxHeight: '420px', overflowY: 'auto'
  },
  categoryHeader: {
    padding: '0.5rem 0.9rem 0.3rem',
    fontSize: '0.7rem', fontWeight: '700', color: '#6b7280',
    textTransform: 'uppercase', letterSpacing: '0.05em',
    borderTop: '1px solid #f3f4f6'
  },
  item: {
    display: 'flex', alignItems: 'center', gap: '0.65rem',
    padding: '0.55rem 0.9rem', cursor: 'pointer', transition: 'background 0.1s'
  },
  itemIcon: {
    width: '28px', height: '28px', borderRadius: '7px',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
  },
  itemMain: { flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 },
  itemTitle: { fontSize: '0.855rem', fontWeight: '600', color: '#1f2937', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  itemSub: { fontSize: '0.75rem', color: '#6b7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  arrow: { color: '#d1d5db', fontSize: '0.65rem', flexShrink: 0 },
  noResults: { padding: '1.25rem', textAlign: 'center', fontSize: '0.875rem', color: '#6b7280' }
};

export default UniversalSearch;
