import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowDownLeft, ArrowUpRight, Banknote, CalendarDays, ChevronDown, CirclePlus, Search, Sparkles, Wallet, X } from 'lucide-react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { api } from './services/api.js'
import './App.css'

const currency = import.meta.env.VITE_CURRENCY || 'KZT'
const fmt = (minor) => { const absolute = Math.abs(minor); return `${minor < 0 ? '−' : ''}${new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(Math.trunc(absolute / 100))}.${String(absolute % 100).padStart(2, '0')}` }
const toMinor = (amount) => { const [units, fraction = ''] = String(amount).split('.'); return Number(units) * 100 + Number((fraction + '00').slice(0, 2)) }
const dateFmt = (value) => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${value}T00:00:00`))

function App() {
  const [summary, setSummary] = useState(null)
  const [categories, setCategories] = useState({ income: [], expense: [] })
  const [breakdown, setBreakdown] = useState([])
  const [monthly, setMonthly] = useState([])
  const [page, setPage] = useState({ items: [], total: 0 })
  const [filters, setFilters] = useState({ search: '', type: '', category: '', start_date: '', end_date: '' })
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modal, setModal] = useState(null)
  const [saving, setSaving] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const params = new URLSearchParams({ limit: '8', offset: String(offset), sort: 'newest' })
      Object.entries(filters).forEach(([key, value]) => { if (value) params.set(key, value) })
      const [s, b, m, t, c] = await Promise.all([
        api.get('/dashboard/summary'), api.get('/dashboard/category-breakdown'),
        api.get('/dashboard/monthly-summary'), api.get(`/transactions?${params}`), api.get('/categories'),
      ])
      setSummary(s); setBreakdown(b); setMonthly(m); setPage(t); setCategories(c)
    } catch (err) { setError(err.message) } finally { setLoading(false) }
  }, [filters, offset])

  useEffect(() => { refresh() }, [refresh])
  const chart = useMemo(() => monthly.map((item) => ({ ...item, label: new Date(new Date().getFullYear(), item.month - 1).toLocaleString('en', { month: 'short' }) })), [monthly])
  const submit = async (event) => {
    event.preventDefault(); setSaving(true); setError('')
    const form = new FormData(event.currentTarget)
    const data = Object.fromEntries(form.entries())
    try {
      if (modal?.id) await api.update(modal.id, data); else await api.create(data)
      setModal(null); await refresh()
    } catch (err) { setError(err.message) } finally { setSaving(false) }
  }
  const remove = async (item) => {
    if (!window.confirm(`Delete “${item.description}”? This cannot be undone.`)) return
    try { await api.remove(item.id); await refresh() } catch (err) { setError(err.message) }
  }

  return <div className="shell">
    <aside className="sidebar"><a className="brand" href="#top"><span className="brand-icon"><Wallet size={20}/></span> spendwise<span className="brand-dot">.</span></a>
      <div className="side-label">WORKSPACE</div><a className="nav active" href="#overview"><span className="nav-mark">◫</span> Overview</a><a className="nav" href="#transactions"><span className="nav-mark">↗</span> Transactions</a>
      <div className="side-bottom"><div className="tip"><div className="tip-icon"><Sparkles size={16}/></div><b>Small steps add up.</b><p>Every mindful choice moves you closer to your goals.</p></div><div className="profile"><div className="avatar">Y</div><div><b>Your workspace</b><small>Personal account</small></div><ChevronDown size={15}/></div></div>
    </aside>
    <main id="top" className="main"><header className="topbar"><div className="breadcrumb">Workspace <span>/</span> <b>Overview</b></div><div className="top-actions"><span className="today"><CalendarDays size={15}/> {new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date())}</span><button className="primary" onClick={() => setModal({})}><CirclePlus size={17}/> Add transaction</button></div></header>
      <div className="content" id="overview"><div className="welcome"><div><div className="eyebrow">YOUR MONEY, IN FOCUS</div><h1>Good things start with <span>clarity.</span></h1><p>A little awareness goes a long way. Here’s your financial snapshot.</p></div><div className="welcome-graphic"><span>✳</span><i>↗</i></div></div>
        {error && <div className="error" role="alert">{error}<button onClick={() => setError('')} aria-label="Dismiss error"><X size={16}/></button></div>}
        <section className="stats" aria-label="Financial summary"><Stat title="Total balance" value={fmt(summary?.balance_minor || 0)} icon={<Wallet/>} tone="violet" hint="Income minus expenses"/><Stat title="Total income" value={fmt(summary?.total_income_minor || 0)} icon={<ArrowDownLeft/>} tone="green" hint="Across all transactions"/><Stat title="Total expenses" value={fmt(summary?.total_expenses_minor || 0)} icon={<ArrowUpRight/>} tone="rose" hint="Across all transactions"/><Stat title="Transactions" value={summary?.transaction_count ?? '—'} icon={<Banknote/>} tone="amber" hint="All-time activity"/></section>
        <section className="middle-grid"><article className="card chart-card"><div className="card-heading"><div><h2>Cash flow</h2><p>Income and expenses throughout the year</p></div><span className="period">This year <ChevronDown size={14}/></span></div><div className="legend"><span><i className="legend-income"/> Income</span><span><i className="legend-expense"/> Expenses</span></div><div className="chart" role="img" aria-label="Monthly income and expense area chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chart} margin={{ top: 10, right: 5, left: -18, bottom: 0 }}><defs><linearGradient id="inc" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#36b87b" stopOpacity={0.18}/><stop offset="100%" stopColor="#36b87b" stopOpacity={0}/></linearGradient><linearGradient id="exp" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#fb8d8d" stopOpacity={0.15}/><stop offset="100%" stopColor="#fb8d8d" stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="#edf0ed" vertical={false}/><XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#9aa19d', fontSize: 11 }}/><YAxis axisLine={false} tickLine={false} tick={{ fill: '#9aa19d', fontSize: 10 }} tickFormatter={(v) => `${Math.round(v / 1000)}k`}/><Tooltip formatter={(v) => fmt(v)} contentStyle={{ borderRadius: 12, border: '1px solid #eef0ed' }}/><Area type="monotone" dataKey="income_minor" name="Income" stroke="#36b87b" strokeWidth={2.5} fill="url(#inc)"/><Area type="monotone" dataKey="expenses_minor" name="Expenses" stroke="#f18484" strokeWidth={2.5} fill="url(#exp)"/></AreaChart></ResponsiveContainer></div><div className="chart-note">{summary?.transaction_count ? 'Based on all recorded transactions.' : 'Your monthly activity will appear here once you add a transaction.'}</div></article>
          <article className="card category-card"><div className="card-heading"><div><h2>Where it goes</h2><p>Your spending by category</p></div><button className="dots" aria-label="Category information">···</button></div>{breakdown.length ? <div className="category-list">{breakdown.slice(0, 5).map((item, i) => { const colors = ['#8b78df', '#50b88d', '#f2b35d', '#ef8787', '#77a7d8']; const total = breakdown.reduce((sum, x) => sum + x.total_minor, 0); return <div className="category-row" key={item.category}><div className="cat-symbol" style={{ color: colors[i % colors.length], background: `${colors[i % colors.length]}1c` }}>{['⌂', '◉', '◇', '♡', '✦'][i % 5]}</div><div className="cat-info"><div><b>{item.category}</b><span>{fmt(item.total_minor)}</span></div><div className="bar"><i style={{ width: `${Math.max(2, item.total_minor / total * 100)}%`, background: colors[i % colors.length] }}/></div></div></div>})}</div> : <div className="empty-mini"><div className="empty-icon">◌</div><b>No spending yet</b><span>Categories will appear as you track expenses.</span></div>}<div className="category-footer"><span>Total expenses</span><b>{fmt(summary?.total_expenses_minor || 0)}</b></div></article></section>
        <section className="card transactions-card" id="transactions"><div className="transactions-head"><div><h2>Recent transactions</h2><p>Your latest money moves, all in one place.</p></div><button className="text-button" onClick={() => { setFilters({ search: '', type: '', category: '', start_date: '', end_date: '' }); setOffset(0) }}>View all <span>↗</span></button></div>
          <div className="filters"><label className="search-box"><Search size={16}/><input placeholder="Search transactions..." value={filters.search} onChange={(e) => { setFilters({ ...filters, search: e.target.value }); setOffset(0) }}/></label><select aria-label="Filter type" value={filters.type} onChange={(e) => { setFilters({ ...filters, type: e.target.value, category: '' }); setOffset(0) }}><option value="">All types</option><option value="income">Income</option><option value="expense">Expense</option></select><select aria-label="Filter category" value={filters.category} onChange={(e) => { setFilters({ ...filters, category: e.target.value }); setOffset(0) }}><option value="">All categories</option>{[...new Set([...categories.income, ...categories.expense])].map((c) => <option key={c}>{c}</option>)}</select><input aria-label="Start date" type="date" value={filters.start_date} onChange={(e) => { setFilters({ ...filters, start_date: e.target.value }); setOffset(0) }}/><input aria-label="End date" type="date" value={filters.end_date} onChange={(e) => { setFilters({ ...filters, end_date: e.target.value }); setOffset(0) }}/></div>
          <div className="table-wrap"><table><thead><tr><th>TRANSACTION</th><th>CATEGORY</th><th>DATE</th><th>TYPE</th><th className="amount-head">AMOUNT</th><th></th></tr></thead><tbody>{loading ? <tr><td colSpan="6" className="table-state">Loading transactions…</td></tr> : page.items.length ? page.items.map((item) => <tr key={item.id}><td><div className="transaction-name"><span className={`txn-icon ${item.type}`}>{item.type === 'income' ? <ArrowDownLeft size={16}/> : <ArrowUpRight size={16}/>}</span><b>{item.description}</b></div></td><td><span className="category-pill">{item.category}</span></td><td className="muted">{dateFmt(item.transaction_date)}</td><td><span className={`type-pill ${item.type}`}>{item.type}</span></td><td className={`amount ${item.type}`}>{item.type === 'income' ? '+' : '−'}{fmt(toMinor(item.amount))}</td><td><div className="row-actions"><button onClick={() => setModal(item)} aria-label={`Edit ${item.description}`}>Edit</button><button onClick={() => remove(item)} aria-label={`Delete ${item.description}`}>Delete</button></div></td></tr>) : <tr><td colSpan="6" className="table-state"><div className="empty-icon">◌</div><b>{page.total ? 'No matching transactions' : 'A fresh start'}</b><span>{page.total ? 'Try adjusting your search or filters.' : 'Add your first transaction to see your finances take shape.'}</span>{!page.total && <button className="primary" onClick={() => setModal({})}><CirclePlus size={16}/> Add transaction</button>}</td></tr>}</tbody></table></div>
          <div className="pagination"><span>Showing {page.total ? offset + 1 : 0}–{Math.min(offset + 8, page.total)} of {page.total} transactions</span><div><button disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - 8))}>← Previous</button><button disabled={offset + 8 >= page.total} onClick={() => setOffset(offset + 8)}>Next →</button></div></div>
        </section><footer>Made with care, for a clearer view of your money <span>·</span> React · FastAPI · SQLite</footer>
      </div></main>
    {modal && <div className="modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setModal(null) }}><form className="modal" onSubmit={submit}><div className="modal-title"><div><span className="eyebrow">KEEP YOUR FINANCES IN FOCUS</span><h2>{modal.id ? 'Edit transaction' : 'Add a transaction'}</h2></div><button type="button" className="close" onClick={() => setModal(null)} aria-label="Close"><X/></button></div><label>Type<select name="type" defaultValue={modal.type || 'expense'} onChange={(e) => { const cat = e.currentTarget.form.elements.category; const options = categories[e.target.value] || []; cat.replaceChildren(...options.map((value) => new Option(value, value))); cat.value = options[0] || '' }}><option value="expense">Expense</option><option value="income">Income</option></select></label><label>Amount ({currency})<input name="amount" type="number" min="0.01" step="0.01" defaultValue={modal.amount || ''} placeholder="0.00" required/></label><label>Category<select name="category" defaultValue={modal.category || (categories[modal.type || 'expense'] || [])[0]} required>{(categories[modal.type || 'expense'] || []).map((c) => <option key={c}>{c}</option>)}</select></label><label>Description<input name="description" maxLength="200" defaultValue={modal.description || ''} placeholder="What was this for?" required/></label><label>Date<input name="transaction_date" type="date" defaultValue={modal.transaction_date || new Date().toISOString().slice(0, 10)} required/></label><div className="modal-actions"><button type="button" className="secondary" onClick={() => setModal(null)}>Cancel</button><button className="primary" disabled={saving}>{saving ? 'Saving…' : modal.id ? 'Save changes' : 'Add transaction'}</button></div></form></div>}
  </div>
}

function Stat({ title, value, icon, tone, hint }) { return <article className="stat"><div className={`stat-icon ${tone}`}>{icon}</div><span className="stat-title">{title}</span><strong>{value}</strong><small>{hint}</small><span className={`stat-decoration ${tone}`}/></article> }

export default App
