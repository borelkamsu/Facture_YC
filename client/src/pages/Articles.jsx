import { useState, useEffect } from 'react';
import { Package, Plus, Pencil, Trash2, Check, X, Search, AlertCircle, CheckCircle } from 'lucide-react';
import api from '../api';

function Toast({ type, message, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`fixed top-16 md:top-5 right-3 md:right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium border max-w-xs ${
      type === 'error' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
    }`}>
      {type === 'error' ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
      {message}
    </div>
  );
}

const emptyForm = { reference: '', description: '', prixUnitaire: '' };

export default function Articles() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [form, setForm]         = useState(emptyForm);
  const [editId, setEditId]     = useState(null);
  const [editForm, setEditForm] = useState({});
  const [toast, setToast]       = useState(null);
  const [search, setSearch]     = useState('');
  const [submitting, setSubmitting] = useState(false);

  const showToast = (type, message) => setToast({ type, message });

  const load = async () => {
    try { setLoading(true); const r = await api.get('/articles'); setArticles(r.data); }
    catch { showToast('error', 'Erreur lors du chargement.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.reference.trim() || !form.description.trim() || !form.prixUnitaire)
      return showToast('error', 'Tous les champs sont obligatoires.');
    try {
      setSubmitting(true);
      await api.post('/articles', { ...form, prixUnitaire: parseFloat(form.prixUnitaire) });
      setForm(emptyForm);
      showToast('success', 'Article ajouté !');
      load();
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Erreur lors de l\'ajout.');
    } finally { setSubmitting(false); }
  };

  const saveEdit = async (id) => {
    try {
      await api.put(`/articles/${id}`, { ...editForm, prixUnitaire: parseFloat(editForm.prixUnitaire) });
      showToast('success', 'Article modifié !');
      setEditId(null);
      load();
    } catch (err) { showToast('error', err.response?.data?.message || 'Erreur.'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer cet article ?')) return;
    try { await api.delete(`/articles/${id}`); showToast('success', 'Article supprimé.'); load(); }
    catch { showToast('error', 'Erreur lors de la suppression.'); }
  };

  const filtered = articles.filter(a =>
    a.reference.toLowerCase().includes(search.toLowerCase()) ||
    a.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}

      <div className="mb-5">
        <div className="flex items-center gap-2.5 mb-0.5">
          <div className="w-8 h-8 md:w-9 md:h-9 bg-blue-100 rounded-xl flex items-center justify-center">
            <Package size={16} className="text-blue-600" />
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-800">Base Articles</h1>
        </div>
        <p className="text-slate-500 text-xs md:text-sm ml-10 md:ml-12">Gérez votre catalogue d'articles.</p>
      </div>

      {/* Formulaire d'ajout */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 md:p-6 mb-5">
        <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
          <Plus size={14} className="text-blue-600" /> Ajouter un article
        </h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Référence *</label>
              <input type="text" placeholder="ex: ART-001" value={form.reference}
                onChange={e => setForm(p => ({ ...p, reference: e.target.value.toUpperCase() }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Prix unitaire ($) *</label>
              <input type="number" placeholder="0.00" min="0" step="0.01" value={form.prixUnitaire}
                onChange={e => setForm(p => ({ ...p, prixUnitaire: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all text-right" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Description *</label>
            <input type="text" placeholder="Description de l'article ou du service" value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all" />
          </div>
          <div className="flex justify-end">
            <button type="submit" disabled={submitting}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-md shadow-blue-500/20 disabled:opacity-50">
              <Plus size={15} />{submitting ? 'Ajout...' : 'Ajouter l\'article'}
            </button>
          </div>
        </form>
      </div>

      {/* Barre de recherche */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-slate-700 whitespace-nowrap">
            Articles <span className="bg-slate-100 text-slate-500 text-xs font-medium px-2 py-0.5 rounded-full">{filtered.length}</span>
          </h2>
          <div className="relative flex-1 max-w-xs">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400" />
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            <div className="w-6 h-6 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-2" />Chargement...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Package size={40} className="mx-auto mb-2 text-slate-200" />
            <p className="text-slate-400 text-sm">{search ? 'Aucun résultat.' : 'Aucun article.'}</p>
          </div>
        ) : (
          <>
            {/* ── Table desktop ── */}
            <table className="hidden md:table w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Référence</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Description</th>
                  <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Prix unitaire</th>
                  <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a, idx) => (
                  <tr key={a._id} className={`hover:bg-slate-50/80 transition-colors ${idx < filtered.length - 1 ? 'border-b border-slate-50' : ''}`}>
                    {editId === a._id ? (
                      <>
                        <td className="px-4 py-2.5"><input value={editForm.reference} onChange={e => setEditForm(p => ({ ...p, reference: e.target.value.toUpperCase() }))} className="border border-blue-300 bg-blue-50 rounded-lg px-2 py-1.5 text-sm w-full focus:outline-none" /></td>
                        <td className="px-4 py-2.5"><input value={editForm.description} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} className="border border-blue-300 bg-blue-50 rounded-lg px-2 py-1.5 text-sm w-full focus:outline-none" /></td>
                        <td className="px-4 py-2.5"><input type="number" value={editForm.prixUnitaire} onChange={e => setEditForm(p => ({ ...p, prixUnitaire: e.target.value }))} min="0" step="0.01" className="border border-blue-300 bg-blue-50 rounded-lg px-2 py-1.5 text-sm w-full text-right focus:outline-none" /></td>
                        <td className="px-4 py-2.5 text-right">
                          <button onClick={() => saveEdit(a._id)} className="inline-flex items-center gap-1 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg text-xs font-semibold mr-1.5"><Check size={13} />Sauvegarder</button>
                          <button onClick={() => setEditId(null)} className="inline-flex items-center gap-1 text-slate-500 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold"><X size={13} />Annuler</button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-5 py-3.5"><span className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">{a.reference}</span></td>
                        <td className="px-5 py-3.5 text-sm text-slate-700">{a.description}</td>
                        <td className="px-5 py-3.5 text-sm font-semibold text-slate-800 text-right">{parseFloat(a.prixUnitaire).toFixed(2)} $</td>
                        <td className="px-5 py-3.5 text-right">
                          <button onClick={() => { setEditId(a._id); setEditForm({ reference: a.reference, description: a.description, prixUnitaire: a.prixUnitaire }); }} className="w-8 h-8 inline-flex items-center justify-center text-blue-500 hover:bg-blue-50 rounded-lg transition-colors mr-1"><Pencil size={14} /></button>
                          <button onClick={() => handleDelete(a._id)} className="w-8 h-8 inline-flex items-center justify-center text-red-400 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={14} /></button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>

            {/* ── Cartes mobile ── */}
            <div className="md:hidden divide-y divide-slate-100">
              {filtered.map(a => (
                <div key={a._id} className="px-4 py-3">
                  {editId === a._id ? (
                    <div className="space-y-2">
                      <input value={editForm.reference} onChange={e => setEditForm(p => ({ ...p, reference: e.target.value.toUpperCase() }))}
                        className="w-full border border-blue-300 bg-blue-50 rounded-lg px-3 py-2 text-sm focus:outline-none" placeholder="Référence" />
                      <input value={editForm.description} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))}
                        className="w-full border border-blue-300 bg-blue-50 rounded-lg px-3 py-2 text-sm focus:outline-none" placeholder="Description" />
                      <input type="number" value={editForm.prixUnitaire} onChange={e => setEditForm(p => ({ ...p, prixUnitaire: e.target.value }))}
                        className="w-full border border-blue-300 bg-blue-50 rounded-lg px-3 py-2 text-sm text-right focus:outline-none" placeholder="Prix unitaire" />
                      <div className="flex gap-2">
                        <button onClick={() => saveEdit(a._id)} className="flex-1 flex items-center justify-center gap-1 text-emerald-600 bg-emerald-50 py-2 rounded-xl text-xs font-semibold"><Check size={13} />Sauvegarder</button>
                        <button onClick={() => setEditId(null)} className="flex-1 flex items-center justify-center gap-1 text-slate-500 bg-slate-100 py-2 rounded-xl text-xs font-semibold"><X size={13} />Annuler</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full">{a.reference}</span>
                          <span className="font-semibold text-slate-800 text-sm">{parseFloat(a.prixUnitaire).toFixed(2)} $</span>
                        </div>
                        <p className="text-sm text-slate-600 truncate">{a.description}</p>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <button onClick={() => { setEditId(a._id); setEditForm({ reference: a.reference, description: a.description, prixUnitaire: a.prixUnitaire }); }}
                          className="w-8 h-8 flex items-center justify-center text-blue-500 bg-blue-50 rounded-lg"><Pencil size={14} /></button>
                        <button onClick={() => handleDelete(a._id)}
                          className="w-8 h-8 flex items-center justify-center text-red-400 bg-red-50 rounded-lg"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
