import React, { useState, useEffect } from 'react';
import { MapPin, Clock, Phone, IndianRupee, Plus, Search, ParkingCircle, X, Loader2, Car, Camera, List, Map as MapIcon } from 'lucide-react';
import { supabase } from './supabaseClient';
import LocationPicker from './LocationPicker';
import ListingsMap from './ListingsMap';

const AREAS = [
  'Guindy', 'Tambaram', 'Adyar', 'Velachery', 'T Nagar', 'Anna Nagar',
  'Porur', 'OMR', 'Chromepet', 'Nungambakkam', 'Mylapore', 'Kelambakkam'
];

function formatTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':');
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:${m} ${ampm}`;
}

function timeAgo(ts) {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function App() {
  const [tab, setTab] = useState('find');
  const [view, setView] = useState('list'); // 'list' or 'map', within Find tab
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [toast, setToast] = useState('');

  const [form, setForm] = useState({
    area: '', address: '', price: '', from: '', to: '',
    hostName: '', phone: '', notes: '', spotType: 'Driveway'
  });
  const [location, setLocation] = useState(null); // [lat, lng]
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    loadListings();

    // Real-time: auto-refresh when anyone adds/removes a listing
    const channel = supabase
      .channel('listings-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'listings' }, () => {
        loadListings();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function loadListings() {
    setLoading(true);
    const { data, error } = await supabase
      .from('listings')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setListings(data);
    setLoading(false);
  }

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');
    if (!form.area || !form.address || !form.price || !form.hostName || !form.phone) {
      setFormError('Please fill in area, address, price, your name and phone number.');
      return;
    }
    if (isNaN(Number(form.price)) || Number(form.price) <= 0) {
      setFormError('Enter a valid price per hour.');
      return;
    }
    setSubmitting(true);

    let photoUrl = null;
    if (photoFile) {
      const fileExt = photoFile.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('listing-photos')
        .upload(fileName, photoFile);
      if (uploadError) {
        setSubmitting(false);
        setFormError("Couldn't upload photo. You can still list without one, or try again.");
        return;
      }
      const { data: publicUrlData } = supabase.storage.from('listing-photos').getPublicUrl(fileName);
      photoUrl = publicUrlData.publicUrl;
    }

    const { error } = await supabase.from('listings').insert({
      area: form.area,
      address: form.address,
      price: Number(form.price),
      from_time: form.from || null,
      to_time: form.to || null,
      host_name: form.hostName,
      phone: form.phone,
      notes: form.notes,
      spot_type: form.spotType,
      lat: location ? location[0] : null,
      lng: location ? location[1] : null,
      photo_url: photoUrl,
    });
    setSubmitting(false);
    if (error) {
      setFormError("Couldn't save your listing. Please try again.");
      return;
    }
    setForm({ area: '', address: '', price: '', from: '', to: '', hostName: '', phone: '', notes: '', spotType: 'Driveway' });
    setLocation(null);
    setPhotoFile(null);
    setPhotoPreview(null);
    showToast('Your spot is live!');
    setTab('find');
    loadListings();
  }

  function handlePhotoChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setFormError('Photo must be under 5MB.');
      return;
    }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function handleRemove(id) {
    const { error } = await supabase.from('listings').delete().eq('id', id);
    if (!error) {
      setListings(prev => prev.filter(l => l.id !== id));
      showToast('Listing removed.');
    }
  }

  const filtered = listings.filter(l => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return l.area.toLowerCase().includes(q) || l.address.toLowerCase().includes(q);
  });

  return (
    <div style={styles.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Archivo+Black&family=Manrope:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; font-family: 'Manrope', sans-serif; }
        .pe-display { font-family: 'Archivo Black', sans-serif; }
        input, select, textarea { font-family: 'Manrope', sans-serif; }
        input:focus, select:focus, textarea:focus, button:focus-visible {
          outline: 2px solid #FFC93C; outline-offset: 2px;
        }
        ::placeholder { color: #9CA3AF; }
        @media (prefers-reduced-motion: reduce) {
          * { animation: none !important; transition: none !important; }
        }
        @keyframes pe-slide-up {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pe-toast-in {
          from { opacity: 0; transform: translate(-50%, 12px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .pe-card { animation: pe-slide-up 0.35s ease both; }
        .pe-btn-primary:hover { background: #16213E !important; color: #fff !important; }
        .pe-tab:hover { opacity: 0.85; }
      `}</style>

      <header style={styles.header}>
        <div style={styles.headerInner}>
          <div style={styles.brand}>
            <div style={styles.brandIcon}><Car size={20} color="#16213E" strokeWidth={2.5} /></div>
            <span className="pe-display" style={styles.brandName}>ParkEasy</span>
          </div>
          <p style={styles.tagline}>Your neighbour's driveway, your next parking spot.</p>
        </div>

        <svg viewBox="0 0 400 60" style={styles.routeSvg} preserveAspectRatio="none">
          <path d="M 10 40 Q 100 10, 200 35 T 390 30" stroke="#FFC93C" strokeWidth="3" fill="none" strokeDasharray="1 10" strokeLinecap="round" />
          <circle cx="10" cy="40" r="5" fill="#FF6B5B" />
          <circle cx="390" cy="30" r="5" fill="#FF6B5B" />
        </svg>
        <div style={styles.routeLabels}>
          <span style={styles.routeLabel}>Guindy</span>
          <span style={styles.routeLabel}>Tambaram</span>
        </div>
      </header>

      <nav style={styles.tabBar}>
        <button className="pe-tab" style={{ ...styles.tabBtn, ...(tab === 'find' ? styles.tabBtnActive : {}) }} onClick={() => setTab('find')}>
          <Search size={16} /> Find a spot
        </button>
        <button className="pe-tab" style={{ ...styles.tabBtn, ...(tab === 'list' ? styles.tabBtnActive : {}) }} onClick={() => setTab('list')}>
          <Plus size={16} /> List your spot
        </button>
      </nav>

      <main style={styles.main}>
        {tab === 'find' && (
          <div>
            <div style={styles.searchRow}>
              <div style={{ ...styles.searchWrap, flex: 1, marginBottom: 0 }}>
                <Search size={18} color="#6B7280" style={{ position: 'absolute', left: 14, top: 13 }} />
                <input style={styles.searchInput} placeholder="Search by area, e.g. Tambaram" value={query} onChange={e => setQuery(e.target.value)} />
              </div>
              <div style={styles.viewToggle}>
                <button
                  style={{ ...styles.viewToggleBtn, ...(view === 'list' ? styles.viewToggleBtnActive : {}) }}
                  onClick={() => setView('list')}
                  title="List view"
                >
                  <List size={16} />
                </button>
                <button
                  style={{ ...styles.viewToggleBtn, ...(view === 'map' ? styles.viewToggleBtnActive : {}) }}
                  onClick={() => setView('map')}
                  title="Map view"
                >
                  <MapIcon size={16} />
                </button>
              </div>
            </div>

            {view === 'map' && !loading && (
              <div style={{ marginBottom: 18 }}>
                <ListingsMap listings={filtered} onCall={l => showToast(`Calling ${l.host_name}…`)} />
              </div>
            )}

            {view === 'map' ? null : loading ? (
              <div style={styles.emptyState}>
                <Loader2 size={28} color="#16213E" style={{ animation: 'spin 1s linear infinite' }} />
                <p style={{ color: '#6B7280', marginTop: 12 }}>Loading nearby spots…</p>
              </div>
            ) : filtered.length === 0 ? (
              <div style={styles.emptyState}>
                <ParkingCircle size={40} color="#D1D5DB" />
                <p style={{ color: '#374151', fontWeight: 700, marginTop: 12, fontSize: 16 }}>
                  {listings.length === 0 ? 'No spots listed yet' : 'No spots match that search'}
                </p>
                <p style={{ color: '#6B7280', marginTop: 4, fontSize: 14, textAlign: 'center', maxWidth: 280 }}>
                  {listings.length === 0
                    ? 'Be the first — list your driveway or empty space and help someone park safely.'
                    : 'Try a different area, or list your own spot instead.'}
                </p>
                {listings.length === 0 && (
                  <button style={{ ...styles.primaryBtn, marginTop: 16 }} className="pe-btn-primary" onClick={() => setTab('list')}>
                    List your spot
                  </button>
                )}
              </div>
            ) : (
              <div style={styles.grid}>
                {filtered.map((l, i) => (
                  <div key={l.id} className="pe-card" style={{ ...styles.card, animationDelay: `${i * 0.04}s` }}>
                    {l.photo_url && (
                      <img src={l.photo_url} alt={`${l.area} parking spot`} style={styles.cardPhoto} />
                    )}
                    <div style={styles.cardTop}>
                      <span style={styles.spotTypeBadge}>{l.spot_type}</span>
                      <span style={styles.timeAgo}>{timeAgo(l.created_at)}</span>
                    </div>
                    <div style={styles.cardArea}>
                      <MapPin size={16} color="#FF6B5B" />
                      <span style={{ fontWeight: 800, fontSize: 16 }}>{l.area}</span>
                    </div>
                    <p style={styles.cardAddress}>{l.address}</p>
                    {(l.from_time || l.to_time) && (
                      <div style={styles.cardRow}>
                        <Clock size={14} color="#6B7280" />
                        <span style={styles.cardRowText}>
                          {l.from_time ? formatTime(l.from_time) : 'Anytime'} {l.to_time ? `– ${formatTime(l.to_time)}` : ''}
                        </span>
                      </div>
                    )}
                    {l.notes && <p style={styles.notes}>"{l.notes}"</p>}
                    <div style={styles.cardFooter}>
                      <div style={styles.price}>
                        <IndianRupee size={16} strokeWidth={2.5} />
                        <span className="pe-display" style={{ fontSize: 20 }}>{l.price}</span>
                        <span style={styles.perHour}>/hr</span>
                      </div>
                      <a href={`tel:${l.phone}`} style={styles.callBtn} onClick={() => showToast(`Calling ${l.host_name}…`)}>
                        <Phone size={14} /> Call {l.host_name.split(' ')[0]}
                      </a>
                    </div>
                    <button style={styles.removeBtn} onClick={() => handleRemove(l.id)} title="Remove this listing">
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'list' && (
          <form onSubmit={handleSubmit} style={styles.form}>
            <p style={styles.formIntro}>Got a driveway, gate, or empty space near you? List it and set your own price.</p>

            <label style={styles.label}>Area *</label>
            <select style={styles.input} value={form.area} onChange={e => setForm({ ...form, area: e.target.value })}>
              <option value="">Select an area</option>
              {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>

            <label style={styles.label}>Full address / landmark *</label>
            <input style={styles.input} placeholder="e.g. Near Guindy Race Course, opposite Anna Arch" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />

            <label style={styles.label}>Spot type</label>
            <select style={styles.input} value={form.spotType} onChange={e => setForm({ ...form, spotType: e.target.value })}>
              <option>Driveway</option>
              <option>Gated compound</option>
              <option>Open plot</option>
              <option>Covered / basement</option>
            </select>

            <label style={styles.label}>Price per hour (₹) *</label>
            <input style={styles.input} type="number" min="1" placeholder="e.g. 20" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} />

            <div style={styles.timeRow}>
              <div style={{ flex: 1 }}>
                <label style={styles.label}>Available from</label>
                <input style={styles.input} type="time" value={form.from} onChange={e => setForm({ ...form, from: e.target.value })} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={styles.label}>Available to</label>
                <input style={styles.input} type="time" value={form.to} onChange={e => setForm({ ...form, to: e.target.value })} />
              </div>
            </div>

            <label style={styles.label}>Your name *</label>
            <input style={styles.input} placeholder="e.g. Priya" value={form.hostName} onChange={e => setForm({ ...form, hostName: e.target.value })} />

            <label style={styles.label}>Phone number *</label>
            <input style={styles.input} type="tel" placeholder="e.g. 9876543210" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />

            <label style={styles.label}>Notes (optional)</label>
            <textarea style={{ ...styles.input, minHeight: 70, resize: 'vertical' }} placeholder="e.g. Honk once, gate is unlocked till 9pm" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />

            <label style={styles.label}>Pin the exact location (optional)</label>
            <p style={styles.hint}>Tap on the map where your spot is. This helps people find it on the map view.</p>
            <LocationPicker value={location} onChange={setLocation} />

            <label style={styles.label}>Add a photo (optional)</label>
            <p style={styles.hint}>A photo of the driveway or gate helps people recognize it.</p>
            {photoPreview ? (
              <div style={styles.photoPreviewWrap}>
                <img src={photoPreview} alt="Preview" style={styles.photoPreview} />
                <button
                  type="button"
                  style={styles.removePhotoBtn}
                  onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
                >
                  <X size={13} /> Remove
                </button>
              </div>
            ) : (
              <label style={styles.photoUploadBtn}>
                <Camera size={18} />
                <span>Choose a photo</span>
                <input type="file" accept="image/*" onChange={handlePhotoChange} style={{ display: 'none' }} />
              </label>
            )}

            {formError && <p style={styles.formError}>{formError}</p>}

            <p style={styles.privacyNote}>Your name, phone number and address will be visible to anyone using this app.</p>

            <button type="submit" style={styles.primaryBtn} className="pe-btn-primary" disabled={submitting}>
              {submitting ? 'Listing…' : 'List my spot'}
            </button>
          </form>
        )}
      </main>

      {toast && <div style={styles.toast}>{toast}</div>}
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', background: '#FAF9F6', color: '#16213E', paddingBottom: 40 },
  header: { background: '#16213E', paddingTop: 28, paddingBottom: 8, position: 'relative', overflow: 'hidden' },
  headerInner: { padding: '0 20px' },
  brand: { display: 'flex', alignItems: 'center', gap: 10 },
  brandIcon: { width: 34, height: 34, borderRadius: 9, background: '#FFC93C', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  brandName: { color: '#FAF9F6', fontSize: 22, letterSpacing: '0.5px' },
  tagline: { color: '#A9B4D0', fontSize: 13.5, marginTop: 8, marginBottom: 20, fontWeight: 500 },
  routeSvg: { width: '100%', height: 40, display: 'block' },
  routeLabels: { display: 'flex', justifyContent: 'space-between', padding: '2px 22px 16px' },
  routeLabel: { color: '#FF6B5B', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' },
  tabBar: { display: 'flex', gap: 8, padding: '16px 20px 0', maxWidth: 720, margin: '0 auto' },
  tabBtn: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '11px 14px', borderRadius: 10, border: '1.5px solid #E5E1D8', background: '#fff', color: '#6B7280', fontWeight: 700, fontSize: 14, cursor: 'pointer', transition: 'all 0.15s' },
  tabBtnActive: { background: '#16213E', color: '#FAF9F6', borderColor: '#16213E' },
  main: { maxWidth: 720, margin: '0 auto', padding: '20px 20px 0' },
  searchRow: { display: 'flex', gap: 10, marginBottom: 18, alignItems: 'stretch' },
  searchWrap: { position: 'relative', marginBottom: 18 },
  searchInput: { width: '100%', padding: '12px 14px 12px 40px', borderRadius: 10, border: '1.5px solid #E5E1D8', fontSize: 14.5, background: '#fff', color: '#16213E' },
  viewToggle: { display: 'flex', border: '1.5px solid #E5E1D8', borderRadius: 10, overflow: 'hidden', background: '#fff' },
  viewToggleBtn: { width: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'transparent', color: '#9CA3AF', cursor: 'pointer' },
  viewToggleBtnActive: { background: '#16213E', color: '#FFC93C' },
  cardPhoto: { width: '100%', height: 140, objectFit: 'cover', borderRadius: 10, marginBottom: 10, display: 'block' },
  hint: { fontSize: 12, color: '#9CA3AF', margin: '0 0 8px', lineHeight: 1.4 },
  photoUploadBtn: { display: 'flex', alignItems: 'center', gap: 8, padding: '11px 12px', borderRadius: 8, border: '1.5px dashed #D1D5DB', background: '#FAF9F6', color: '#6B7280', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', width: 'fit-content' },
  photoPreviewWrap: { position: 'relative', width: 140 },
  photoPreview: { width: 140, height: 100, objectFit: 'cover', borderRadius: 8, border: '1.5px solid #E5E1D8', display: 'block' },
  removePhotoBtn: { display: 'flex', alignItems: 'center', gap: 4, marginTop: 6, border: 'none', background: 'transparent', color: '#FF6B5B', fontSize: 12, fontWeight: 700, cursor: 'pointer', padding: 0 },
  emptyState: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '50px 20px', textAlign: 'center' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 },
  card: { position: 'relative', background: '#fff', borderRadius: 14, padding: 16, border: '1.5px solid #EDEAE1', boxShadow: '0 1px 2px rgba(22,33,62,0.04)' },
  cardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  spotTypeBadge: { fontSize: 11, fontWeight: 700, color: '#16213E', background: '#FFC93C', padding: '3px 8px', borderRadius: 100, textTransform: 'uppercase', letterSpacing: '0.3px' },
  timeAgo: { fontSize: 11.5, color: '#9CA3AF', fontWeight: 600 },
  cardArea: { display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 },
  cardAddress: { fontSize: 13.5, color: '#6B7280', margin: '0 0 8px', lineHeight: 1.4 },
  cardRow: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 },
  cardRowText: { fontSize: 13, color: '#374151', fontWeight: 600 },
  notes: { fontSize: 12.5, color: '#9CA3AF', fontStyle: 'italic', margin: '4px 0 10px' },
  cardFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 12, borderTop: '1px dashed #EDEAE1' },
  price: { display: 'flex', alignItems: 'center', color: '#16213E' },
  perHour: { fontSize: 12, color: '#9CA3AF', marginLeft: 3, fontWeight: 600 },
  callBtn: { display: 'flex', alignItems: 'center', gap: 5, background: '#FF6B5B', color: '#fff', fontSize: 13, fontWeight: 700, padding: '8px 12px', borderRadius: 8, textDecoration: 'none' },
  removeBtn: { position: 'absolute', top: 10, right: 10, width: 20, height: 20, borderRadius: '50%', border: 'none', background: '#F3F1EA', color: '#9CA3AF', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 10 },
  form: { display: 'flex', flexDirection: 'column', background: '#fff', borderRadius: 14, padding: 20, border: '1.5px solid #EDEAE1', marginBottom: 20 },
  formIntro: { fontSize: 13.5, color: '#6B7280', marginTop: 0, marginBottom: 16, lineHeight: 1.5 },
  label: { fontSize: 12.5, fontWeight: 700, color: '#16213E', marginBottom: 5, marginTop: 12 },
  input: { width: '100%', padding: '11px 12px', borderRadius: 8, border: '1.5px solid #E5E1D8', fontSize: 14, color: '#16213E', background: '#FAF9F6' },
  timeRow: { display: 'flex', gap: 10 },
  formError: { color: '#FF6B5B', fontSize: 13, fontWeight: 600, marginTop: 14 },
  privacyNote: { fontSize: 11.5, color: '#9CA3AF', marginTop: 14, lineHeight: 1.4 },
  primaryBtn: { marginTop: 16, background: '#FFC93C', color: '#16213E', border: 'none', borderRadius: 10, padding: '13px 20px', fontSize: 15, fontWeight: 800, cursor: 'pointer', transition: 'all 0.15s' },
  toast: { position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: '#16213E', color: '#fff', padding: '12px 20px', borderRadius: 10, fontSize: 13.5, fontWeight: 600, boxShadow: '0 8px 24px rgba(0,0,0,0.2)', animation: 'pe-toast-in 0.25s ease both', zIndex: 50 },
};
