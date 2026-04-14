import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Trash2, FileText, ChevronDown, Save, AlertCircle } from 'lucide-react';
import api from '../api';

const TPS_RATE = 0.05;
const TVQ_RATE = 0.09975;

const emptyLigne = () => ({ reference: '', description: '', prixUnitaire: '', quantite: 1, montant: 0 });

// ── Combobox ────────────────────────────────────────────────────────────────
function ArticleCombobox({ value, articles, onSelect, onManualChange }) {
  const [query, setQuery] = useState(value || '');
  const [open, setOpen]   = useState(false);
  const ref = useRef(null);

  useEffect(() => { setQuery(value || ''); }, [value]);

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const filtered = articles.filter(a =>
    a.reference.toLowerCase().includes(query.toLowerCase()) ||
    a.description.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 8);

  const handleChange = e => { const v = e.target.value.toUpperCase(); setQuery(v); onManualChange(v); setOpen(true); };
  const handleSelect = a => { setQuery(a.reference); onSelect(a); setOpen(false); };

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <input type="text" value={query} onChange={handleChange} onFocus={() => setOpen(true)}
          placeholder="Référence..." className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 pr-7 bg-white" />
        <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute z-50 top-full left-0 mt-1 w-full md:w-72 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden">
          {filtered.map(a => (
            <button key={a._id} type="button" onMouseDown={() => handleSelect(a)}
              className="w-full text-left px-3.5 py-2.5 hover:bg-blue-50 border-b border-slate-50 last:border-0 group">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-700">{a.reference}</span>
                <span className="text-xs font-semibold text-slate-500">{parseFloat(a.prixUnitaire).toFixed(2)} $</span>
              </div>
              <div className="text-xs text-slate-500 truncate mt-0.5">{a.description}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Ligne d'article (responsive) ───────────────────────────────────────────
function LigneArticle({ ligne, index, articles, onUpdate, onSelect, onRemove, canRemove }) {
  const update = (field, value) => onUpdate(index, field, value);

  return (
    <div className="p-3 md:p-3.5 bg-slate-50 rounded-xl border border-slate-100 hover:border-blue-100 transition-colors">

      {/* ── Desktop : grille 6 colonnes ─────────────────────────── */}
      <div className="hidden md:grid gap-3 items-center" style={{ gridTemplateColumns: '170px 1fr 115px 75px 100px 36px' }}>
        <ArticleCombobox value={ligne.reference} articles={articles} onSelect={a => onSelect(index, a)} onManualChange={v => update('reference', v)} />
        <input type="text" value={ligne.description} onChange={e => update('description', e.target.value)} placeholder="Description..."
          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-white" />
        <div className="relative">
          <input type="number" value={ligne.prixUnitaire} onChange={e => update('prixUnitaire', e.target.value)} placeholder="0.00" min="0" step="0.01"
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-white text-right pr-5" />
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">$</span>
        </div>
        <input type="number" value={ligne.quantite} onChange={e => update('quantite', e.target.value)} min="1" step="1"
          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-white text-center" />
        <div className="text-right font-semibold text-slate-700 text-sm pr-1">{(parseFloat(ligne.montant) || 0).toFixed(2)} $</div>
        <div className="flex justify-center">
          {canRemove
            ? <button onClick={onRemove} className="w-8 h-8 flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={14} /></button>
            : <div className="w-8" />
          }
        </div>
      </div>

      {/* ── Mobile : layout empilé ──────────────────────────────── */}
      <div className="md:hidden space-y-2">
        {/* Ligne 1 : Référence + Description */}
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Référence</p>
          <ArticleCombobox value={ligne.reference} articles={articles} onSelect={a => onSelect(index, a)} onManualChange={v => update('reference', v)} />
        </div>
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Description</p>
          <input type="text" value={ligne.description} onChange={e => update('description', e.target.value)} placeholder="Description..."
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-white" />
        </div>

        {/* Ligne 2 : Prix + Quantité */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Prix unit. ($)</p>
            <input type="number" value={ligne.prixUnitaire} onChange={e => update('prixUnitaire', e.target.value)} placeholder="0.00" min="0" step="0.01"
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-white text-right" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Quantité</p>
            <input type="number" value={ligne.quantite} onChange={e => update('quantite', e.target.value)} min="1" step="1"
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-white text-center" />
          </div>
        </div>

        {/* Ligne 3 : Montant + Supprimer */}
        <div className="flex items-center justify-between bg-white rounded-xl px-3 py-2 border border-slate-200">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Montant</p>
            <p className="font-bold text-slate-800 text-base">{(parseFloat(ligne.montant) || 0).toFixed(2)} $</p>
          </div>
          {canRemove && (
            <button onClick={onRemove} className="flex items-center gap-1.5 text-red-500 bg-red-50 hover:bg-red-100 px-3 py-2 rounded-lg text-xs font-semibold transition-colors">
              <Trash2 size={13} /> Retirer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Page principale ─────────────────────────────────────────────────────────
export default function CreateFacture() {
  const navigate  = useNavigate();
  const { id }    = useParams();
  const isEdit    = Boolean(id);

  const [articles, setArticles] = useState([]);
  const [loading, setLoading]   = useState(isEdit);
  const [date, setDate]         = useState(new Date().toISOString().split('T')[0]);
  const [numeroFacture, setNumeroFacture] = useState('');
  const [client, setClient]     = useState({ nom: '', adresse: '', ville: '', codePostal: '', telephone: '', email: '' });
  const [lignes, setLignes]     = useState([emptyLigne()]);
  const [notes, setNotes]       = useState('');
  const [error, setError]       = useState('');
  const [saving, setSaving]     = useState(false);

  useEffect(() => {
    api.get('/articles').then(r => setArticles(r.data)).catch(() => {});
    if (isEdit) {
      api.get(`/factures/${id}`)
        .then(r => {
          const f = r.data;
          setDate(f.date ? f.date.split('T')[0] : new Date().toISOString().split('T')[0]);
          setNumeroFacture(f.numero || '');
          setClient({ nom: f.client?.nom || '', adresse: f.client?.adresse || '', ville: f.client?.ville || '', codePostal: f.client?.codePostal || '', telephone: f.client?.telephone || '', email: f.client?.email || '' });
          setLignes(f.lignes?.length ? f.lignes.map(l => ({ reference: l.reference || '', description: l.description || '', prixUnitaire: l.prixUnitaire ?? '', quantite: l.quantite ?? 1, montant: l.montant ?? 0 })) : [emptyLigne()]);
          setNotes(f.notes || '');
        })
        .catch(() => setError('Impossible de charger la facture.'))
        .finally(() => setLoading(false));
    }
  }, [id, isEdit]);

  const totals = useCallback(() => {
    const s = lignes.reduce((sum, l) => sum + (parseFloat(l.montant) || 0), 0);
    return { soustotal: s, tps: s * TPS_RATE, tvq: s * TVQ_RATE, total: s * (1 + TPS_RATE + TVQ_RATE) };
  }, [lignes])();

  const updateLigne = (index, field, value) => {
    setLignes(prev => {
      const u = [...prev];
      u[index] = { ...u[index], [field]: value };
      const pu = parseFloat(u[index].prixUnitaire) || 0;
      const qty = parseFloat(u[index].quantite) || 0;
      u[index].montant = parseFloat((pu * qty).toFixed(2));
      return u;
    });
  };

  const selectArticle = (index, article) => {
    setLignes(prev => {
      const u = [...prev];
      const qty = parseFloat(u[index].quantite) || 1;
      u[index] = { ...u[index], reference: article.reference, description: article.description, prixUnitaire: article.prixUnitaire, quantite: qty, montant: parseFloat((article.prixUnitaire * qty).toFixed(2)) };
      return u;
    });
  };

  const handleSave = async () => {
    setError('');
    if (!client.nom.trim()) return setError('Le nom du client est requis.');
    const lignesValides = lignes.filter(l => l.description || l.reference);
    if (!lignesValides.length) return setError('Ajoutez au moins un article.');
    try {
      setSaving(true);
      const payload = { date, client, notes, lignes: lignesValides, ...totals };
      if (isEdit) await api.put(`/factures/${id}`, payload);
      else        await api.post('/factures', payload);
      navigate('/factures');
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la sauvegarde.');
    } finally { setSaving(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto pb-8">

      {/* En-tête */}
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5 mb-0.5">
            <div className="w-8 h-8 md:w-9 md:h-9 bg-blue-100 rounded-xl flex items-center justify-center">
              <FileText size={16} className="text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-slate-800">
                {isEdit ? 'Modifier la Facture' : 'Créer une Facture'}
              </h1>
              {isEdit && numeroFacture && <p className="text-blue-600 text-xs font-semibold">N° {numeroFacture}</p>}
            </div>
          </div>
        </div>
        <button onClick={handleSave} disabled={saving}
          className="flex-shrink-0 flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-lg shadow-blue-500/25 disabled:opacity-50">
          <Save size={15} />
          <span className="hidden sm:inline">{saving ? 'Sauvegarde...' : (isEdit ? 'Enregistrer' : 'Enregistrer')}</span>
        </button>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2.5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium">
          <AlertCircle size={15} />{error}
        </div>
      )}

      {/* Date */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 md:p-5 mb-4">
        <label className="block text-xs font-semibold text-slate-500 mb-1.5">Date de la facture</label>
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          className="border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 w-full md:w-auto" />
      </div>

      {/* Client */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 md:p-6 mb-4">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Informations client</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { key: 'nom',       label: 'Nom / Entreprise *', placeholder: 'Nom du client',       type: 'text'  },
            { key: 'email',     label: 'Email',               placeholder: 'email@exemple.com',   type: 'email' },
            { key: 'adresse',   label: 'Adresse',             placeholder: '123 rue Principale',  type: 'text'  },
            { key: 'telephone', label: 'Téléphone',           placeholder: '(514) 000-0000',      type: 'tel'   },
            { key: 'ville',     label: 'Ville',               placeholder: 'Montréal',            type: 'text'  },
            { key: 'codePostal',label: 'Code postal',         placeholder: 'H1A 1A1',             type: 'text'  },
          ].map(({ key, label, placeholder, type }) => (
            <div key={key}>
              <label className="block text-xs font-semibold text-slate-500 mb-1">{label}</label>
              <input type={type} value={client[key]} onChange={e => setClient(p => ({ ...p, [key]: e.target.value }))} placeholder={placeholder}
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400" />
            </div>
          ))}
        </div>
      </div>

      {/* Articles */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 mb-4 overflow-hidden">
        <div className="px-4 md:px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <h2 className="text-sm font-semibold text-slate-700">Articles / Services</h2>
          <button onClick={() => setLignes(p => [...p, emptyLigne()])}
            className="flex items-center gap-1.5 text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded-xl text-xs font-semibold transition-all">
            <Plus size={13} /> Ajouter
          </button>
        </div>

        {/* En-têtes desktop */}
        <div className="hidden md:grid px-5 py-2.5 bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider gap-3"
          style={{ gridTemplateColumns: '170px 1fr 115px 75px 100px 36px' }}>
          <div>Référence</div><div>Description</div><div>Prix unitaire</div>
          <div className="text-center">Qté</div><div className="text-right">Montant</div><div />
        </div>

        <div className="p-3 md:p-4 space-y-2.5">
          {lignes.map((ligne, i) => (
            <LigneArticle key={i} ligne={ligne} index={i} articles={articles}
              onUpdate={updateLigne} onSelect={selectArticle}
              onRemove={() => setLignes(p => p.filter((_, idx) => idx !== i))}
              canRemove={lignes.length > 1}
            />
          ))}
        </div>

        <div className="px-3 md:px-5 pb-4">
          <button onClick={() => setLignes(p => [...p, emptyLigne()])}
            className="w-full py-2.5 border-2 border-dashed border-slate-200 hover:border-blue-300 text-slate-400 hover:text-blue-500 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2">
            <Plus size={14} /> Ajouter une ligne
          </button>
        </div>
      </div>

      {/* Notes */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 md:p-5 mb-4">
        <label className="block text-xs font-semibold text-slate-500 mb-1.5">Notes (optionnel)</label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Informations supplémentaires..."
          className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 resize-none" />
      </div>

      {/* Totaux */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 md:p-6 mb-6">
        <div className="flex justify-end">
          <div className="w-full md:w-80 space-y-2">
            {[
              { label: 'Montant total hors taxe', value: totals.soustotal, bold: false },
              { label: 'TPS (5 %)',                value: totals.tps,       bold: false },
              { label: 'TVQ (9,975 %)',            value: totals.tvq,       bold: false },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between text-sm text-slate-600 py-1 border-b border-slate-100 last:border-0">
                <span>{label}</span>
                <span className="font-medium">{value.toFixed(2)} $</span>
              </div>
            ))}
            <div className="bg-blue-600 rounded-xl px-4 py-3 flex justify-between items-center mt-2">
              <span className="text-white font-bold text-sm">Total TTC</span>
              <span className="text-white font-extrabold text-lg">{totals.total.toFixed(2)} $</span>
            </div>
          </div>
        </div>
      </div>

      {/* Boutons */}
      <div className="flex justify-end gap-3">
        <button onClick={() => navigate('/factures')}
          className="px-5 py-2.5 rounded-xl font-semibold text-sm border border-slate-200 hover:bg-slate-50 text-slate-600">
          Annuler
        </button>
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 md:px-8 py-2.5 rounded-xl font-semibold text-sm shadow-lg shadow-blue-500/25 disabled:opacity-50">
          <Save size={15} />
          {saving ? 'Sauvegarde...' : (isEdit ? 'Enregistrer les modifications' : 'Enregistrer la facture')}
        </button>
      </div>
    </div>
  );
}
