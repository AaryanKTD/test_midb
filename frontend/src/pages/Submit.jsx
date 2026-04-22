import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import StockSelector from '../components/StockSelector';

const TYPES = [
  'Published news',
  'Rumors',
  'Published Results',
  'Recommendation',
  'Exchange fillings',
  'Corporate actions',
  'Promoter transactions',
  'Bulk / Block deals'
];

const SOURCES = ['ANIRU', 'BSE', 'KS', 'MM', 'NSE', 'RG', 'RL', 'SB', 'Twitter', 'VIRU', 'VN', 'VS'];

const INVESTORS = [
  'Madhusudan Kela', 'Sunil Singhania', 'Vijay Kedia', 'Rakesh Jhunjhunwala',
  'Ashish Kacholia', 'Ramesh Damani', 'Radha Kishan Damani', 'Mukul Agarwal',
  'Karan Sharma', 'Dolly Khanna', 'Ashish Dhawan', 'Ravi Dharamshi',
  'Anil Kumar Goel', 'Ajay Upadhyaya', 'Nimesh Shah', 'Nilesh Shah',
  'Porinju Veliyath', 'Vikash Khemani', 'Amit Jeswani', 'Samir Vartak',
  'Akash Bhansali', 'Shivananda Shankar Mankekar', 'Akash Prakash', 'Samir Arora'
];

function today() {
  return new Date().toISOString().split('T')[0];
}

const RATINGS = ['A', 'B', 'C', 'D'];

const EMPTY = {
  entry_date: today(),
  stock: null,
  type: '',
  source: '',
  investor_name: '',
  news: '',
  rating: '',
  opinion: ''
};

const ADMINS = ['Aaryan', 'raunak bajaj'];

export default function Submit() {
  const navigate = useNavigate();
  const [form, setForm]         = useState(EMPTY);
  const [sourceOther, setSourceOther] = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');
  const [loading, setLoading]   = useState(false);
  const me = localStorage.getItem('mib_username');
  const isAdmin = ADMINS.includes(me);

  function change(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  }

  function handleSourceSelect(e) {
    const val = e.target.value;
    if (val === '__other__') {
      setSourceOther(true);
      setForm(f => ({ ...f, source: '' }));
    } else {
      setSourceOther(false);
      setForm(f => ({ ...f, source: val }));
    }
  }

  async function submit(e) {
    e.preventDefault();
    setError(''); setSuccess('');

    if (!form.stock)  return setError('Please select a stock');
    if (!form.type)   return setError('Please select a type');
    if (!form.source) return setError('Please select or enter a source');

    setLoading(true);
    try {
      const token = localStorage.getItem('mib_token');
      await axios.post('/api/entries', {
        entry_date:    form.entry_date,
        stock_name:    form.stock.stock_name,
        stock_symbol:  form.stock.stock_symbol,
        sector:        form.stock.sector,
        type:          form.type,
        source:        form.source,
        news:          form.news,
        rating:        form.rating || undefined,
        opinion:       form.opinion,
        investor_name: form.investor_name || undefined
      }, { headers: { Authorization: `Bearer ${token}` } });

      setSuccess('Entry submitted! Redirecting to data view...');
      setForm(EMPTY);
      setSourceOther(false);
      setTimeout(() => navigate('/'), 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Submission failed');
    }
    setLoading(false);
  }

  return (
    <div className="page">
      <h2 style={{ marginBottom: 20, fontSize: '1.3rem' }}>Submit Stock News</h2>

      {error   && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="card">
        <form onSubmit={submit}>

          {/* Date */}
          <div className="form-group">
            <label>Date <span className="req">*</span></label>
            <input
              type="date"
              name="entry_date"
              value={form.entry_date}
              onChange={change}
              required
            />
            <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: 4 }}>
              This is the date the data refers to (not when you're submitting it).
              System upload time is recorded automatically.
            </div>
          </div>

          {/* Stock */}
          <div className="form-group">
            <label>Stock <span className="req">*</span></label>
            <StockSelector
              value={form.stock}
              onChange={stock => setForm(f => ({ ...f, stock }))}
            />
          </div>

          {/* Type */}
          <div className="form-group">
            <label>Type <span className="req">*</span></label>
            <select name="type" value={form.type} onChange={change} required>
              <option value="">Choose</option>
              {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* Source */}
          <div className="form-group">
            <label>Source <span className="req">*</span></label>
            <select
              value={sourceOther ? '__other__' : form.source}
              onChange={handleSourceSelect}
              required={!sourceOther}
            >
              <option value="">Choose</option>
              {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
              <option value="__other__">Other (type below)</option>
            </select>
            {sourceOther && (
              <input
                type="text"
                name="source"
                value={form.source}
                onChange={change}
                required
                placeholder="Type source name..."
                style={{ marginTop: 8 }}
                autoFocus
              />
            )}
          </div>

          {/* Investor Name */}
          <div className="form-group">
            <label>Investor Name</label>
            <input
              type="text"
              name="investor_name"
              value={form.investor_name}
              onChange={change}
              onBlur={e => {
                if (e.target.value && !INVESTORS.includes(e.target.value))
                  setForm(f => ({ ...f, investor_name: '' }));
              }}
              list="investor-list"
              placeholder="Search investor name (optional)..."
              autoComplete="off"
            />
            <datalist id="investor-list">
              {INVESTORS.map(n => <option key={n} value={n} />)}
            </datalist>
          </div>

          {/* News */}
          <div className="form-group">
            <label>News <span className="req">*</span></label>
            <textarea
              name="news"
              value={form.news}
              onChange={change}
              required
              placeholder="Enter the news content..."
              rows={4}
            />
          </div>

          {/* Rating */}
          <div className="form-group">
            <label>Rating</label>
            <select
              name="rating"
              value={form.rating}
              onChange={change}
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

          {/* Opinion */}
          <div className="form-group">
            <label>Opinion</label>
            <textarea
              name="opinion"
              value={form.opinion}
              onChange={change}
              placeholder="Your opinion or analysis (optional)..."
              rows={3}
            />
          </div>

          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? 'Submitting...' : 'Submit Entry'}
          </button>

        </form>
      </div>
    </div>
  );
}
