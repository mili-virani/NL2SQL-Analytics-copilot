import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8001";

// ─── Design tokens (match your App.jsx palette) ───────────────────────────────
const C = {
  bg:       '#060810',
  surface:  '#080b12',
  card:     '#0a0d16',
  border:   '#1e2230',
  borderHi: '#2a2d3a',
  text:     '#c8d0e8',
  muted:    '#4a5a7a',
  heading:  '#d0c8f0',
  blue:     '#4a9eff',
  green:    '#4adb8a',
  amber:    '#db9a4a',
  purple:   '#9f97ef',
  red:      '#e24b4a',
  pink:     '#db4adb',
};

const SCHEMA_ACCENT = {
  customer:  C.pink,
  inventory: C.green,
  sales:     C.blue,
  support:   C.amber,
};

// ─── Shared small components ──────────────────────────────────────────────────

function SchemaPill({ schema }) {
  const accent = SCHEMA_ACCENT[schema] || C.purple;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '1px 8px', borderRadius: 99,
      background: accent + '18', border: `1px solid ${accent}33`,
      fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
      color: accent, textTransform: 'uppercase', fontFamily: 'monospace',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: accent, display: 'inline-block' }} />
      {schema}
    </span>
  );
}

function Btn({ children, onClick, color = C.blue, variant = 'outline', disabled, style = {} }) {
  const [hov, setHov] = useState(false);
  const base = {
    padding: '7px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer', border: '1px solid',
    transition: 'all 0.15s', fontFamily: "'DM Sans', sans-serif",
    opacity: disabled ? 0.5 : 1, ...style,
  };
  if (variant === 'solid') return (
    <button disabled={disabled} onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ ...base, background: hov ? color + 'dd' : color, borderColor: color, color: '#000' }}>
      {children}
    </button>
  );
  return (
    <button disabled={disabled} onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ ...base, background: hov ? color + '18' : 'transparent', borderColor: color + '55', color }}>
      {children}
    </button>
  );
}

function Input({ label, value, onChange, type = 'text', placeholder, required, step }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {label && <label style={{ fontSize: 12, fontWeight: 600, color: C.muted, letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: 'monospace' }}>{label}{required && <span style={{ color: C.red }}> *</span>}</label>}
      <input
        type={type} value={value} onChange={onChange} placeholder={placeholder} step={step}
        style={{
          padding: '9px 12px', borderRadius: 8, border: `1px solid ${C.border}`,
          background: C.bg, color: C.text, fontSize: 13, outline: 'none',
          fontFamily: "'DM Sans', sans-serif",
          transition: 'border-color 0.15s',
        }}
        onFocus={e => e.target.style.borderColor = C.purple + '88'}
        onBlur={e => e.target.style.borderColor = C.border}
      />
    </div>
  );
}

