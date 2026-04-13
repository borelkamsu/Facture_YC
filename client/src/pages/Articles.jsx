import { useState, useEffect } from 'react';
import { Package, Plus, Pencil, Trash2, Check, X, Search, AlertCircle, CheckCircle } from 'lucide-react';
import api from '../api';

function Toast({ type, message, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl text-sm font-medium border animate-in slide-in-from-top-2 duration-300 ${
      type === 'error'
        ? 'bg-red-50 text-red-700 border-red-200'
        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
    }`}>
      {type === 'error' ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
      {message}
    </div>
  );
}

const emptyForm = { reference: '', description: '', prixUnitaire: '' };

export default function Articles() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const showToast = (type, message) => setToast({ type, message });

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.get('/articles');
      setArticles(res.data);
    } catch {
      showToast('error', 'Erreur lors du chargement.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.reference.trim() || !form.description.trim() || !form.prixUnitaire) {
      return showToast('error', 'Tous les champs sont obligatoires.');
    }
    try {
      setSubmitting(true);
      await api.post('/articles', { ...form, prixUnitaire: parseFloat(form.prixUnitaire) });
      setForm(emptyForm);
      showToast('success', 'Article ajouté avec succès !');
      load();
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Erreur lors de l\'ajout.');
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (a) => {
    setEditId(a._id);
    setEditForm({ reference: a.reference, description: a.description, prixUnitaire: a.prixUnitaire });
  };

  const saveEdit = async (id) => {
    try {
      await api.put(`/articles/${id}`, { ...editForm, prixUnitaire: parseFloat(editForm.prixUnitaire) });
      showToast('success', 'Article modifié !');
      setEditId(null);
      load();
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Erreur lors de la modification.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer cet article ?')) return;
    try {
      await api.delete(`/articles/${id}`);
      showToast('success', 'Article supprimé.');
      load();
    } catch {
      showToast('error', 'Erreur lors de la suppression.');
    }
  };

  const filtered = articles.filter(a =>
    a.reference.toLowerCase().includes(search.toLowerCase()) ||
    a.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}

      <div className="mb-7">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center">
            <Package size={18} className="text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Base Articles</h1>
        </div>
        <p className="text-slate-500 text-sm ml-12">Gérez votre catalogue d'articles et de services.</p>
      </div>

      {/* Formulaire d'ajout */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
        <h2 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
          <Plus size={15} className="text-blue-600" />
          Ajouter un article
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-4">
            <div className="md:col-span-3">
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Référence *</label>
              <input
                type="text"
                placeholder="ex: ART-001"
                value={form.reference}
                onChange={e => setForm(p => ({ ...p, reference: e.target.value.toUpperCase() }))}
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
              />
            </div>
            <div className="md:col-span-6">
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Description *</label>
              <input
                type="text"
                placeholder="Description de l'article ou du service"
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
              />
            </div>
            <div className="md:col-span-3">
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Prix unitaire ($) *</label>
              <input
                type="number"
                placeholder="0.00"
                min="0"
                step="0.01"
                value={form.prixUnitaire}
                onChange={e => setForm(p => ({ ...p, prixUnitaire: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all text-right"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-md shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus size={16} />
              {submitting ? 'Ajout en cours...' : 'Ajouter l\'article'}
            </button>
          </div>
        </form>
      </div>

      {/* Tableau des articles */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">
            Articles enregistrés
            <span className="ml-2 bg-slate-100 text-slate-500 text-xs font-medium px-2 py-0.5 rounded-full">
              {filtered.length}
            </span>
          </h2>
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 w-44 transition-all"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-14 text-center text-slate-400 text-sm">
            <div className="w-7 h-7 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-3"></div>
            Chargement des articles...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center">
            <Package size={44} className="mx-auto mb-3 text-slate-200" />
            <p className="text-slate-400 font-medium text-sm">
              {search ? 'Aucun article ne correspond à la recherche.' : 'Aucun article pour le moment.'}
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Référence</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Description</th>
                <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Prix unitaire</th>
                <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((article, idx) => (
                <tr key={article._id} className={`border-b border-slate-50 hover:bg-slate-50/80 transition-colors ${idx === filtered.length - 1 ? 'border-0' : ''}`}>
                  {editId === article._id ? (
                    <>
                      <td className="px-4 py-2.5">
                        <input
                          value={editForm.reference}
                          onChange={e => setEditForm(p => ({ ...p, reference: e.target.value.toUpperCase() }))}
                          className="border border-blue-300 bg-blue-50 rounded-lg px-3 py-1.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-400"
                        />
                      </td>
                      <td className="px-4 py-2.5">
                        <input
                          value={editForm.description}
                          onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))}
                          className="border border-blue-300 bg-blue-50 rounded-lg px-3 py-1.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-400"
                        />
                      </td>
                      <td className="px-4 py-2.5">
                        <input
                          type="number"
                          value={editForm.prixUnitaire}
                          onChange={e => setEditForm(p => ({ ...p, prixUnitaire: e.target.value }))}
                          min="0"
                          step="0.01"
                          className="border border-blue-300 bg-blue-50 rounded-lg px-3 py-1.5 text-sm w-full text-right focus:outline-none focus:ring-2 focus:ring-blue-400"
                        />
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <button onClick={() => saveEdit(article._id)} className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors mr-1.5">
                          <Check size={13} /> Sauvegarder
                        </button>
                        <button onClick={() => setEditId(null)} className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors">
                          <X size={13} /> Annuler
                        </button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                          {article.reference}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-slate-700">{article.description}</td>
                      <td className="px-5 py-3.5 text-sm font-semibold text-slate-800 text-right">
                        {parseFloat(article.prixUnitaire).toFixed(2)} $
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => startEdit(article)}
                          title="Modifier"
                          className="inline-flex items-center justify-center w-8 h-8 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors mr-1"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(article._id)}
                          title="Supprimer"
                          className="inline-flex items-center justify-center w-8 h-8 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
