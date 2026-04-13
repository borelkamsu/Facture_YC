import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Trash2, FileText, ChevronDown, Save, AlertCircle } from 'lucide-react';
import api from '../api';

const TPS_RATE = 0.05;
const TVQ_RATE = 0.09975;

const emptyLigne = () => ({
  reference: '',
  description: '',
  prixUnitaire: '',
  quantite: 1,
  montant: 0,
});

// ── Combobox de recherche d'article ───────────────────────────────────────────
function ArticleCombobox({ value, articles, onSelect, onManualChange }) {
  const [query, setQuery] = useState(value || '');
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => { setQuery(value || ''); }, [value]);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = articles.filter(a =>
    a.reference.toLowerCase().includes(query.toLowerCase()) ||
    a.description.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 8);

  const handleChange = (e) => {
    const val = e.target.value.toUpperCase();
    setQuery(val);
    onManualChange(val);
    setOpen(true);
  };

  const handleSelect = (article) => {
    setQuery(article.reference);
    onSelect(article);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => setOpen(true)}
          placeholder="Référence..."
          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 pr-7 bg-white transition-all"
        />
        <ChevronDown
          size={13}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
        />
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute z-50 top-full left-0 mt-1 w-72 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden">
          {filtered.map(a => (
            <button
              key={a._id}
              type="button"
              onMouseDown={() => handleSelect(a)}
              className="w-full text-left px-3.5 py-2.5 hover:bg-blue-50 transition-colors border-b border-slate-50 last:border-0 group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-700 group-hover:text-blue-800">
                  {a.reference}
                </span>
                <span className="text-xs font-semibold text-slate-500">
                  {parseFloat(a.prixUnitaire).toFixed(2)} $
                </span>
              </div>
              <div className="text-xs text-slate-500 truncate mt-0.5">{a.description}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Page principale ────────────────────────────────────────────────────────────
export default function CreateFacture() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(isEdit);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [numeroFacture, setNumeroFacture] = useState('');
  const [client, setClient] = useState({
    nom: '', adresse: '', ville: '', codePostal: '', telephone: '', email: ''
  });
  const [lignes, setLignes] = useState([emptyLigne()]);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Chargement des articles et de la facture existante si édition
  useEffect(() => {
    api.get('/articles').then(res => setArticles(res.data)).catch(() => {});

    if (isEdit) {
      api.get(`/factures/${id}`)
        .then(res => {
          const f = res.data;
          setDate(f.date ? f.date.split('T')[0] : new Date().toISOString().split('T')[0]);
          setNumeroFacture(f.numero || '');
          setClient({
            nom: f.client?.nom || '',
            adresse: f.client?.adresse || '',
            ville: f.client?.ville || '',
            codePostal: f.client?.codePostal || '',
            telephone: f.client?.telephone || '',
            email: f.client?.email || '',
          });
          setLignes(
            f.lignes?.length
              ? f.lignes.map(l => ({
                  reference: l.reference || '',
                  description: l.description || '',
                  prixUnitaire: l.prixUnitaire ?? '',
                  quantite: l.quantite ?? 1,
                  montant: l.montant ?? 0,
                }))
              : [emptyLigne()]
          );
          setNotes(f.notes || '');
        })
        .catch(() => setError('Impossible de charger la facture.'))
        .finally(() => setLoading(false));
    }
  }, [id, isEdit]);

  const totals = useCallback(() => {
    const soustotal = lignes.reduce((sum, l) => sum + (parseFloat(l.montant) || 0), 0);
    const tps = soustotal * TPS_RATE;
    const tvq = soustotal * TVQ_RATE;
    return { soustotal, tps, tvq, total: soustotal + tps + tvq };
  }, [lignes])();

  const updateLigne = (index, field, value) => {
    setLignes(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      const pu = parseFloat(updated[index].prixUnitaire) || 0;
      const qty = parseFloat(updated[index].quantite) || 0;
      updated[index].montant = parseFloat((pu * qty).toFixed(2));
      return updated;
    });
  };

  const selectArticle = (index, article) => {
    setLignes(prev => {
      const updated = [...prev];
      const qty = parseFloat(updated[index].quantite) || 1;
      updated[index] = {
        ...updated[index],
        reference: article.reference,
        description: article.description,
        prixUnitaire: article.prixUnitaire,
        quantite: qty,
        montant: parseFloat((article.prixUnitaire * qty).toFixed(2)),
      };
      return updated;
    });
  };

  const addLigne = () => setLignes(prev => [...prev, emptyLigne()]);
  const removeLigne = (i) => setLignes(prev => prev.filter((_, idx) => idx !== i));

  const handleSave = async () => {
    setError('');
    if (!client.nom.trim()) return setError('Le nom du client est requis.');
    const lignesValides = lignes.filter(l => l.description || l.reference);
    if (lignesValides.length === 0) return setError('Ajoutez au moins un article.');

    try {
      setSaving(true);
      const payload = { date, client, notes, lignes: lignesValides, ...totals };

      if (isEdit) {
        await api.put(`/factures/${id}`, payload);
      } else {
        await api.post('/factures', payload);
      }
      navigate('/factures');
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la sauvegarde.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto pb-12">
      {/* En-tête */}
      <div className="mb-7 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center">
              <FileText size={18} className="text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">
                {isEdit ? 'Modifier la Facture' : 'Créer une Facture'}
              </h1>
              {isEdit && numeroFacture && (
                <p className="text-blue-600 text-sm font-semibold">N° {numeroFacture}</p>
              )}
            </div>
          </div>
          <p className="text-slate-500 text-sm ml-12">
            {isEdit
              ? 'Modifiez les informations de cette facture.'
              : 'Remplissez les informations pour générer votre facture.'}
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white px-6 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-lg shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save size={16} />
          {saving ? 'Sauvegarde...' : (isEdit ? 'Enregistrer les modifications' : 'Enregistrer')}
        </button>
      </div>

      {error && (
        <div className="mb-5 flex items-center gap-2.5 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Date */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 mb-4">
        <div className="flex items-center gap-6">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Date de la facture</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Informations client */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-4">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">Informations client</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { key: 'nom', label: 'Nom / Entreprise *', placeholder: 'Nom du client', type: 'text' },
            { key: 'email', label: 'Email', placeholder: 'email@exemple.com', type: 'email' },
            { key: 'adresse', label: 'Adresse', placeholder: '123 rue Principale', type: 'text' },
            { key: 'telephone', label: 'Téléphone', placeholder: '(514) 000-0000', type: 'tel' },
            { key: 'ville', label: 'Ville', placeholder: 'Montréal', type: 'text' },
            { key: 'codePostal', label: 'Code postal', placeholder: 'H1A 1A1', type: 'text' },
          ].map(({ key, label, placeholder, type }) => (
            <div key={key}>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">{label}</label>
              <input
                type={type}
                value={client[key]}
                onChange={e => setClient(p => ({ ...p, [key]: e.target.value }))}
                placeholder={placeholder}
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Articles / lignes */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 mb-4 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <h2 className="text-sm font-semibold text-slate-700">Articles / Services</h2>
          <button
            type="button"
            onClick={addLigne}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-xl text-xs font-semibold transition-all"
          >
            <Plus size={14} />
            Ajouter un article
          </button>
        </div>

        {/* En-têtes colonnes */}
        <div
          className="hidden md:grid px-5 py-2.5 bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider gap-3"
          style={{ gridTemplateColumns: '170px 1fr 115px 75px 100px 36px' }}
        >
          <div>Référence</div>
          <div>Description</div>
          <div>Prix unitaire</div>
          <div className="text-center">Quantité</div>
          <div className="text-right">Montant</div>
          <div></div>
        </div>

        {/* Lignes */}
        <div className="p-4 space-y-2.5">
          {lignes.map((ligne, i) => (
            <div
              key={i}
              className="grid gap-3 items-center p-3.5 bg-slate-50 rounded-xl border border-slate-100 hover:border-blue-100 transition-colors"
              style={{ gridTemplateColumns: '170px 1fr 115px 75px 100px 36px' }}
            >
              <ArticleCombobox
                value={ligne.reference}
                articles={articles}
                onSelect={(a) => selectArticle(i, a)}
                onManualChange={(v) => updateLigne(i, 'reference', v)}
              />

              <input
                type="text"
                value={ligne.description}
                onChange={e => updateLigne(i, 'description', e.target.value)}
                placeholder="Description..."
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-white transition-all"
              />

              <div className="relative">
                <input
                  type="number"
                  value={ligne.prixUnitaire}
                  onChange={e => updateLigne(i, 'prixUnitaire', e.target.value)}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-white text-right transition-all pr-5"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">$</span>
              </div>

              <input
                type="number"
                value={ligne.quantite}
                onChange={e => updateLigne(i, 'quantite', e.target.value)}
                min="1"
                step="1"
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-white text-center transition-all"
              />

              <div className="text-right font-semibold text-slate-700 text-sm pr-1">
                {(parseFloat(ligne.montant) || 0).toFixed(2)} $
              </div>

              <div className="flex justify-center">
                {lignes.length > 1 ? (
                  <button
                    onClick={() => removeLigne(i)}
                    className="w-8 h-8 flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                ) : (
                  <div className="w-8" />
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Bouton bas de tableau */}
        <div className="px-5 pb-4">
          <button
            type="button"
            onClick={addLigne}
            className="w-full py-2.5 border-2 border-dashed border-slate-200 hover:border-blue-300 text-slate-400 hover:text-blue-500 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2"
          >
            <Plus size={15} />
            Ajouter une ligne
          </button>
        </div>
      </div>

      {/* Notes */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 mb-4">
        <label className="block text-xs font-semibold text-slate-500 mb-1.5">Notes (optionnel)</label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={3}
          placeholder="Informations supplémentaires, conditions de paiement..."
          className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all resize-none"
        />
      </div>

      {/* Totaux */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
        <div className="flex justify-end">
          <div className="w-80">
            <div className="space-y-2 mb-3">
              <div className="flex justify-between text-sm text-slate-600 py-1">
                <span>Montant total hors taxe</span>
                <span className="font-semibold text-slate-800">{totals.soustotal.toFixed(2)} $</span>
              </div>
              <div className="flex justify-between text-sm text-slate-500 py-1 border-t border-slate-100 pt-2">
                <span>TPS (5 %)</span>
                <span className="font-medium">{totals.tps.toFixed(2)} $</span>
              </div>
              <div className="flex justify-between text-sm text-slate-500 py-1">
                <span>TVQ (9,975 %)</span>
                <span className="font-medium">{totals.tvq.toFixed(2)} $</span>
              </div>
            </div>
            <div className="bg-blue-600 rounded-xl px-5 py-3.5 flex justify-between items-center">
              <span className="text-white font-bold text-sm">Montant Total TTC</span>
              <span className="text-white font-extrabold text-lg">{totals.total.toFixed(2)} $</span>
            </div>
          </div>
        </div>
      </div>

      {/* Boutons d'action */}
      <div className="flex justify-end gap-3">
        <button
          onClick={() => navigate('/factures')}
          className="px-6 py-2.5 rounded-xl font-semibold text-sm border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
        >
          Annuler
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white px-8 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-lg shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save size={16} />
          {saving
            ? 'Sauvegarde en cours...'
            : (isEdit ? 'Enregistrer les modifications' : 'Enregistrer la facture')}
        </button>
      </div>
    </div>
  );
}