function Select({ label, value, onChange, options, required }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {label && <label style={{ fontSize: 12, fontWeight: 600, color: C.muted, letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: 'monospace' }}>{label}{required && <span style={{ color: C.red }}> *</span>}</label>}
      <select value={value} onChange={onChange}
        style={{
          padding: '9px 12px', borderRadius: 8, border: `1px solid ${C.border}`,
          background: C.card, color: C.text, fontSize: 13, outline: 'none',
          fontFamily: "'DM Sans', sans-serif", cursor: 'pointer',
        }}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function Toast({ msg, type, onClose }) {
  useEffect(() => { if (msg) { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); } }, [msg]);
  if (!msg) return null;
  const color = type === 'success' ? C.green : type === 'error' ? C.red : C.amber;
  return (
    <div style={{
      position: 'fixed', bottom: 28, right: 28, zIndex: 1000,
      background: C.card, border: `1px solid ${color}55`,
      borderRadius: 10, padding: '12px 18px', maxWidth: 360,
      color, fontSize: 13, fontWeight: 600, boxShadow: `0 4px 24px ${color}22`,
      display: 'flex', alignItems: 'center', gap: 10, animation: 'slideUp 0.2s ease',
    }}>
      <span>{type === 'success' ? '✓' : '✗'}</span>
      <span style={{ color: C.text, fontWeight: 400 }}>{msg}</span>
      <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 15 }}>×</button>
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#000000aa', zIndex: 500,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div style={{
        background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14,
        padding: 28, minWidth: 380, maxWidth: 520, width: '90%',
        maxHeight: '85vh', overflowY: 'auto',
        animation: 'fadeUp 0.2s ease',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
          <h3 style={{ color: C.heading, margin: 0, fontSize: 16, fontWeight: 600 }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.muted, fontSize: 20, cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Table viewer with edit/delete ──────────────────────────────────────────────────
function DataTable({ rows, columns, onEdit, onDelete, loading }) {
  if (loading) return (
    <div style={{ padding: '40px 0', textAlign: 'center', color: C.muted, fontSize: 13 }}>
      <div style={{ display: 'inline-block', width: 18, height: 18, border: `2px solid ${C.border}`, borderTopColor: C.purple, borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginRight: 8 }} />
      Loading...
    </div>
  );
  if (!rows.length) return (
    <div style={{ padding: '36px 0', textAlign: 'center', color: C.muted, fontSize: 13, background: C.card, borderRadius: 8, border: `1px dashed ${C.border}` }}>
      <div style={{ fontSize: 24, marginBottom: 8, opacity: 0.6 }}>📭</div>
      No records yet — click <strong>+ Add</strong> to get started
    </div>
  );

  return (
    <div style={{ overflowX: 'auto', borderRadius: 8, border: `1px solid ${C.border}` }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: 'monospace' }}>
        <thead>
          <tr style={{ background: '#0a0d16' }}>
            {columns.map(col => (
              <th key={col} style={{ padding: '9px 12px', textAlign: 'left', color: C.muted, fontWeight: 700, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', borderBottom: `1px solid ${C.border}`, whiteSpace: 'nowrap' }}>
                {col}
              </th>
            ))}
            {(onEdit || onDelete) && <th style={{ padding: '9px 12px', borderBottom: `1px solid ${C.border}`, width: 30 }} />}
            {(onEdit || onDelete) && <th style={{ padding: '9px 12px', borderBottom: `1px solid ${C.border}`, width: 30 }} />}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? C.card : C.surface }}>
              {columns.map(col => (
                <td key={col} style={{ padding: '8px 12px', color: C.text, borderBottom: `1px solid ${C.border}18`, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {String(row[col] ?? '—')}
                </td>
              ))}
              {onEdit && (
                <td style={{ padding: '8px 12px', borderBottom: `1px solid ${C.border}18`, textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <button onClick={() => onEdit(row)} style={{ background: 'none', border: 'none', color: C.blue + '99', cursor: 'pointer', fontSize: 13, padding: '2px 6px', borderRadius: 4, transition: 'color 0.1s' }}
                    onMouseEnter={e => e.target.style.color = C.blue}
                    onMouseLeave={e => e.target.style.color = C.blue + '99'}
                  >✎</button>
                </td>
              )}
              {onDelete && (
                <td style={{ padding: '8px 12px', borderBottom: `1px solid ${C.border}18`, textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <button onClick={() => onDelete(row)} style={{ background: 'none', border: 'none', color: C.red + '99', cursor: 'pointer', fontSize: 13, padding: '2px 6px', borderRadius: 4, transition: 'color 0.1s' }}
                    onMouseEnter={e => e.target.style.color = C.red}
                    onMouseLeave={e => e.target.style.color = C.red + '99'}
                  >✕</button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PaginationControls({ page, pages, total, limit, onPageChange, onLimitChange }) {
  if (total === 0) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: C.surface, border: `1px solid ${C.border}`, borderTop: 'none', borderBottomLeftRadius: 8, borderBottomRightRadius: 8, fontSize: 12, color: C.muted }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span>Showing {Math.min((page - 1) * limit + 1, total)} to {Math.min(page * limit, total)} of {total}</span>
        <select value={limit} onChange={e => { onLimitChange(Number(e.target.value)); onPageChange(1); }} style={{ background: C.card, color: C.text, border: `1px solid ${C.border}`, padding: '4px 8px', borderRadius: 6, fontSize: 11, cursor: 'pointer', outline: 'none' }}>
          <option value={20}>20 / page</option>
          <option value={50}>50 / page</option>
          <option value={100}>100 / page</option>
        </select>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button disabled={page <= 1} onClick={() => onPageChange(page - 1)} style={{ padding: '4px 10px', borderRadius: 6, background: page <= 1 ? 'transparent' : C.card, border: `1px solid ${page <= 1 ? 'transparent' : C.border}`, color: page <= 1 ? C.borderHi : C.text, cursor: page <= 1 ? 'not-allowed' : 'pointer' }}>Prev</button>
        <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>Page {page} of {pages}</span>
        <button disabled={page >= pages} onClick={() => onPageChange(page + 1)} style={{ padding: '4px 10px', borderRadius: 6, background: page >= pages ? 'transparent' : C.card, border: `1px solid ${page >= pages ? 'transparent' : C.border}`, color: page >= pages ? C.borderHi : C.text, cursor: page >= pages ? 'not-allowed' : 'pointer' }}>Next</button>
      </div>
    </div>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────
function Section({ title, schema, accent, count, action, children }) {
  const [open, setOpen] = useState(true);
  const color = accent || SCHEMA_ACCENT[schema] || C.purple;
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden', marginBottom: 18 }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 18px', cursor: 'pointer', background: C.card,
        borderBottom: open ? `1px solid ${C.border}` : 'none',
      }} onClick={() => setOpen(v => !v)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, boxShadow: `0 0 6px ${color}` }} />
          <span style={{ fontWeight: 600, fontSize: 14, color: C.heading, fontFamily: "'DM Sans', sans-serif" }}>{title}</span>
          {schema && <SchemaPill schema={schema} />}
          {count !== undefined && (
            <span style={{ fontSize: 11, color: C.muted, fontFamily: 'monospace' }}>{count} rows total</span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }} onClick={e => e.stopPropagation()}>
          {action}
          <span style={{ color: C.muted, fontSize: 12, cursor: 'pointer' }} onClick={() => setOpen(v => !v)}>{open ? '▲' : '▼'}</span>
        </div>
      </div>
      {open && <div style={{ padding: 18 }}>{children}</div>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// FORM MODALS for each table
// ═══════════════════════════════════════════════════════════════════════════════

function CustomerForm({ initialData, onSubmit, onClose }) {
  const [f, setF] = useState(initialData || { first_name: '', last_name: '', email: '', phone: '' });
  useEffect(() => { if (initialData) setF(initialData); }, [initialData]);
  const s = k => e => setF(p => ({ ...p, [k]: e.target.value }));
  return (
    <Modal title={initialData ? "Edit Customer" : "Add Customer"} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Input label="First Name" value={f.first_name} onChange={s('first_name')} required placeholder="Jane" />
          <Input label="Last Name" value={f.last_name} onChange={s('last_name')} required placeholder="Doe" />
        </div>
        <Input label="Email" type="email" value={f.email} onChange={s('email')} required placeholder="jane@example.com" />
        <Input label="Phone" value={f.phone} onChange={s('phone')} placeholder="+1 555-0000" />
        <Btn variant="solid" color={C.pink} onClick={() => onSubmit(f)}>
          {initialData ? "Update Customer" : "Insert Customer"}
        </Btn>
      </div>
    </Modal>
  );
}

function AddressForm({ initialData, customers, onSubmit, onClose }) {
  const [f, setF] = useState(initialData || { customer_id: '', city: '', state: '', country: '', postal_code: '' });
  useEffect(() => { if (initialData) setF(initialData); }, [initialData]);
  const s = k => e => setF(p => ({ ...p, [k]: e.target.value }));
  const custOpts = [{ value: '', label: '— select customer —' }, ...customers.map(c => ({ value: c.customer_id, label: `${c.first_name} ${c.last_name} (${c.email})` }))];
  return (
    <Modal title={initialData ? "Edit Address" : "Add Address"} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Select label="Customer" value={f.customer_id} onChange={s('customer_id')} options={custOpts} required />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Input label="City" value={f.city} onChange={s('city')} required placeholder="Los Angeles" />
          <Input label="State" value={f.state} onChange={s('state')} required placeholder="CA" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Input label="Country" value={f.country} onChange={s('country')} required placeholder="USA" />
          <Input label="Postal Code" value={f.postal_code} onChange={s('postal_code')} placeholder="90001" />
        </div>
        <Btn variant="solid" color={C.pink} onClick={() => onSubmit(f)}>
          {initialData ? "Update Address" : "Insert Address"}
        </Btn>
      </div>
    </Modal>
  );
}

function ProductForm({ initialData, onSubmit, onClose }) {
  const [f, setF] = useState(initialData || { product_name: '', category: '', price: '' });
  useEffect(() => { if (initialData) setF(initialData); }, [initialData]);
  const s = k => e => setF(p => ({ ...p, [k]: e.target.value }));
  const cats = ['Electronics', 'Clothing', 'Books', 'Home & Garden', 'Sports', 'Toys', 'Food & Beverage', 'Other'].map(v => ({ value: v, label: v }));
  return (
    <Modal title={initialData ? "Edit Product" : "Add Product"} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Input label="Product Name" value={f.product_name} onChange={s('product_name')} required placeholder="Smart Speaker X1" />
        <Select label="Category" value={f.category} onChange={s('category')} options={[{ value: '', label: '— select category —' }, ...cats]} required />
        <Input label="Price (USD)" type="number" step="0.01" value={f.price} onChange={s('price')} required placeholder="49.99" />
        <Btn variant="solid" color={C.green} onClick={() => onSubmit(f)}>
          {initialData ? "Update Product" : "Insert Product"}
        </Btn>
      </div>
    </Modal>
  );
}

function StockForm({ initialData, products, onSubmit, onClose }) {
  const [f, setF] = useState(initialData || { product_id: '', quantity_available: '', reorder_level: '' });
  useEffect(() => { if (initialData) setF(initialData); }, [initialData]);
  const s = k => e => setF(p => ({ ...p, [k]: e.target.value }));
  const prodOpts = [{ value: '', label: '— select product —' }, ...products.map(p => ({ value: p.product_id, label: `${p.product_name} (${p.category})` }))];
  return (
    <Modal title={initialData ? "Edit Stock Entry" : "Add Stock Entry"} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Select label="Product" value={f.product_id} onChange={s('product_id')} options={prodOpts} required />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Input label="Quantity Available" type="number" value={f.quantity_available} onChange={s('quantity_available')} required placeholder="500" />
          <Input label="Reorder Level" type="number" value={f.reorder_level} onChange={s('reorder_level')} required placeholder="50" />
        </div>
        <Btn variant="solid" color={C.green} onClick={() => onSubmit(f)}>
          {initialData ? "Update Stock" : "Insert Stock"}
        </Btn>
      </div>
    </Modal>
  );
}

function OrderForm({ initialData, customers, onSubmit, onClose }) {
  const [f, setF] = useState(initialData || { customer_id: '', order_status: 'pending', total_amount: '' });
  useEffect(() => { if (initialData) setF(initialData); }, [initialData]);
  const s = k => e => setF(p => ({ ...p, [k]: e.target.value }));
  const custOpts = [{ value: '', label: '— select customer —' }, ...customers.map(c => ({ value: c.customer_id, label: `${c.first_name} ${c.last_name}` }))];
  const statusOpts = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'].map(v => ({ value: v, label: v }));
  return (
    <Modal title={initialData ? "Edit Order" : "Add Order"} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Select label="Customer" value={f.customer_id} onChange={s('customer_id')} options={custOpts} required />
        <Select label="Status" value={f.order_status} onChange={s('order_status')} options={statusOpts} />
        <Input label="Total Amount (USD)" type="number" step="0.01" value={f.total_amount} onChange={s('total_amount')} required placeholder="199.99" />
        <Btn variant="solid" color={C.blue} onClick={() => onSubmit(f)}>
          {initialData ? "Update Order" : "Insert Order"}
        </Btn>
      </div>
    </Modal>
  );
}

function OrderItemForm({ initialData, orders, products, onSubmit, onClose }) {
  const [f, setF] = useState(initialData || { order_id: '', product_id: '', quantity: '', unit_price: '' });
  useEffect(() => { if (initialData) setF(initialData); }, [initialData]);
  const s = k => e => setF(p => ({ ...p, [k]: e.target.value }));
  const orderOpts = [{ value: '', label: '— select order —' }, ...orders.map(o => ({ value: o.order_id, label: `Order #${o.order_id} — ${o.order_status}` }))];
  const prodOpts = [{ value: '', label: '— select product —' }, ...products.map(p => ({ value: p.product_id, label: p.product_name }))];
  return (
    <Modal title={initialData ? "Edit Order Item" : "Add Order Item"} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Select label="Order" value={f.order_id} onChange={s('order_id')} options={orderOpts} required />
        <Select label="Product" value={f.product_id} onChange={s('product_id')} options={prodOpts} required />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Input label="Quantity" type="number" value={f.quantity} onChange={s('quantity')} required placeholder="2" />
          <Input label="Unit Price (USD)" type="number" step="0.01" value={f.unit_price} onChange={s('unit_price')} required placeholder="49.99" />
        </div>
        <Btn variant="solid" color={C.blue} onClick={() => onSubmit(f)}>
           {initialData ? "Update Order Item" : "Insert Order Item"}
        </Btn>
      </div>
    </Modal>
  );
}

function TicketForm({ initialData, customers, products, onSubmit, onClose }) {
  const [f, setF] = useState(initialData || { customer_id: '', product_id: '', issue_type: '', status: 'open' });
  useEffect(() => { if (initialData) setF(initialData); }, [initialData]);
  const s = k => e => setF(p => ({ ...p, [k]: e.target.value }));
  const custOpts = [{ value: '', label: '— select customer —' }, ...customers.map(c => ({ value: c.customer_id, label: `${c.first_name} ${c.last_name}` }))];
  const prodOpts = [{ value: '', label: '— select product —' }, ...products.map(p => ({ value: p.product_id, label: p.product_name }))];
  const statusOpts = ['open', 'in_progress', 'resolved', 'closed'].map(v => ({ value: v, label: v }));
  const issueTypes = ['Charging interrupted', 'Connectivity issue', 'Display dead pixel', 'Audio issue', 'Bluetooth issue', 'Screen flicker', 'Assembly issue', 'Color mismatch', 'Other'].map(v => ({ value: v, label: v }));
  return (
    <Modal title={initialData ? "Edit Support Ticket" : "Add Support Ticket"} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Select label="Customer" value={f.customer_id} onChange={s('customer_id')} options={custOpts} required />
        <Select label="Product" value={f.product_id} onChange={s('product_id')} options={prodOpts} required />
        <Select label="Issue Type" value={f.issue_type} onChange={s('issue_type')} options={[{ value: '', label: '— select issue type —' }, ...issueTypes]} required />
        <Select label="Status" value={f.status} onChange={s('status')} options={statusOpts} />
        <Btn variant="solid" color={C.amber} onClick={() => onSubmit(f)}>
          {initialData ? "Update Ticket" : "Insert Ticket"}
        </Btn>
      </div>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN ADMIN DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════

export default function AdminDashboard() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState('platform');
  const [toast, setToast] = useState({ msg: '', type: 'success' });

  // ── Platform management state ──
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);

  // ── Data feed state ──
  const initP = { data: [], total: 0, page: 1, pages: 1 };
  const [customers, setCustomers] = useState(initP);
  const [addresses, setAddresses] = useState(initP);
  const [products, setProducts] = useState(initP);
  const [stock, setStock] = useState(initP);
  const [orders, setOrders] = useState(initP);
  const [orderItems, setOrderItems] = useState(initP);
  const [tickets, setTickets] = useState(initP);
  const [loadingMap, setLoadingMap] = useState({});

  const [pagination, setPagination] = useState({
    customers:  { page: 1, limit: 20 },
    addresses:  { page: 1, limit: 20 },
    products:   { page: 1, limit: 20 },
    stock:      { page: 1, limit: 20 },
    orders:     { page: 1, limit: 20 },
    orderItems: { page: 1, limit: 20 },
    tickets:    { page: 1, limit: 20 },
  });

  // Modal options cache
  const [options, setOptions] = useState({ customers: [], products: [], orders: [] });

  // ── Modal state ──
  const [modal, setModal] = useState(null); // 'customer' | 'address' | 'product' | 'stock' | 'order' | 'order_item' | 'ticket'
  const [editRow, setEditRow] = useState(null);

  const openEdit = (type, row) => {
    setEditRow(row);
    setModal(type);
  };
  const closeEdit = () => {
    setEditRow(null);
    setModal(null);
  };

  const showToast = (msg, type = 'success') => setToast({ msg, type });
  const opt = useCallback(() => ({ headers: { 'Authorization': `Bearer ${token}` } }), [token]);

  const setLoading = (key, val) => setLoadingMap(p => ({ ...p, [key]: val }));

  // ── Fetch helpers ──
  const fetchPlatform = async () => {
    try {
      const [uRes, lRes] = await Promise.all([
        fetch(`${API_BASE}/admin/users`, opt()),
        fetch(`${API_BASE}/admin/audit-logs`, opt()),
      ]);
      if (uRes.ok) setUsers(await uRes.json());
      if (lRes.ok) setLogs(await lRes.json());
    } catch (e) { console.error(e); }
  };

  const fetchTable = async (endpoint, setter, key, p = 1, l = 20) => {
    setLoading(key, true);
    try {
      const res = await fetch(`${API_BASE}${endpoint}?page=${p}&limit=${l}`, opt());
      if (res.ok) setter(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(key, false); }
  };

  const fetchAllData = () => {
    fetchTable('/admin/data/customers', setCustomers, 'customers', pagination.customers.page, pagination.customers.limit);
    fetchTable('/admin/data/addresses', setAddresses, 'addresses', pagination.addresses.page, pagination.addresses.limit);
    fetchTable('/admin/data/products', setProducts, 'products', pagination.products.page, pagination.products.limit);
    fetchTable('/admin/data/stock', setStock, 'stock', pagination.stock.page, pagination.stock.limit);
    fetchTable('/admin/data/orders', setOrders, 'orders', pagination.orders.page, pagination.orders.limit);
    fetchTable('/admin/data/order-items', setOrderItems, 'orderItems', pagination.orderItems.page, pagination.orderItems.limit);
    fetchTable('/admin/data/tickets', setTickets, 'tickets', pagination.tickets.page, pagination.tickets.limit);
  };

  const fetchOptions = async () => {
    if (options.customers.length && options.products.length && options.orders.length) return;
    try {
      const [c, p, o] = await Promise.all([
        fetch(`${API_BASE}/admin/data/customers?page=1&limit=1000`, opt()).then(r => r.json()),
        fetch(`${API_BASE}/admin/data/products?page=1&limit=1000`, opt()).then(r => r.json()),
        fetch(`${API_BASE}/admin/data/orders?page=1&limit=1000`, opt()).then(r => r.json()),
      ]);
      setOptions({ customers: c.data || [], products: p.data || [], orders: o.data || [] });
    } catch (e) { console.error('Failed to load modal options', e); }
  };

  // Re-fetch individual sections when their pagination changes
  useEffect(() => { if (activeTab === 'data') fetchTable('/admin/data/customers', setCustomers, 'customers', pagination.customers.page, pagination.customers.limit); }, [pagination.customers]);
  useEffect(() => { if (activeTab === 'data') fetchTable('/admin/data/addresses', setAddresses, 'addresses', pagination.addresses.page, pagination.addresses.limit); }, [pagination.addresses]);
  useEffect(() => { if (activeTab === 'data') fetchTable('/admin/data/products', setProducts, 'products', pagination.products.page, pagination.products.limit); }, [pagination.products]);
  useEffect(() => { if (activeTab === 'data') fetchTable('/admin/data/stock', setStock, 'stock', pagination.stock.page, pagination.stock.limit); }, [pagination.stock]);
  useEffect(() => { if (activeTab === 'data') fetchTable('/admin/data/orders', setOrders, 'orders', pagination.orders.page, pagination.orders.limit); }, [pagination.orders]);
  useEffect(() => { if (activeTab === 'data') fetchTable('/admin/data/order-items', setOrderItems, 'orderItems', pagination.orderItems.page, pagination.orderItems.limit); }, [pagination.orderItems]);
  useEffect(() => { if (activeTab === 'data') fetchTable('/admin/data/tickets', setTickets, 'tickets', pagination.tickets.page, pagination.tickets.limit); }, [pagination.tickets]);

  useEffect(() => {
    if (modal) fetchOptions();
  }, [modal]);

  useEffect(() => {
    if (activeTab === 'platform') fetchPlatform();
    if (activeTab === 'data') fetchAllData();
  }, [activeTab]);

  // ── Role update ──
  const updateRole = async (userId, newRole) => {
    let passkey;
    if (['admin', 'super_admin'].includes(newRole)) {
      passkey = prompt(`Promoting to ${newRole} requires the master passkey:`);
      if (!passkey) { alert('Promotion cancelled.'); return; }
    }
    const res = await fetch(`${API_BASE}/admin/users/${userId}/role`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ role_name: newRole, passkey }),
    });
    if (!res.ok) { const d = await res.json(); showToast(d.detail || 'Failed to update role', 'error'); }
    else showToast('Role updated successfully');
    fetchPlatform();
  };

  // ── Save helpers ──
  const saveRecord = async (endpoint, method, body, refreshFn, tableName) => {
    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        showToast(`${tableName} saved successfully`, 'success');
        closeEdit();
        refreshFn();
      } else {
        const d = await res.json();
        showToast(d.detail || `Failed to save ${tableName}`, 'error');
      }
    } catch (e) {
      showToast(`Network error saving ${tableName}`, 'error');
    }
  };

  // ── Delete helpers ──
  const deleteRecord = async (endpoint, id, refreshFn, tableName) => {
    if (!confirm(`Delete this ${tableName} record? This cannot be undone.`)) return;
    try {
      const res = await fetch(`${API_BASE}${endpoint}/${id}`, { method: 'DELETE', ...opt() });
      if (res.ok) { showToast(`${tableName} deleted`); refreshFn(); }
      else showToast(`Failed to delete ${tableName}`, 'error');
    } catch (e) { showToast('Network error', 'error'); }
  };

  // ─── NAV TABS ──────────────────────────────────────────────────────────────
  const tabs = [
    { id: 'platform', label: 'Platform Management', color: C.blue },
    { id: 'data',     label: 'Data Feed Tools',      color: C.amber },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;600&display=swap');
        * { box-sizing: border-box; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        @keyframes slideUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-thumb { background: #1e2230; border-radius: 3px; }
      `}</style>

      <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: "'DM Sans', sans-serif" }}>

        {/* ── Header ── */}
        <div style={{ padding: '14px 32px', background: C.surface, borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg, #1a1a3e, #2a1060)', border: '1px solid #3a2a80', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.purple, fontSize: 16 }}>◈</div>
            <div>
              <p style={{ fontSize: 15, fontWeight: 700, color: C.heading, margin: 0, letterSpacing: '-0.01em' }}>Admin Dashboard</p>
              <p style={{ fontSize: 10, color: C.muted, margin: 0, fontFamily: 'monospace', letterSpacing: '0.08em' }}>NL2SQL · ENTERPRISE</p>
            </div>
            <a href="/" style={{ color: C.blue, fontSize: 13, textDecoration: 'none', fontWeight: 600, padding: '5px 10px', borderRadius: 7, background: C.blue + '14', border: `1px solid ${C.blue}33` }}>← Back to Chat</a>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
                padding: '8px 18px', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                border: `1px solid ${activeTab === t.id ? t.color + '55' : C.border}`,
                background: activeTab === t.id ? t.color + '18' : 'transparent',
                color: activeTab === t.id ? t.color : C.muted,
                transition: 'all 0.15s',
              }}>{t.label}</button>
            ))}
          </div>
        </div>

        <div style={{ padding: '32px 32px', maxWidth: 1200, margin: '0 auto' }}>

          {/* ════════════════ PLATFORM MANAGEMENT ════════════════ */}
          {activeTab === 'platform' && (
            <div style={{ animation: 'fadeUp 0.3s ease' }}>
              {/* Stats row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 28 }}>
                {[
                  { label: 'Total Users', value: users.length, color: C.blue },
                  { label: 'Admins', value: users.filter(u => u.role === 'admin' || u.role === 'super_admin').length, color: C.purple },
                  { label: 'Audit Events', value: logs.length, color: C.amber },
                ].map(s => (
                  <div key={s.label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '14px 18px' }}>
                    <p style={{ color: C.muted, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', margin: '0 0 6px', fontFamily: 'monospace', textTransform: 'uppercase' }}>{s.label}</p>
                    <p style={{ color: s.color, fontSize: 28, fontWeight: 700, margin: 0 }}>{s.value}</p>
                  </div>
                ))}
              </div>

              {/* User table */}
              <Section title="User Management" accent={C.blue} count={users.length}>
                <div style={{ overflowX: 'auto', borderRadius: 8, border: `1px solid ${C.border}` }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: C.card }}>
                        {['Email', 'Name', 'Role', 'Change Role'].map(h => (
                          <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: C.muted, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', borderBottom: `1px solid ${C.border}`, fontFamily: 'monospace' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u, i) => {
                        const roleColor = u.role === 'super_admin' ? C.purple : u.role === 'admin' ? C.amber : C.muted;
                        return (
                          <tr key={u.id} style={{ background: i % 2 === 0 ? C.card : C.surface }}>
                            <td style={{ padding: '10px 14px', color: C.blue, borderBottom: `1px solid ${C.border}18` }}>{u.email}</td>
                            <td style={{ padding: '10px 14px', color: C.text, borderBottom: `1px solid ${C.border}18` }}>{u.name}</td>
                            <td style={{ padding: '10px 14px', borderBottom: `1px solid ${C.border}18` }}>
                              <span style={{ padding: '2px 10px', borderRadius: 99, background: roleColor + '22', border: `1px solid ${roleColor}33`, color: roleColor, fontSize: 11, fontWeight: 700, fontFamily: 'monospace' }}>{u.role || 'user'}</span>
                            </td>
                            <td style={{ padding: '10px 14px', borderBottom: `1px solid ${C.border}18` }}>
                              <select value={u.role || 'user'} onChange={e => updateRole(u.id, e.target.value)}
                                style={{ background: C.card, color: C.text, border: `1px solid ${C.border}`, padding: '5px 8px', borderRadius: 7, fontSize: 12, cursor: 'pointer', fontFamily: 'monospace' }}>
                                <option value="super_admin">super_admin</option>
                                <option value="admin">admin</option>
                                <option value="user">user</option>
                              </select>
                            </td>
                          </tr>
                        );
                      })}
                      {!users.length && <tr><td colSpan={4} style={{ padding: '20px 14px', color: C.muted, fontSize: 13 }}>No users found.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </Section>

              {/* Audit logs */}
              <Section title="Audit Logs" accent={C.amber} count={logs.length}>
                <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: '4px 0', maxHeight: 400, overflowY: 'auto' }}>
                  {logs.map((log, i) => (
                    <div key={i} style={{ padding: '10px 16px', borderBottom: i < logs.length - 1 ? `1px solid ${C.border}22` : 'none', display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'baseline' }}>
                      <span style={{ color: C.blue, fontSize: 12, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{new Date(log.timestamp).toLocaleString()}</span>
                      <span style={{ color: C.red, fontSize: 12, fontFamily: 'monospace', minWidth: 160 }}>{log.user}</span>
                      <span style={{ color: C.amber, fontSize: 12, fontWeight: 700, fontFamily: 'monospace' }}>{log.action}</span>
                      <span style={{ color: C.muted, fontSize: 12 }}>{log.details}</span>
                    </div>
                  ))}
                  {!logs.length && <p style={{ padding: '16px', color: C.muted, fontSize: 13 }}>No audit events yet.</p>}
                </div>
              </Section>
            </div>
          )}

          {/* ════════════════ DATA FEED TOOLS ════════════════ */}
          {activeTab === 'data' && (
            <div style={{ animation: 'fadeUp 0.3s ease' }}>
              <div style={{ marginBottom: 24 }}>
                <h2 style={{ color: C.amber, margin: '0 0 6px', fontSize: 22, fontWeight: 700 }}>Data Feed Tools</h2>
                <p style={{ color: C.muted, fontSize: 14, margin: 0 }}>
                  Insert, view, and delete records across all 4 schemas — feeds directly into the NL2SQL query engine.
                </p>
              </div>

              {/* Schema legend */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
                {Object.entries(SCHEMA_ACCENT).map(([s, c]) => <SchemaPill key={s} schema={s} />)}
              </div>

              {/* ── customer.customers ── */}
              <Section title="Customers" schema="customer" count={customers.total}
                action={<Btn onClick={() => setModal('customer')} color={C.pink}>+ Add Customer</Btn>}>
                <DataTable
                  loading={loadingMap.customers}
                  rows={customers.data}
                  columns={['customer_id', 'first_name', 'last_name', 'email', 'phone', 'created_at']}
                  onEdit={row => openEdit('customer', row)}
                  onDelete={row => deleteRecord('/admin/data/customers', row.customer_id, () => fetchTable('/admin/data/customers', setCustomers, 'customers', pagination.customers.page, pagination.customers.limit), 'Customer')}
                />
                <PaginationControls {...customers} limit={pagination.customers.limit} 
                  onPageChange={p => setPagination(prev => ({...prev, customers: {...prev.customers, page: p}}))}
                  onLimitChange={l => setPagination(prev => ({...prev, customers: {...prev.customers, limit: l}}))} />
              </Section>

              {/* ── customer.addresses ── */}
              <Section title="Addresses" schema="customer" count={addresses.total}
                action={<Btn onClick={() => setModal('address')} color={C.pink}>+ Add Address</Btn>}>
                <DataTable
                  loading={loadingMap.addresses}
                  rows={addresses.data}
                  columns={['address_id', 'customer_id', 'city', 'state', 'country', 'postal_code']}
                  onEdit={row => openEdit('address', row)}
                  onDelete={row => deleteRecord('/admin/data/addresses', row.address_id, () => fetchTable('/admin/data/addresses', setAddresses, 'addresses', pagination.addresses.page, pagination.addresses.limit), 'Address')}
                />
                <PaginationControls {...addresses} limit={pagination.addresses.limit} 
                  onPageChange={p => setPagination(prev => ({...prev, addresses: {...prev.addresses, page: p}}))}
                  onLimitChange={l => setPagination(prev => ({...prev, addresses: {...prev.addresses, limit: l}}))} />
              </Section>

              {/* ── inventory.products ── */}
              <Section title="Products" schema="inventory" count={products.total}
                action={<Btn onClick={() => setModal('product')} color={C.green}>+ Add Product</Btn>}>
                <DataTable
                  loading={loadingMap.products}
                  rows={products.data}
                  columns={['product_id', 'product_name', 'category', 'price', 'created_at']}
                  onEdit={row => openEdit('product', row)}
                  onDelete={row => deleteRecord('/admin/data/products', row.product_id, () => fetchTable('/admin/data/products', setProducts, 'products', pagination.products.page, pagination.products.limit), 'Product')}
                />
                <PaginationControls {...products} limit={pagination.products.limit} 
                  onPageChange={p => setPagination(prev => ({...prev, products: {...prev.products, page: p}}))}
                  onLimitChange={l => setPagination(prev => ({...prev, products: {...prev.products, limit: l}}))} />
              </Section>

              {/* ── inventory.stock ── */}
              <Section title="Stock" schema="inventory" count={stock.total}
                action={<Btn onClick={() => setModal('stock')} color={C.green}>+ Add Stock Entry</Btn>}>
                <DataTable
                  loading={loadingMap.stock}
                  rows={stock.data}
                  columns={['stock_id', 'product_id', 'quantity_available', 'reorder_level', 'last_updated']}
                  onEdit={row => openEdit('stock', row)}
                  onDelete={row => deleteRecord('/admin/data/stock', row.stock_id, () => fetchTable('/admin/data/stock', setStock, 'stock', pagination.stock.page, pagination.stock.limit), 'Stock')}
                />
                <PaginationControls {...stock} limit={pagination.stock.limit} 
                  onPageChange={p => setPagination(prev => ({...prev, stock: {...prev.stock, page: p}}))}
                  onLimitChange={l => setPagination(prev => ({...prev, stock: {...prev.stock, limit: l}}))} />
              </Section>

              {/* ── sales.orders ── */}
              <Section title="Orders" schema="sales" count={orders.total}
                action={<Btn onClick={() => setModal('order')} color={C.blue}>+ Add Order</Btn>}>
                <DataTable
                  loading={loadingMap.orders}
                  rows={orders.data}
                  columns={['order_id', 'customer_id', 'order_date', 'order_status', 'total_amount']}
                  onEdit={row => openEdit('order', row)}
                  onDelete={row => deleteRecord('/admin/data/orders', row.order_id, () => fetchTable('/admin/data/orders', setOrders, 'orders', pagination.orders.page, pagination.orders.limit), 'Order')}
                />
                <PaginationControls {...orders} limit={pagination.orders.limit} 
                  onPageChange={p => setPagination(prev => ({...prev, orders: {...prev.orders, page: p}}))}
                  onLimitChange={l => setPagination(prev => ({...prev, orders: {...prev.orders, limit: l}}))} />
              </Section>

              {/* ── sales.order_items ── */}
              <Section title="Order Items" schema="sales" count={orderItems.total}
                action={<Btn onClick={() => setModal('order_item')} color={C.blue}>+ Add Order Item</Btn>}>
                <DataTable
                  loading={loadingMap.orderItems}
                  rows={orderItems}
                  columns={['order_item_id', 'order_id', 'product_id', 'quantity', 'unit_price']}
                  onDelete={row => deleteRecord('/admin/data/order-items', row.order_item_id, () => fetchTable('/admin/data/order-items', setOrderItems, 'orderItems'), 'Order Item')}
                />
              </Section>

              {/* ── support.tickets ── */}
              <Section title="Support Tickets" schema="support" count={tickets.length}
                action={<Btn onClick={() => setModal('ticket')} color={C.amber}>+ Add Ticket</Btn>}>
                <DataTable
                  loading={loadingMap.tickets}
                  rows={tickets}
                  columns={['ticket_id', 'customer_id', 'product_id', 'issue_type', 'status', 'created_at']}
                  onDelete={row => deleteRecord('/admin/data/tickets', row.ticket_id, () => fetchTable('/admin/data/tickets', setTickets, 'tickets'), 'Ticket')}
                />
              </Section>

            </div>
          )}
        </div>
      </div>

      {/* ── Modals ── */}
      {modal === 'customer' && (
        <CustomerForm
          initialData={editRow}
          onClose={closeEdit}
          onSubmit={f => saveRecord(editRow ? `/admin/data/customers/${editRow.customer_id}` : '/admin/data/customers', editRow ? 'PUT' : 'POST', f, () => fetchTable('/admin/data/customers', setCustomers, 'customers', pagination.customers.page, pagination.customers.limit), 'Customer')}
        />
      )}
      {modal === 'address' && (
        <AddressForm
          initialData={editRow}
          customers={options.customers}
          onClose={closeEdit}
          onSubmit={f => saveRecord(editRow ? `/admin/data/addresses/${editRow.address_id}` : '/admin/data/addresses', editRow ? 'PUT' : 'POST', { ...f, customer_id: parseInt(f.customer_id) }, () => fetchTable('/admin/data/addresses', setAddresses, 'addresses', pagination.addresses.page, pagination.addresses.limit), 'Address')}
        />
      )}
      {modal === 'product' && (
        <ProductForm
          initialData={editRow}
          onClose={closeEdit}
          onSubmit={f => saveRecord(editRow ? `/admin/data/products/${editRow.product_id}` : '/admin/data/products', editRow ? 'PUT' : 'POST', { ...f, price: parseFloat(f.price) }, () => fetchTable('/admin/data/products', setProducts, 'products', pagination.products.page, pagination.products.limit), 'Product')}
        />
      )}
      {modal === 'stock' && (
        <StockForm
          initialData={editRow}
          products={options.products}
          onClose={closeEdit}
          onSubmit={f => saveRecord(editRow ? `/admin/data/stock/${editRow.stock_id}` : '/admin/data/stock', editRow ? 'PUT' : 'POST', { ...f, product_id: parseInt(f.product_id), quantity_available: parseInt(f.quantity_available), reorder_level: parseInt(f.reorder_level) }, () => fetchTable('/admin/data/stock', setStock, 'stock', pagination.stock.page, pagination.stock.limit), 'Stock')}
        />
      )}
      {modal === 'order' && (
        <OrderForm
          initialData={editRow}
          customers={options.customers}
          onClose={closeEdit}
          onSubmit={f => saveRecord(editRow ? `/admin/data/orders/${editRow.order_id}` : '/admin/data/orders', editRow ? 'PUT' : 'POST', { ...f, customer_id: parseInt(f.customer_id), total_amount: parseFloat(f.total_amount) }, () => fetchTable('/admin/data/orders', setOrders, 'orders', pagination.orders.page, pagination.orders.limit), 'Order')}
        />
      )}
      {modal === 'order_item' && (
        <OrderItemForm
          initialData={editRow}
          orders={options.orders}
          products={options.products}
          onClose={closeEdit}
          onSubmit={f => saveRecord(editRow ? `/admin/data/order-items/${editRow.order_item_id}` : '/admin/data/order-items', editRow ? 'PUT' : 'POST', { ...f, order_id: parseInt(f.order_id), product_id: parseInt(f.product_id), quantity: parseInt(f.quantity), unit_price: parseFloat(f.unit_price) }, () => fetchTable('/admin/data/order-items', setOrderItems, 'orderItems', pagination.orderItems.page, pagination.orderItems.limit), 'Order Item')}
        />
      )}
      {modal === 'ticket' && (
        <TicketForm
          initialData={editRow}
          customers={options.customers}
          products={options.products}
          onClose={closeEdit}
          onSubmit={f => saveRecord(editRow ? `/admin/data/tickets/${editRow.ticket_id}` : '/admin/data/tickets', editRow ? 'PUT' : 'POST', { ...f, customer_id: parseInt(f.customer_id), product_id: parseInt(f.product_id) }, () => fetchTable('/admin/data/tickets', setTickets, 'tickets', pagination.tickets.page, pagination.tickets.limit), 'Ticket')}
        />
      )}

      <Toast msg={toast.msg} type={toast.type} onClose={() => setToast({ msg: '' })} />
    </>
  );
}