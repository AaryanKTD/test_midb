import React, { useState, useEffect } from 'react';
import axios from 'axios';
import StockSelector from '../components/StockSelector';

const TYPES = [
  'Published news', 'Rumors', 'Published Results', 'Recommendation',
  'Exchange fillings', 'Corporate actions', 'Promoter transactions', 'Bulk / Block deals'
];

const SOURCES = ['ANIRU', 'BSE', 'KS', 'MM', 'NSE', 'RG', 'RL', 'SB', 'Twitter', 'VIRU', 'VN', 'VS'];
const RATINGS = ['A', 'B', 'C', 'D'];

const INVESTORS = [
  'Madhusudan Kela', 'Sunil Singhania', 'Vijay Kedia', 'Rakesh Jhunjhunwala',
  'Ashish Kacholia', 'Ramesh Damani', 'Radha Kishan Damani', 'Mukul Agarwal',
  'Karan Sharma', 'Dolly Khanna', 'Ashish Dhawan', 'Ravi Dharamshi',
  'Anil Kumar Goel', 'Ajay Upadhyaya', 'Nimesh Shah', 'Nilesh Shah',
  'Porinju Veliyath', 'Vikash Khemani', 'Amit Jeswani', 'Samir Vartak',
  'Akash Bhansali', 'Shivananda Shankar Mankekar', 'Akash Prakash', 'Samir Arora'
];

const RATING_BADGE = { A: 'badge-green', B: 'badge-blue', C: 'badge-yellow', D: 'badge-red' };

const TYPE_BADGE = {
  'Published news':        'badge-blue',
  'Rumors':                'badge-yellow',
  'Published Results':     'badge-green',
  'Recommendation':        'badge-purple',
  'Exchange fillings':     'badge-gray',
  'Corporate actions':     'badge-red',
  'Promoter transactions': 'badge-gray',
  'Bulk / Block deals':    'badge-blue'
};

