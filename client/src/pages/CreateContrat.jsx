import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  FileSignature, Save, Plus, Trash2, AlertCircle,
  ChevronDown, Download, RefreshCw
} from 'lucide-react';
import api from '../api';

// ── Conversion nombre → lettres (FR) ─────────────────────────────────────────
function nombreEnLettres(n) {
  n = Math.round(n);
  if (!n || isNaN(n)) return 'zéro';
  if (n < 0) return 'moins ' + nombreEnLettres(-n);
  const units = [
    '', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf',
    'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize',
    'dix-sept', 'dix-huit', 'dix-neuf'
  ];
  const tensW = ['', 'dix', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante'];
  function bH(x) {
    if (!x) return '';
    if (x < 20) return units[x];
    const t = Math.floor(x / 10), u = x % 10;
    if (t === 7) return 'soixante-' + units[10 + u];
    if (t === 8) return u === 0 ? 'quatre-vingts' : 'quatre-vingt-' + units[u];
    if (t === 9) return 'quatre-vingt-' + units[10 + u];
    if (!u) return tensW[t];
    if (u === 1) return tensW[t] + ' et un';
    return tensW[t] + '-' + units[u];
  }
  function bT(x) {
    if (!x) return '';
    if (x < 100) return bH(x);
    const h = Math.floor(x / 100), r = x % 100;
    const base = h === 1 ? 'cent' : units[h] + ' cent';
    if (!r) return h === 1 ? 'cent' : units[h] + ' cents';
    return base + ' ' + bH(r);
  }
  const parts = [];
  if (n >= 1000000) { const m = Math.floor(n / 1000000); parts.push(m === 1 ? 'un million' : bT(m) + ' millions'); n %= 1000000; }
  if (n >= 1000)    { const k = Math.floor(n / 1000);    parts.push(k === 1 ? 'mille' : bT(k) + ' mille'); n %= 1000; }
  if (n > 0)        parts.push(bT(n));
  return parts.join(' ');
}

const PHRASE_DEFAULT = "Réalisation des travaux d'aménagement paysager énuméré comme suit :";

// ── Champ texte générique ─────────────────────────────────────────────────────
function Field({ label, required, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls = "w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#A11010]/20 focus:border-[#A11010]/60 transition-all bg-white";

export default function CreateContrat() {
  const navigate          = useNavigate();
  const { id }            = useParams();
  const [searchParams]    = useSearchParams();
  const isEdit            = Boolean(id);

  // Source
  const [source, setSource]     = useState('scratch'); // 'scratch' | 'fromFacture'
  const [factures, setFactures] = useState([]);
  const [factureId, setFactureId] = useState(searchParams.get('factureId') || '');

  // Champs principaux
  const [date, setDate]             = useState(new Date().toISOString().split('T')[0]);
  const [dateDebut, setDateDebut]   = useState('');
  const [client, setClient]         = useState({ nom: '', adresse: '', ville: '', codePostal: '', telephone: '', email: '' });
  const [phraseAccroche, setPhraseAccroche] = useState(PHRASE_DEFAULT);
  const [items, setItems]           = useState(['']);
  const [contenuLibre, setContenuLibre] = useState('');
  const [modalites, setModalites]   = useState([{ montant: '', description: '' }]);
  const [total, setTotal]           = useState('');
  const [totalEnLettres, setTotalEnLettres] = useState('');
  const [notes, setNotes]           = useState('');

  const [loading, setLoading]   = useState(isEdit);
  const [saving, setSaving]     = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError]       = useState('');
  const [savedId, setSavedId]   = useState(null);

  // ── Chargement initial ──────────────────────────────────────────────────────
  useEffect(() => {
    api.get('/factures').then(r => setFactures(r.data)).catch(() => {});

    if (isEdit) {
      api.get(`/contrats/${id}`)
        .then(r => {
          const c = r.data;
          setDate(c.date ? c.date.split('T')[0] : new Date().toISOString().split('T')[0]);
          setDateDebut(c.dateDebut ? c.dateDebut.split('T')[0] : '');
          setClient({ nom: c.client?.nom || '', adresse: c.client?.adresse || '', ville: c.client?.ville || '', codePostal: c.client?.codePostal || '', telephone: c.client?.telephone || '', email: c.client?.email || '' });
          setPhraseAccroche(c.phraseAccroche || PHRASE_DEFAULT);
          setItems(c.items?.length ? c.items : ['']);
          setContenuLibre(c.contenuLibre || '');
          setModalites(c.modalites?.length ? c.modalites.map(m => ({ montant: m.montant ?? '', description: m.description || '' })) : [{ montant: '', description: '' }]);
          setTotal(c.total ? String(c.total) : '');
          setTotalEnLettres(c.totalEnLettres || '');
          setNotes(c.notes || '');
          if (c.factureId) { setFactureId(c.factureId); setSource('fromFacture'); }
          setSavedId(c._id);
        })
        .catch(() => setError('Impossible de charger le contrat.'))
        .finally(() => setLoading(false));
    }
  }, [id, isEdit]);

  // ── Si factureId dans l'URL → source = fromFacture ──────────────────────────
  useEffect(() => {
    if (factureId && !isEdit) setSource('fromFacture');
  }, [factureId, isEdit]);

  // ── Chargement des données de la facture sélectionnée ───────────────────────
  const loadFromFacture = useCallback(async (fid) => {
    if (!fid) return;
    try {
      const r = await api.get(`/factures/${fid}`);
      const f = r.data;
      setClient({ nom: f.client?.nom || '', adresse: f.client?.adresse || '', ville: f.client?.ville || '', codePostal: f.client?.codePostal || '', telephone: f.client?.telephone || '', email: f.client?.email || '' });
      const newItems = (f.lignes || [])
        .filter(l => l.description || l.reference)
        .map(l => l.description || l.reference || '');
      setItems(newItems.length ? newItems : ['']);
      const totalF = parseFloat(f.total || 0);
      setTotal(totalF > 0 ? String(Math.round(totalF)) : '');
      setTotalEnLettres(totalF > 0 ? nombreEnLettres(Math.round(totalF)) : '');
      setModalites([{ montant: totalF > 0 ? String(Math.round(totalF)) : '', description: 'maintenant' }]);
    } catch { setError('Impossible de charger la facture sélectionnée.'); }
  }, []);

  useEffect(() => {
    if (source === 'fromFacture' && factureId && !isEdit) {
      loadFromFacture(factureId);
    }
  }, [factureId, source, isEdit, loadFromFacture]);

  // ── Recalcul automatique du total depuis les modalités ───────────────────────
  const totalFromModalites = modalites.reduce((s, m) => s + (parseFloat(m.montant) || 0), 0);

  const autoTotal = () => {
    if (totalFromModalites > 0) {
      setTotal(String(Math.round(totalFromModalites)));
      setTotalEnLettres(nombreEnLettres(Math.round(totalFromModalites)));
    }
  };

  useEffect(() => {
    if (totalFromModalites > 0 && !total) {
      setTotal(String(Math.round(totalFromModalites)));
    }
  }, [totalFromModalites]);

  // ── Mise à jour automatique du total en lettres ──────────────────────────────
  const handleTotalChange = (val) => {
    setTotal(val);
    const n = parseFloat(val) || 0;
    if (n > 0) setTotalEnLettres(nombreEnLettres(Math.round(n)));
    else setTotalEnLettres('');
  };

  // ── Items ────────────────────────────────────────────────────────────────────
  const updateItem  = (i, val) => setItems(p => { const u = [...p]; u[i] = val; return u; });
  const addItem     = ()       => setItems(p => [...p, '']);
  const removeItem  = (i)      => setItems(p => p.filter((_, idx) => idx !== i));

  // ── Modalités ────────────────────────────────────────────────────────────────
  const updateModalite = (i, field, val) =>
    setModalites(p => { const u = [...p]; u[i] = { ...u[i], [field]: val }; return u; });
  const addModalite    = ()    => setModalites(p => [...p, { montant: '', description: '' }]);
  const removeModalite = (i)   => setModalites(p => p.filter((_, idx) => idx !== i));

  // ── Sauvegarde ───────────────────────────────────────────────────────────────
  const buildPayload = () => ({
    date,
    dateDebut: dateDebut || null,
    factureId:     source === 'fromFacture' ? factureId || null : null,
    factureNumero: source === 'fromFacture'
      ? (factures.find(f => f._id === factureId)?.numero || '')
      : '',
    client,
    phraseAccroche,
    items:   items.filter(i => i.trim()),
    contenuLibre,
    modalites: modalites.filter(m => m.montant || m.description).map(m => ({
      montant:     parseFloat(m.montant) || 0,
      description: m.description || ''
    })),
    total:          parseFloat(total) || 0,
    totalEnLettres: totalEnLettres || nombreEnLettres(Math.round(parseFloat(total) || 0)),
    notes
  });

  const handleSave = async () => {
    setError('');
    if (!client.nom.trim()) return setError('Le nom du client est requis.');
    try {
      setSaving(true);
      const payload = buildPayload();
      let saved;
      if (isEdit) {
        const r = await api.put(`/contrats/${id}`, payload);
        saved = r.data;
      } else {
        const r = await api.post('/contrats', payload);
        saved = r.data;
      }
      setSavedId(saved._id);
      navigate('/contrats');
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la sauvegarde.');
    } finally { setSaving(false); }
  };

  const handleSaveAndPDF = async () => {
    setError('');
    if (!client.nom.trim()) return setError('Le nom du client est requis.');
    try {
      setSaving(true);
      const payload = buildPayload();
      let cid = id;
      if (isEdit) {
        await api.put(`/contrats/${id}`, payload);
      } else {
        const r = await api.post('/contrats', payload);
        cid = r.data._id;
        setSavedId(cid);
      }
      setDownloading(true);
      const r2 = await api.get(`/contrats/${cid}/pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([r2.data], { type: 'application/pdf' }));
      const a = Object.assign(document.createElement('a'), { href: url, download: `contrat.pdf` });
      document.body.appendChild(a); a.click();
      URL.revokeObjectURL(url); document.body.removeChild(a);
      navigate('/contrats');
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la génération.');
    } finally { setSaving(false); setDownloading(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-[#A11010]/20 border-t-[#A11010] rounded-full animate-spin" />
    </div>
  );

  const factureSelectee = factures.find(f => f._id === factureId);

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto pb-10">

      {/* En-tête */}
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-[#A11010]/10 rounded-xl flex items-center justify-center flex-shrink-0">
            <FileSignature size={17} className="text-[#A11010]" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-800">
              {isEdit ? 'Modifier le Contrat' : 'Nouveau Contrat'}
            </h1>
            <p className="text-slate-400 text-xs mt-0.5">Contrat de services professionnel</p>
          </div>
        </div>
        <button onClick={handleSave} disabled={saving}
          className="flex-shrink-0 flex items-center gap-1.5 bg-[#A11010] hover:bg-[#8a0d0d] text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-lg shadow-[#A11010]/25 disabled:opacity-50">
          <Save size={15} />
          <span className="hidden sm:inline">{saving ? 'Sauvegarde...' : 'Enregistrer'}</span>
        </button>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2.5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium">
          <AlertCircle size={15} />{error}
        </div>
      )}

      {/* ── 1. Source ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 md:p-5 mb-4">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Source du contrat</h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <label className={`flex items-center gap-3 flex-1 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${source === 'scratch' ? 'border-[#A11010] bg-[#A11010]/5' : 'border-slate-200 hover:border-slate-300'}`}>
            <input type="radio" name="source" value="scratch" checked={source === 'scratch'} onChange={() => setSource('scratch')} className="accent-[#A11010]" />
            <div>
              <div className="font-semibold text-sm text-slate-800">Créer de zéro</div>
              <div className="text-xs text-slate-500">Saisir toutes les informations manuellement</div>
            </div>
          </label>
          <label className={`flex items-center gap-3 flex-1 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${source === 'fromFacture' ? 'border-[#A11010] bg-[#A11010]/5' : 'border-slate-200 hover:border-slate-300'}`}>
            <input type="radio" name="source" value="fromFacture" checked={source === 'fromFacture'} onChange={() => setSource('fromFacture')} className="accent-[#A11010]" />
            <div>
              <div className="font-semibold text-sm text-slate-800">Générer depuis une facture</div>
              <div className="text-xs text-slate-500">Les données client et articles sont importés</div>
            </div>
          </label>
        </div>

        {source === 'fromFacture' && (
          <div className="mt-3">
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Sélectionner une facture</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <select
                  value={factureId}
                  onChange={e => setFactureId(e.target.value)}
                  className={`${inputCls} appearance-none pr-9`}
                >
                  <option value="">— Choisir une facture —</option>
                  {factures.map(f => (
                    <option key={f._id} value={f._id}>
                      {f.numero} — {f.client?.nom || 'Client inconnu'} — {parseFloat(f.total || 0).toLocaleString('fr-CA', { minimumFractionDigits: 2 })} $
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
              {factureId && (
                <button
                  type="button"
                  onClick={() => loadFromFacture(factureId)}
                  className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl text-xs font-semibold transition-colors"
                  title="Recharger les données de la facture"
                >
                  <RefreshCw size={13} /> Recharger
                </button>
              )}
            </div>
            {factureSelectee && (
              <div className="mt-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700 flex items-center gap-2">
                <CheckIcon /> Facture <b>{factureSelectee.numero}</b> sélectionnée — client et articles pré-remplis
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── 2. Dates ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 md:p-5 mb-4">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Dates</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Date du contrat" required>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Date de début des travaux">
            <input type="date" value={dateDebut} onChange={e => setDateDebut(e.target.value)} className={inputCls} />
          </Field>
        </div>
      </div>

      {/* ── 3. Client ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 md:p-6 mb-4">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Informations client</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { key: 'nom',        label: 'Nom / Entreprise', req: true,  placeholder: 'Nom du client',      type: 'text'  },
            { key: 'email',      label: 'Email',            req: false, placeholder: 'email@exemple.com',  type: 'email' },
            { key: 'adresse',    label: 'Adresse',          req: false, placeholder: '123 rue Principale', type: 'text'  },
            { key: 'telephone',  label: 'Téléphone',        req: false, placeholder: '(514) 000-0000',     type: 'tel'   },
            { key: 'ville',      label: 'Ville',            req: false, placeholder: 'Montréal',           type: 'text'  },
            { key: 'codePostal', label: 'Code postal',      req: false, placeholder: 'H1A 1A1',            type: 'text'  },
          ].map(({ key, label, req, placeholder, type }) => (
            <Field key={key} label={label} required={req}>
              <input
                type={type}
                value={client[key]}
                onChange={e => setClient(p => ({ ...p, [key]: e.target.value }))}
                placeholder={placeholder}
                className={inputCls}
              />
            </Field>
          ))}
        </div>
      </div>

      {/* ── 4. Objet du contrat ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 mb-4 overflow-hidden">
        <div className="px-4 md:px-5 py-3.5 border-b border-slate-100 bg-slate-50/60">
          <h2 className="text-sm font-semibold text-slate-700">Objet du contrat / Description des travaux</h2>
          <p className="text-xs text-slate-400 mt-0.5">Phrase d'introduction + liste des travaux à réaliser</p>
        </div>
        <div className="p-4 md:p-5 space-y-4">

          {/* Phrase accroche */}
          <Field label="Phrase d'accroche">
            <input
              type="text"
              value={phraseAccroche}
              onChange={e => setPhraseAccroche(e.target.value)}
              className={inputCls}
              placeholder="Réalisation des travaux…"
            />
          </Field>

          {/* Items numérotés */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-500">Éléments du contrat <span className="text-slate-400 font-normal">(numérotés automatiquement)</span></label>
              <button
                type="button"
                onClick={addItem}
                className="flex items-center gap-1 text-[#A11010] bg-[#A11010]/10 hover:bg-[#A11010]/20 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              >
                <Plus size={12} /> Ajouter
              </button>
            </div>
            <div className="space-y-2">
              {items.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-6 h-6 flex-shrink-0 flex items-center justify-center text-xs font-bold text-[#A11010] bg-[#A11010]/10 rounded-lg">{i + 1}</span>
                  <input
                    type="text"
                    value={item}
                    onChange={e => updateItem(i, e.target.value)}
                    placeholder={`Élément ${i + 1} (ex: Terrassement et pose d'asphalte...)`}
                    className={`${inputCls} flex-1`}
                  />
                  {items.length > 1 && (
                    <button type="button" onClick={() => removeItem(i)} className="w-8 h-8 flex-shrink-0 flex items-center justify-center text-red-400 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addItem}
              className="mt-2 w-full py-2.5 border-2 border-dashed border-slate-200 hover:border-[#A11010]/40 text-slate-400 hover:text-[#A11010] rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2"
            >
              <Plus size={14} /> Ajouter un élément
            </button>
          </div>

          {/* Zone libre */}
          <Field label="Contenu libre supplémentaire (optionnel)">
            <textarea
              value={contenuLibre}
              onChange={e => setContenuLibre(e.target.value)}
              rows={5}
              placeholder="Ajoutez ici des précisions, clauses particulières, descriptions détaillées...&#10;Ce texte apparaîtra tel quel dans le contrat."
              className={`${inputCls} resize-y min-h-[100px]`}
            />
          </Field>
        </div>
      </div>

      {/* ── 5. Modalités de paiement ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 mb-4 overflow-hidden">
        <div className="px-4 md:px-5 py-3.5 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-700">Modalités de paiement</h2>
            <p className="text-xs text-slate-400 mt-0.5">Ex: 10 000 $ maintenant ; 5 000 $ à 50% ; solde à la fin</p>
          </div>
          <button
            type="button"
            onClick={addModalite}
            className="flex items-center gap-1 text-[#A11010] bg-[#A11010]/10 hover:bg-[#A11010]/20 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
          >
            <Plus size={12} /> Ajouter
          </button>
        </div>
        <div className="p-4 md:p-5 space-y-2.5">
          {modalites.map((m, i) => (
            <div key={i} className="flex items-center gap-2.5">
              <div className="relative w-36 flex-shrink-0">
                <input
                  type="number"
                  value={m.montant}
                  onChange={e => updateModalite(i, 'montant', e.target.value)}
                  placeholder="0"
                  min="0"
                  className={`${inputCls} pr-6 text-right`}
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">$</span>
              </div>
              <input
                type="text"
                value={m.description}
                onChange={e => updateModalite(i, 'description', e.target.value)}
                placeholder="Description (ex: maintenant, à 50% des travaux, à la fin des travaux…)"
                className={`${inputCls} flex-1`}
              />
              {modalites.length > 1 && (
                <button type="button" onClick={() => removeModalite(i)} className="w-8 h-8 flex-shrink-0 flex items-center justify-center text-red-400 hover:bg-red-50 rounded-lg transition-colors">
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          ))}

          {/* Sous-total des modalités */}
          {totalFromModalites > 0 && (
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-xs text-slate-500">Sous-total des modalités</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-700">
                  {totalFromModalites.toLocaleString('fr-CA', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} $
                </span>
                <button type="button" onClick={autoTotal} className="text-xs text-[#A11010] underline hover:no-underline">
                  → reporter comme total
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── 6. Montant total ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 md:p-5 mb-4">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Montant total du contrat</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Montant total ($)">
            <div className="relative">
              <input
                type="number"
                value={total}
                onChange={e => handleTotalChange(e.target.value)}
                placeholder="0"
                min="0"
                className={`${inputCls} text-right pr-6`}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 pointer-events-none">$</span>
            </div>
          </Field>
          <Field label="Montant en lettres">
            <input
              type="text"
              value={totalEnLettres}
              onChange={e => setTotalEnLettres(e.target.value)}
              placeholder="Sera généré automatiquement…"
              className={inputCls}
            />
          </Field>
        </div>
        {total && (
          <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600">
            <span className="font-semibold text-slate-500 uppercase tracking-wide text-[10px] block mb-1">Aperçu clause totale :</span>
            Le montant total pour la réalisation des travaux ci-dessus cités a été arrêté par les deux parties à{' '}
            <span className="font-bold text-[#A11010]">
              {parseFloat(total).toLocaleString('fr-CA', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} $
            </span>{' '}
            ({totalEnLettres || nombreEnLettres(Math.round(parseFloat(total) || 0))} dollars).
          </div>
        )}
      </div>

      {/* ── 7. Notes ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 md:p-5 mb-6">
        <Field label="Notes / Clauses supplémentaires (optionnel)">
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            placeholder="Conditions particulières, remarques..."
            className={`${inputCls} resize-none`}
          />
        </Field>
      </div>

      {/* ── Clause NB (info) ── */}
      <div className="bg-black rounded-2xl p-4 mb-6 text-white text-xs font-semibold uppercase tracking-wide leading-relaxed">
        NB : LE DÉBUT DES TRAVAUX FERA OFFICE DE CONSENTEMENT DES DÉTAILS CI-DESSUS MENTIONNÉS ENTRE LES DEUX PARTIES.
        <div className="mt-2 text-slate-300 font-normal normal-case tracking-normal">
          Les travaux sont garantis deux (2) ans et le bris des blocs de cinquante (50) ans.
        </div>
      </div>

      {/* ── Actions ── */}
      <div className="flex flex-col sm:flex-row justify-end gap-3">
        <button
          onClick={() => navigate('/contrats')}
          className="px-5 py-2.5 rounded-xl font-semibold text-sm border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
        >
          Annuler
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-6 py-2.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-50"
        >
          <Save size={15} />
          {saving ? 'Sauvegarde...' : (isEdit ? 'Enregistrer les modifications' : 'Enregistrer le contrat')}
        </button>
        <button
          onClick={handleSaveAndPDF}
          disabled={saving || downloading}
          className="flex items-center justify-center gap-2 bg-[#A11010] hover:bg-[#8a0d0d] text-white px-6 py-2.5 rounded-xl font-semibold text-sm shadow-lg shadow-[#A11010]/25 transition-all disabled:opacity-50"
        >
          <Download size={15} />
          {saving || downloading ? 'Génération...' : 'Enregistrer & Télécharger PDF'}
        </button>
      </div>
    </div>
  );
}

// Icône check inline
function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
