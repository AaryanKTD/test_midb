import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

/**
 * StockSelector
 * Props:
 *   value    — { stock_name, stock_symbol, sector } | null
 *   onChange — called with { stock_name, stock_symbol, sector }
 */
export default function StockSelector({ value, onChange }) {
  const [sectors, setSectors]       = useState([]);
  const [sector, setSector]         = useState('');
  const [query, setQuery]           = useState('');
  const [results, setResults]       = useState([]);
  const [open, setOpen]             = useState(false);
  const [loading, setLoading]       = useState(false);
  const inputRef = useRef(null);
  const dropRef  = useRef(null);

  useEffect(() => {
    axios.get('/api/stocks/sectors').then(r => setSectors(r.data)).catch(() => {});
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e) {
      if (dropRef.current && !dropRef.current.contains(e.target) && !inputRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  async function search(q, s) {
    if (!q && !s) { setResults([]); return; }
    setLoading(true);
    try {
      const params = {};
      if (s) params.sector = s;
      const res = await axios.get('/api/stocks', { params });
      let list = res.data;
      if (q) {
        const lower = q.toLowerCase();
        list = list.filter(st =>
          st.symbol.toLowerCase().includes(lower) ||
          st.name.toLowerCase().includes(lower)
        );
      }
      setResults(list.slice(0, 80));
    } catch {}
    setLoading(false);
  }

  useEffect(() => {
    const id = setTimeout(() => search(query, sector), 250);
    return () => clearTimeout(id);
  }, [query, sector]);

  function select(stock) {
    setQuery(`${stock.symbol} — ${stock.name}`);
    setOpen(false);
    onChange({ stock_name: stock.name, stock_symbol: stock.symbol, sector: stock.sector });
  }

  function handleSectorChange(e) {
    setSector(e.target.value);
    setQuery('');
    onChange(null);
    setOpen(true);
  }

  function handleQueryChange(e) {
    setQuery(e.target.value);
    onChange(null);
    setOpen(true);
  }

  // Show selected value label
  useEffect(() => {
    if (value && value.stock_symbol) {
      setQuery(`${value.stock_symbol} — ${value.stock_name}`);
    }
  }, []);

  return (
    <div className="stock-selector">
      <select value={sector} onChange={handleSectorChange}>
        <option value="">All Sectors</option>
        {sectors.map(s => <option key={s} value={s}>{s}</option>)}
      </select>

      <div className="stock-search-input" style={{ position: 'relative' }}>
        <input
          ref={inputRef}
          type="text"
          placeholder="Search by name or symbol..."
          value={query}
          onChange={handleQueryChange}
          onFocus={() => { if (query || sector) setOpen(true); }}
          autoComplete="off"
        />
        {open && (
          <div className="stock-dropdown" ref={dropRef}>
            {loading && (
              <div className="stock-option" style={{ color: '#64748b' }}>Loading...</div>
            )}
            {!loading && results.length === 0 && (
              <div className="stock-option" style={{ color: '#64748b' }}>No results</div>
            )}
            {results.map((st, i) => (
              <div key={i} className="stock-option" onMouseDown={() => select(st)}>
                <span>
                  <span className="sym">{st.symbol}</span>
                  {' '}
                  <span className="nm">{st.name}</span>
                </span>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{st.sector}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {value && (
        <div style={{ fontSize: '0.8rem', color: '#2563eb' }}>
          Selected: <strong>{value.stock_symbol}</strong> · {value.stock_name} · {value.sector}
        </div>
      )}
    </div>
  );
}