export default function Search() {
  const [filters, setFilters]     = useState({ q: '', stock: '', sector: '', type: '', source: '', rating: '', date_from: '', date_to: '' });
  const [data, setData]           = useState({ entries: [], total: 0 });
  const [page, setPage]           = useState(1);
  const [loading, setLoading]     = useState(false);
  const [expanded, setExpanded]   = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm]   = useState(null);
  const [editSourceOther, setEditSourceOther] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving]       = useState(false);
  const [sectors, setSectors]     = useState([]);
  const LIMIT = 20;
  const me = localStorage.getItem('mib_username');
  const isAdmin = ['Aaryan', 'raunak bajaj'].includes(me);

  // Load sectors once on mount
  useEffect(() => {
    axios.get('/api/stocks/sectors').then(res => setSectors(res.data)).catch(() => {});
  }, []);

  // Auto-search: fires 50ms after any filter change (debounced)
  useEffect(() => {
    const id = setTimeout(() => fetchEntries(1), 50);
    return () => clearTimeout(id);
  }, [filters]);

  async function fetchEntries(pg, overrideFilters) {
    setLoading(true);
    const f = overrideFilters || filters;
    try {
      const params = { page: pg, limit: LIMIT };
      if (f.q)         params.q         = f.q;
      if (f.stock)     params.stock     = f.stock;
      if (f.sector)    params.sector    = f.sector;
      if (f.type)      params.type      = f.type;
      if (f.source)    params.source    = f.source;
      if (f.rating)    params.rating    = f.rating;
      if (f.date_from) params.date_from = f.date_from;
      if (f.date_to)   params.date_to   = f.date_to;
      const res = await axios.get('/api/entries', { params });
      setData(res.data);
      setPage(pg);
    } catch {}
    setLoading(false);
  }

  function changeFilter(e) {
    setFilters(f => ({ ...f, [e.target.name]: e.target.value }));
  }

  function doSearch(e) { e.preventDefault(); fetchEntries(1); }

  function clearFilters() {
    setFilters({ q: '', stock: '', sector: '', type: '', source: '', rating: '', date_from: '', date_to: '' });
  }

  // ── Edit helpers ──────────────────────────────────────────
  function startEdit(e) {
    const isOther = !SOURCES.includes(e.source);
    setEditingId(e.id);
    setEditSourceOther(isOther);
    setEditForm({
      entry_date:    e.entry_date,
      stock: { stock_name: e.stock_name, stock_symbol: e.stock_symbol, sector: e.sector },
      type:          e.type,
      source:        e.source,
      investor_name: e.investor_name || '',
      news:          e.news,
      rating:        e.rating || '',
      opinion:       e.opinion || ''
    });
    setExpanded(e.id);
    setSaveError('');
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm(null);
    setEditSourceOther(false);
    setSaveError('');
  }

  function changeEdit(field, value) {
    setEditForm(f => ({ ...f, [field]: value }));
  }

  function handleEditSourceSelect(e) {
    if (e.target.value === '__other__') {
      setEditSourceOther(true);
      setEditForm(f => ({ ...f, source: '' }));
    } else {
      setEditSourceOther(false);
      setEditForm(f => ({ ...f, source: e.target.value }));
    }
  }

  async function saveEdit(id) {
    setSaveError('');
    if (!editForm.stock)  return setSaveError('Please select a stock');
    if (!editForm.source) return setSaveError('Please enter a source');
    setSaving(true);
    try {
      const token = localStorage.getItem('mib_token');
      const res = await axios.put(`/api/entries/${id}`, {
        entry_date:   editForm.entry_date,
        stock_name:    editForm.stock.stock_name,
        stock_symbol:  editForm.stock.stock_symbol,
        sector:        editForm.stock.sector,
        type:          editForm.type,
        source:        editForm.source,
        news:          editForm.news,
        rating:        editForm.rating || undefined,
        opinion:       editForm.opinion,
        investor_name: editForm.investor_name || undefined
      }, { headers: { Authorization: `Bearer ${token}` } });

      // Update row in-place without refetching
      setData(d => ({
        ...d,
        entries: d.entries.map(e => e.id === id ? res.data : e)
      }));
      cancelEdit();
    } catch (err) {
      setSaveError(err.response?.data?.error || 'Save failed');
    }
    setSaving(false);
  }

  // ── Delete ────────────────────────────────────────────────
  async function deleteEntry(id) {
    if (!window.confirm('Delete this entry?')) return;
    const token = localStorage.getItem('mib_token');
    try {
      await axios.delete(`/api/entries/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      fetchEntries(page);
    } catch (err) {
      alert(err.response?.data?.error || 'Delete failed');
    }
  }

  // ── Formatting ────────────────────────────────────────────
  function fmtDate(d)         { if (!d) return '—'; return d.split('T')[0].split('-').reverse().join('-'); }
  function fmtDateTime(d)     { if (!d) return '—'; return d.replace('T', ' ').slice(0, 16); }
  function fmtDateOnly(d)     { if (!d) return '—'; return d.replace('T', ' ').slice(0, 10); }
  function fmtTimeOnly(d)     { if (!d) return '—'; return d.replace('T', ' ').slice(11, 16); }
  function fmtDateTimeFull(d) { if (!d) return '—'; return d.replace('T', ' ').slice(0, 19); }

  const totalPages = Math.ceil(data.total / LIMIT);

  return (
    <div className="page-wide">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ fontSize: '1.3rem' }}>All Entries</h2>
        <span style={{ fontSize: '0.85rem', color: '#64748b' }}>All data submitted by all users is visible here</span>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 16, padding: '18px 22px' }}>
        <form onSubmit={doSearch}>
          <div className="search-bar">
            <div style={{ flex: 2, minWidth: 200 }}>
              <label style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', marginBottom: 4 }}>Keyword</label>
              <input type="text" name="q" value={filters.q} onChange={changeFilter} placeholder="Search by news, source, stock name, username..." />
            </div>
            <div style={{ flex: 1, minWidth: 130 }}>
              <label style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', marginBottom: 4 }}>Stock symbol</label>
              <input type="text" name="stock" value={filters.stock} onChange={changeFilter} placeholder="e.g. RELIANCE" />
            </div>
            <div style={{ flex: 1, minWidth: 150 }}>
              <label style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', marginBottom: 4 }}>Sector</label>
              <input
                type="text"
                name="sector"
                value={filters.sector}
                onChange={changeFilter}
                placeholder="Search sector..."
                list="sector-list"
                autoComplete="off"
              />
              <datalist id="sector-list">
                {sectors.filter(s => s.toLowerCase().includes(filters.sector.toLowerCase())).map(s => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </div>
            <div style={{ flex: 1, minWidth: 160 }}>
              <label style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', marginBottom: 4 }}>Type</label>
              <select name="type" value={filters.type} onChange={changeFilter}>
                <option value="">All Types</option>
                {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div style={{ flex: 1, minWidth: 130 }}>
              <label style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', marginBottom: 4 }}>Source</label>
              <select name="source" value={filters.source} onChange={changeFilter}>
                <option value="">All Sources</option>
                {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div style={{ flex: 1, minWidth: 110 }}>
              <label style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', marginBottom: 4 }}>Rating</label>
              <select name="rating" value={filters.rating} onChange={changeFilter}>
                <option value="">All Ratings</option>
                {RATINGS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div style={{ flex: 1, minWidth: 130 }}>
              <label style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', marginBottom: 4 }}>Date from</label>
              <input type="date" name="date_from" value={filters.date_from} onChange={changeFilter} />
            </div>
            <div style={{ flex: 1, minWidth: 130 }}>
              <label style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', marginBottom: 4 }}>Date to</label>
              <input type="date" name="date_to" value={filters.date_to} onChange={changeFilter} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary btn-sm" type="submit">Search</button>
            <button className="btn btn-outline btn-sm" type="button" onClick={clearFilters}>Clear</button>
          </div>
        </form>
      </div>

      <div style={{ marginBottom: 12, color: '#64748b', fontSize: '0.875rem' }}>
        {loading ? 'Loading...' : `${data.total} result${data.total !== 1 ? 's' : ''} found`}
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th style={{ width: 100 }}>Date</th>
                <th style={{ width: 100 }}>Stock</th>
                <th style={{ width: 145 }}>Sector</th>
                <th style={{ width: 100 }}>Type</th>
                <th style={{ width: 100 }}>Source</th>
                <th>News</th>
                <th style={{ width: 132 }}>By</th>
                <th style={{ width: 60 }}></th>
              </tr>
            </thead>
            <tbody>
              {data.entries.length === 0 && !loading && (
                <tr><td colSpan={8} style={{ textAlign: 'center', color: '#94a3b8', padding: 32 }}>No entries found</td></tr>
              )}
              {data.entries.map(e => (
                <React.Fragment key={e.id}>
                  {/* Main row */}
                  <tr
                    style={{ cursor: 'pointer', background: editingId === e.id ? '#eff6ff' : undefined }}
                    onClick={() => {
                      if (editingId === e.id) return;
                      setExpanded(expanded === e.id ? null : e.id);
                    }}
                  >
                    <td style={{ whiteSpace: 'nowrap' }}>{fmtDate(e.entry_date)}</td>
                    <td><strong>{e.stock_symbol}</strong></td>
                    <td style={{ fontSize: '0.85rem', color: '#64748b', maxWidth: 145, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.sector}</td>
                    <td>
                      <span className={`badge ${TYPE_BADGE[e.type] || 'badge-gray'}`}>{e.type}</span>
                      {e.rating && <span className={`badge ${RATING_BADGE[e.rating]}`} style={{ marginLeft: 4 }}>{e.rating}</span>}
                    </td>
                    <td style={{ maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.source}</td>
                    <td style={{ maxWidth: 264 }}>
                      <div style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', whiteSpace: 'normal' }}>{e.news}</div>
                    </td>
                    <td style={{ maxWidth: 132, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#2563eb', fontWeight: 600 }}>{e.username}</td>
                    <td onClick={ev => ev.stopPropagation()}>
                      {(isAdmin || e.username === me) && (
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() => editingId === e.id ? cancelEdit() : startEdit(e)}
                          >
                            {editingId === e.id ? 'Cancel' : 'Edit'}
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => deleteEntry(e.id)}
                          >
                            Del
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>

                  {/* Expanded: Edit form */}
                  {expanded === e.id && editingId === e.id && editForm && (
                    <tr>
                      <td colSpan={8} style={{ background: '#eff6ff', padding: '20px 24px' }}>
                        {saveError && <div className="alert alert-error" style={{ marginBottom: 14 }}>{saveError}</div>}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 24px' }}>

                          {/* Date */}
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Date <span className="req">*</span></label>
                            <input
                              type="date"
                              value={editForm.entry_date}
                              onChange={e => changeEdit('entry_date', e.target.value)}
                              required
                            />
                          </div>

                          {/* Type */}
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Type <span className="req">*</span></label>
                            <select value={editForm.type} onChange={e => changeEdit('type', e.target.value)} required>
                              {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                          </div>

                          {/* Stock — full width */}
                          <div className="form-group" style={{ marginBottom: 0, gridColumn: '1 / -1' }}>
                            <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Stock <span className="req">*</span></label>
                            <StockSelector
                              value={editForm.stock}
                              onChange={stock => changeEdit('stock', stock)}
                            />
                          </div>

                          {/* Source */}
                          <div className="form-group" style={{ marginBottom: 0, gridColumn: '1 / -1' }}>
                            <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Source <span className="req">*</span></label>
                            <select
                              value={editSourceOther ? '__other__' : editForm.source}
                              onChange={handleEditSourceSelect}
                              required={!editSourceOther}
                            >
                              <option value="">Choose</option>
                              {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                              <option value="__other__">Other (type below)</option>
                            </select>
                            {editSourceOther && (
                              <input
                                type="text"
                                value={editForm.source}
                                onChange={e => changeEdit('source', e.target.value)}
                                required
                                placeholder="Type source name..."
                                style={{ marginTop: 8 }}
                                autoFocus
                              />
                            )}
                          </div>

                          {/* Investor Name — full width */}
                          <div className="form-group" style={{ marginBottom: 0, gridColumn: '1 / -1' }}>
                            <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Investor Name</label>
                            <input
                              type="text"
                              value={editForm.investor_name}
                              onChange={e => changeEdit('investor_name', e.target.value)}
                              onBlur={e => {
                                if (e.target.value && !INVESTORS.includes(e.target.value))
                                  changeEdit('investor_name', '');
                              }}
                              list="edit-investor-list"
                              placeholder="Search investor name (optional)..."
                              autoComplete="off"
                            />
                            <datalist id="edit-investor-list">
                              {INVESTORS.map(n => <option key={n} value={n} />)}
                            </datalist>
                          </div>

                          {/* News — full width */}
                          <div className="form-group" style={{ marginBottom: 0, gridColumn: '1 / -1' }}>
                            <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>News <span className="req">*</span></label>
                            <textarea
                              value={editForm.news}
                              onChange={e => changeEdit('news', e.target.value)}
                              required
                              rows={4}
                            />
                          </div>

                          {/* Rating */}
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Rating</label>
                            <select
                              value={editForm.rating}
                              onChange={e => changeEdit('rating', e.target.value)}
                              disabled={!isAdmin}
                              style={{
                                background: !isAdmin ? '#f1f5f9' : undefined,
                                color:      !isAdmin ? '#94a3b8' : undefined,
                                cursor:     !isAdmin ? 'not-allowed' : undefined
                              }}
                            >
                              <option value="">Choose (optional)</option>
                              {RATINGS.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                          </div>

                          {/* Opinion — full width */}
                          <div className="form-group" style={{ marginBottom: 0, gridColumn: '1 / -1' }}>
                            <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Opinion</label>
                            <textarea
                              value={editForm.opinion}
                              onChange={e => changeEdit('opinion', e.target.value)}
                              rows={3}
                              placeholder="Optional..."
                            />
                          </div>
                        </div>

                        {/* Timestamps reminder */}
                        <div style={{ marginTop: 14, fontSize: '0.78rem', color: '#94a3b8', borderTop: '1px solid #e2e8f0', paddingTop: 10 }}>
                          Originally submitted: <strong>{fmtDateTime(e.submitted_at)}</strong> by <strong>{e.username}</strong>
                          {e.edited_at && <> · Last edited: <strong style={{ color: '#d97706' }}>{fmtDateTime(e.edited_at)}</strong></>}
                        </div>

                        <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
                          <button className="btn btn-primary btn-sm" onClick={() => saveEdit(e.id)} disabled={saving}>
                            {saving ? 'Saving...' : 'Save Changes'}
                          </button>
                          <button className="btn btn-outline btn-sm" onClick={cancelEdit}>Cancel</button>
                        </div>
                      </td>
                    </tr>
                  )}

                  {/* Expanded: Read-only view */}
                  {expanded === e.id && editingId !== e.id && (
                    <tr>
                      <td colSpan={8} style={{ background: '#f8fafc', padding: '14px 18px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px' }}>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.8rem', color: '#64748b', marginBottom: 4 }}>STOCK</div>
                            <div>{e.stock_symbol} — {e.stock_name}</div>
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.8rem', color: '#64748b', marginBottom: 4 }}>SECTOR</div>
                            <div>{e.sector}</div>
                          </div>
                          <div style={{ gridColumn: '1 / -1' }}>
                            <div style={{ fontWeight: 600, fontSize: '0.8rem', color: '#64748b', marginBottom: 4 }}>NEWS</div>
                            <div style={{ whiteSpace: 'pre-wrap' }}>{e.news}</div>
                          </div>
                          {e.rating && (
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '0.8rem', color: '#64748b', marginBottom: 4 }}>RATING</div>
                              <span className={`badge ${RATING_BADGE[e.rating]}`}>{e.rating}</span>
                            </div>
                          )}
                          {e.opinion && (
                            <div style={{ gridColumn: '1 / -1' }}>
                              <div style={{ fontWeight: 600, fontSize: '0.8rem', color: '#64748b', marginBottom: 4 }}>OPINION</div>
                              <div style={{ whiteSpace: 'pre-wrap', color: '#475569' }}>{e.opinion}</div>
                            </div>
                          )}
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.8rem', color: '#64748b', marginBottom: 4 }}>SOURCE</div>
                            <div>{e.source}</div>
                          </div>
                          {e.investor_name && (
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '0.8rem', color: '#64748b', marginBottom: 4 }}>INVESTOR NAME</div>
                              <div>{e.investor_name}</div>
                            </div>
                          )}
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.8rem', color: '#64748b', marginBottom: 4 }}>SUBMITTED</div>
                            <div>{e.username} · {fmtDateTimeFull(e.submitted_at)}</div>
                            {e.edited_at && (
                              <div style={{ color: '#d97706', fontSize: '0.82rem', marginTop: 4 }}>
                                <div>Edited</div>
                                <div>{fmtDateTimeFull(e.edited_at)}</div>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button className="pag-btn" disabled={page <= 1} onClick={() => fetchEntries(page - 1)}>← Prev</button>
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
            const p = page <= 4 ? i + 1 : page - 3 + i;
            if (p < 1 || p > totalPages) return null;
            return (
              <button key={p} className={`pag-btn${p === page ? ' active' : ''}`} onClick={() => fetchEntries(p)}>{p}</button>
            );
          })}
          <button className="pag-btn" disabled={page >= totalPages} onClick={() => fetchEntries(page + 1)}>Next →</button>
        </div>
      )}
    </div>
  );
}
