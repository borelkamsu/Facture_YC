import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ClipboardCheck, Save, AlertCircle, Download, ChevronDown, RefreshCw
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

const inputCls = "w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/60 transition-all bg-white";

export default function CreateRecu() {
  const navigate       = useNavigate();
  const { id }         = useParams();
  const [searchParams] = useSearchParams();
  const isEdit         = Boolean(id);

  // Source
  const [source, setSource]   = useState('scratch');
  const [contrats, setContrats] = useState([]);
  const [contratId, setContratId] = useState(searchParams.get('contratId') || '');

  // Champs
  const [date, setDate]         = useState(new Date().toISOString().split('T')[0]);
  const [client, setClient]     = useState({ nom: '', adresse: '', ville: '', codePostal: '', telephone: '', email: '' });
  const [montantRecu, setMontantRecu]             = useState('');
  const [montantRecuEnLettres, setMontantRecuEnLettres] = useState('');
  const [resteAPayer, setResteAPayer]             = useState('');
  const [resteAPayerEnLettres, setResteAPayerEnLettres] = useState('');
  const [dateEcheance, setDateEcheance]           = useState('');
  const [descriptionTravaux, setDescriptionTravaux] = useState("travaux d'aménagement paysager");
  const [contenuLibre, setContenuLibre]           = useState('');
  const [notes, setNotes]       = useState('');
  const [totalContrat, setTotalContrat] = useState(0); // pour auto-calcul

  const [loading, setLoading]   = useState(isEdit);
  const [saving, setSaving]     = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError]       = useState('');

  // ── Chargement initial ──────────────────────────────────────────────────────
  useEffect(() => {
    api.get('/contrats').then(r => setContrats(r.data)).catch(() => {});

    if (isEdit) {
      api.get(`/recus/${id}`)
        .then(r => {
          const rec = r.data;
          setDate(rec.date ? rec.date.split('T')[0] : new Date().toISOString().split('T')[0]);
          setClient({ nom: rec.client?.nom || '', adresse: rec.client?.adresse || '', ville: rec.client?.ville || '', codePostal: rec.client?.codePostal || '', telephone: rec.client?.telephone || '', email: rec.client?.email || '' });
          setMontantRecu(rec.montantRecu ? String(rec.montantRecu) : '');
          setMontantRecuEnLettres(rec.montantRecuEnLettres || '');
          setResteAPayer(rec.resteAPayer ? String(rec.resteAPayer) : '');
          setResteAPayerEnLettres(rec.resteAPayerEnLettres || '');
          setDateEcheance(rec.dateEcheance ? rec.dateEcheance.split('T')[0] : '');
          setDescriptionTravaux(rec.descriptionTravaux || "travaux d'aménagement paysager");
          setContenuLibre(rec.contenuLibre || '');
          setNotes(rec.notes || '');
          if (rec.contratId) { setContratId(rec.contratId); setSource('fromContrat'); }
        })
        .catch(() => setError('Impossible de charger le reçu.'))
        .finally(() => setLoading(false));
    }
  }, [id, isEdit]);

  useEffect(() => {
    if (contratId && !isEdit) setSource('fromContrat');
  }, [contratId, isEdit]);

  // ── Chargement depuis contrat ────────────────────────────────────────────────
  const loadFromContrat = useCallback(async (cid) => {
    if (!cid) return;
    try {
      const r = await api.get(`/contrats/${cid}`);
      const c = r.data;
      setClient({ nom: c.client?.nom || '', adresse: c.client?.adresse || '', ville: c.client?.ville || '', codePostal: c.client?.codePostal || '', telephone: c.client?.telephone || '', email: c.client?.email || '' });
      // Description = première ligne ou phrase accroche
      const desc = (c.items && c.items.length > 0)
        ? c.phraseAccroche || "travaux d'aménagement paysager"
        : "travaux d'aménagement paysager";
      setDescriptionTravaux(desc);
      setTotalContrat(c.total || 0);
      // Pré-remplir montantRecu avec le total
      if (c.total > 0) {
        setResteAPayer('');
        setResteAPayerEnLettres('');
      }
    } catch { setError('Impossible de charger le contrat sélectionné.'); }
  }, []);

  useEffect(() => {
    if (source === 'fromContrat' && contratId && !isEdit) {
      loadFromContrat(contratId);
    }
  }, [contratId, source, isEdit, loadFromContrat]);

  // ── Auto-calcul du reste à payer ─────────────────────────────────────────────
  const handleMontantChange = (val) => {
    setMontantRecu(val);
    const n = parseFloat(val) || 0;
    setMontantRecuEnLettres(n > 0 ? nombreEnLettres(Math.round(n)) : '');
    // Auto-calcul reste si totalContrat connu
    if (totalContrat > 0) {
      const reste = Math.max(0, Math.round(totalContrat - n));
      setResteAPayer(reste > 0 ? String(reste) : '0');
      setResteAPayerEnLettres(reste > 0 ? nombreEnLettres(reste) : '');
    }
  };

  const handleResteChange = (val) => {
    setResteAPayer(val);
    const n = parseFloat(val) || 0;
    setResteAPayerEnLettres(n > 0 ? nombreEnLettres(Math.round(n)) : 'zéro');
  };

  // ── Aperçu du contenu ────────────────────────────────────────────────────────
  const fmtM = v => parseFloat(v || 0).toLocaleString('fr-CA', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  const contratSelectionne = contrats.find(c => c._id === contratId);

  const apercu = () => {
    if (!montantRecu) return '';
    const letMontant = montantRecuEnLettres || nombreEnLettres(Math.round(parseFloat(montantRecu) || 0));
    const desc = descriptionTravaux || "travaux d'aménagement paysager";
    let txt = `Nous confirmons avoir reçu une somme de ${fmtM(montantRecu)} $ (${letMontant} dollars) de votre part, représentant l'avance de notre contrat pour les ${desc}.`;
    if (parseFloat(resteAPayer) > 0) {
      const letReste = resteAPayerEnLettres || nombreEnLettres(Math.round(parseFloat(resteAPayer) || 0));
      txt += `\n\nReste à payer : ${fmtM(resteAPayer)} $ (${letReste} dollars)${dateEcheance ? ` au ${new Date(dateEcheance).toLocaleDateString('fr-CA', { year: 'numeric', month: 'long', day: 'numeric' })}` : ''}.`;
    }
    return txt;
  };

  // ── Sauvegarde ───────────────────────────────────────────────────────────────
  const buildPayload = () => ({
    date,
    contratId:   source === 'fromContrat' ? contratId || null : null,
    contratNumero: source === 'fromContrat'
      ? (contratSelectionne?.numero || '')
      : '',
    client,
    montantRecu:          parseFloat(montantRecu) || 0,
    montantRecuEnLettres: montantRecuEnLettres || nombreEnLettres(Math.round(parseFloat(montantRecu) || 0)),
    resteAPayer:          parseFloat(resteAPayer) || 0,
    resteAPayerEnLettres: resteAPayerEnLettres || (parseFloat(resteAPayer) > 0 ? nombreEnLettres(Math.round(parseFloat(resteAPayer))) : 'zéro'),
    dateEcheance: dateEcheance || null,
    descriptionTravaux,
    contenuLibre,
    notes
  });

  const handleSave = async () => {
    setError('');
    if (!client.nom.trim()) return setError('Le nom du client est requis.');
    if (!montantRecu || parseFloat(montantRecu) <= 0) return setError('Le montant reçu doit être supérieur à 0.');
    try {
      setSaving(true);
      const payload = buildPayload();
      if (isEdit) await api.put(`/recus/${id}`, payload);
      else        await api.post('/recus', payload);
      navigate('/recus');
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la sauvegarde.');
    } finally { setSaving(false); }
  };

  const handleSaveAndPDF = async () => {
    setError('');
    if (!client.nom.trim()) return setError('Le nom du client est requis.');
    if (!montantRecu || parseFloat(montantRecu) <= 0) return setError('Le montant reçu doit être supérieur à 0.');
    try {
      setSaving(true);
      const payload = buildPayload();
      let rid = id;
      if (isEdit) {
        await api.put(`/recus/${id}`, payload);
      } else {
        const r = await api.post('/recus', payload);
        rid = r.data._id;
      }
      setDownloading(true);
      const r2 = await api.get(`/recus/${rid}/pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([r2.data], { type: 'application/pdf' }));
      const a = Object.assign(document.createElement('a'), { href: url, download: `recu.pdf` });
      document.body.appendChild(a); a.click();
      URL.revokeObjectURL(url); document.body.removeChild(a);
      navigate('/recus');
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la génération.');
    } finally { setSaving(false); setDownloading(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-emerald-200 border-t-emerald-500 rounded-full animate-spin" />
    </div>
  );

  const apercuText = apercu();

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto pb-10">

      {/* En-tête */}
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-emerald-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
            <ClipboardCheck size={17} className="text-emerald-600" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-800">
              {isEdit ? 'Modifier le Reçu' : 'Nouveau Reçu'}
            </h1>
            <p className="text-slate-400 text-xs mt-0.5">Reçu de paiement professionnel</p>
          </div>
        </div>
        <button onClick={handleSave} disabled={saving}
          className="flex-shrink-0 flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-lg shadow-emerald-500/25 disabled:opacity-50">
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
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Source du reçu</h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <label className={`flex items-center gap-3 flex-1 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${source === 'scratch' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-slate-300'}`}>
            <input type="radio" name="source" value="scratch" checked={source === 'scratch'} onChange={() => setSource('scratch')} className="accent-emerald-600" />
            <div>
              <div className="font-semibold text-sm text-slate-800">Créer de zéro</div>
              <div className="text-xs text-slate-500">Saisir toutes les informations manuellement</div>
            </div>
          </label>
          <label className={`flex items-center gap-3 flex-1 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${source === 'fromContrat' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-slate-300'}`}>
            <input type="radio" name="source" value="fromContrat" checked={source === 'fromContrat'} onChange={() => setSource('fromContrat')} className="accent-emerald-600" />
            <div>
              <div className="font-semibold text-sm text-slate-800">Depuis un contrat</div>
              <div className="text-xs text-slate-500">Client et description importés du contrat</div>
            </div>
          </label>
        </div>

        {source === 'fromContrat' && (
          <div className="mt-3">
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Sélectionner un contrat</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <select
                  value={contratId}
                  onChange={e => setContratId(e.target.value)}
                  className={`${inputCls} appearance-none pr-9`}
                >
                  <option value="">— Choisir un contrat —</option>
                  {contrats.map(c => (
                    <option key={c._id} value={c._id}>
                      {c.numero} — {c.client?.nom || 'Client inconnu'} — {parseFloat(c.total || 0).toLocaleString('fr-CA', { minimumFractionDigits: 0 })} $
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
              {contratId && (
                <button
                  type="button"
                  onClick={() => loadFromContrat(contratId)}
                  className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl text-xs font-semibold transition-colors"
                  title="Recharger les données du contrat"
                >
                  <RefreshCw size={13} /> Recharger
                </button>
              )}
            </div>
            {contratSelectionne && (
              <div className="mt-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700 flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                Contrat <b>{contratSelectionne.numero}</b> — Total : <b>{parseFloat(contratSelectionne.total || 0).toLocaleString('fr-CA', { minimumFractionDigits: 0 })} $</b>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── 2. Date ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 md:p-5 mb-4">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Date du reçu</h2>
        <div className="w-full sm:w-64">
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputCls} />
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

      {/* ── 4. Montants ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 md:p-5 mb-4">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Montants</h2>
        {totalContrat > 0 && (
          <div className="mb-3 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600">
            Total du contrat : <b className="text-[#640000]">{parseFloat(totalContrat).toLocaleString('fr-CA', { minimumFractionDigits: 0 })} $</b>
            {' '}— Le reste à payer sera calculé automatiquement.
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Montant reçu ($)" required>
            <div className="relative">
              <input
                type="number"
                value={montantRecu}
                onChange={e => handleMontantChange(e.target.value)}
                placeholder="0"
                min="0"
                className={`${inputCls} text-right pr-6`}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 pointer-events-none">$</span>
            </div>
          </Field>
          <Field label="Montant reçu en lettres">
            <input
              type="text"
              value={montantRecuEnLettres}
              onChange={e => setMontantRecuEnLettres(e.target.value)}
              placeholder="Généré automatiquement..."
              className={inputCls}
            />
          </Field>
          <Field label="Reste à payer ($)">
            <div className="relative">
              <input
                type="number"
                value={resteAPayer}
                onChange={e => handleResteChange(e.target.value)}
                placeholder="0"
                min="0"
                className={`${inputCls} text-right pr-6`}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 pointer-events-none">$</span>
            </div>
          </Field>
          <Field label="Reste à payer en lettres">
            <input
              type="text"
              value={resteAPayerEnLettres}
              onChange={e => setResteAPayerEnLettres(e.target.value)}
              placeholder="Généré automatiquement..."
              className={inputCls}
            />
          </Field>
          <Field label="Date d'échéance du solde">
            <input
              type="date"
              value={dateEcheance}
              onChange={e => setDateEcheance(e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Description des travaux">
            <input
              type="text"
              value={descriptionTravaux}
              onChange={e => setDescriptionTravaux(e.target.value)}
              placeholder="travaux d'aménagement paysager"
              className={inputCls}
            />
          </Field>
        </div>
      </div>

      {/* ── 5. Aperçu du reçu ── */}
      {apercuText && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 md:p-5 mb-4">
          <p className="text-xs font-bold text-emerald-700 uppercase tracking-wide mb-2">Aperçu du contenu du reçu</p>
          <div className="bg-white rounded-xl p-4 border border-emerald-100 text-sm text-slate-700 leading-relaxed whitespace-pre-line font-serif">
            {apercuText}
          </div>
        </div>
      )}

      {/* ── 6. Contenu libre ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 md:p-5 mb-4">
        <Field label="Contenu libre / Texte additionnel (optionnel)">
          <textarea
            value={contenuLibre}
            onChange={e => setContenuLibre(e.target.value)}
            rows={5}
            placeholder="Ajoutez ici du texte libre qui apparaîtra dans le reçu...&#10;Ex: précisions sur le mode de paiement, conditions particulières..."
            className={`${inputCls} resize-y min-h-[100px]`}
          />
        </Field>
      </div>

      {/* ── 7. Notes ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 md:p-5 mb-6">
        <Field label="Notes (optionnel)">
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            placeholder="Notes internes, remarques..."
            className={`${inputCls} resize-none`}
          />
        </Field>
      </div>

      {/* ── Actions ── */}
      <div className="flex flex-col sm:flex-row justify-end gap-3">
        <button
          onClick={() => navigate('/recus')}
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
          {saving ? 'Sauvegarde...' : (isEdit ? 'Enregistrer les modifications' : 'Enregistrer le reçu')}
        </button>
        <button
          onClick={handleSaveAndPDF}
          disabled={saving || downloading}
          className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-semibold text-sm shadow-lg shadow-emerald-500/25 transition-all disabled:opacity-50"
        >
          <Download size={15} />
          {saving || downloading ? 'Génération...' : 'Enregistrer & Télécharger PDF'}
        </button>
      </div>
    </div>
  );
}
