import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Receipt, Plus, Download, Trash2, Pencil,
  Calendar, User, AlertCircle, CheckCircle, FileText
} from 'lucide-react';
import api from '../api';

function Toast({ type, message, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl text-sm font-medium border ${
      type === 'error'
        ? 'bg-red-50 text-red-700 border-red-200'
        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
    }`}>
      {type === 'error' ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
      {message}
    </div>
  );
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('fr-CA', {
    year: 'numeric', month: 'long', day: 'numeric'
  });
}

function formatMontant(val) {
  return parseFloat(val || 0).toLocaleString('fr-CA', {
    minimumFractionDigits: 2, maximumFractionDigits: 2
  });
}

export default function Factures() {
  const navigate = useNavigate();
  const [factures, setFactures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [downloading, setDownloading] = useState(null);

  const showToast = (type, message) => setToast({ type, message });

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.get('/factures');
      setFactures(res.data);
    } catch {
      showToast('error', 'Erreur lors du chargement des factures.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleDownloadPDF = async (facture) => {
    try {
      setDownloading(facture._id);
      const res = await api.get(`/factures/${facture._id}/pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `facture-${facture.numero}.pdf`;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      showToast('error', 'Erreur lors de la génération du PDF.');
    } finally {
      setDownloading(null);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer définitivement cette facture ?')) return;
    try {
      await api.delete(`/factures/${id}`);
      showToast('success', 'Facture supprimée.');
      load();
    } catch {
      showToast('error', 'Erreur lors de la suppression.');
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}

      {/* En-tête */}
      <div className="mb-7 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center">
              <Receipt size={18} className="text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800">Mes Factures</h1>
          </div>
          <p className="text-slate-500 text-sm ml-12">
            {factures.length > 0
              ? `${factures.length} facture${factures.length > 1 ? 's' : ''} enregistrée${factures.length > 1 ? 's' : ''}`
              : 'Historique de toutes vos factures'}
          </p>
        </div>
        <button
          onClick={() => navigate('/factures/new')}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-lg shadow-blue-500/25"
        >
          <Plus size={16} />
          Nouvelle Facture
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-14 text-center text-slate-400 text-sm">
            <div className="w-7 h-7 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-3"></div>
            Chargement des factures...
          </div>
        ) : factures.length === 0 ? (
          <div className="p-20 text-center">
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <FileText size={28} className="text-blue-300" />
            </div>
            <p className="text-slate-500 font-semibold text-base mb-1">Aucune facture pour le moment</p>
            <p className="text-slate-400 text-sm mb-6">Créez votre première facture en quelques clics.</p>
            <button
              onClick={() => navigate('/factures/new')}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-lg shadow-blue-500/25"
            >
              <Plus size={16} />
              Créer la première facture
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3.5">N° Facture</th>
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3.5">Date</th>
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3.5">Client</th>
                    <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3.5">Sous-total HT</th>
                    <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3.5">Total TTC</th>
                    <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3.5">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {factures.map((facture, idx) => (
                    <tr
                      key={facture._id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        idx < factures.length - 1 ? 'border-b border-slate-50' : ''
                      }`}
                    >
                      <td className="px-5 py-4">
                        <span className="font-bold text-blue-700 text-sm">{facture.numero}</span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5 text-sm text-slate-600">
                          <Calendar size={13} className="text-slate-400 flex-shrink-0" />
                          {formatDate(facture.date)}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5">
                          <User size={13} className="text-slate-400 flex-shrink-0" />
                          <div>
                            <div className="text-sm font-semibold text-slate-700">
                              {facture.client?.nom || '—'}
                            </div>
                            {facture.client?.ville && (
                              <div className="text-xs text-slate-400">{facture.client.ville}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <span className="text-sm text-slate-500">{formatMontant(facture.soustotal)} $</span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <span className="font-bold text-slate-800 text-sm">{formatMontant(facture.total)} $</span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Modifier */}
                          <button
                            onClick={() => navigate(`/factures/${facture._id}/edit`)}
                            title="Modifier"
                            className="inline-flex items-center gap-1.5 text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                          >
                            <Pencil size={12} />
                            Modifier
                          </button>

                          {/* Télécharger PDF */}
                          <button
                            onClick={() => handleDownloadPDF(facture)}
                            disabled={downloading === facture._id}
                            title="Télécharger le PDF"
                            className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Download size={12} />
                            {downloading === facture._id ? (
                              <span className="flex items-center gap-1">
                                <span className="w-3 h-3 border border-blue-400 border-t-transparent rounded-full animate-spin" />
                                PDF...
                              </span>
                            ) : 'PDF'}
                          </button>

                          {/* Supprimer */}
                          <button
                            onClick={() => handleDelete(facture._id)}
                            title="Supprimer"
                            className="w-7 h-7 flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Récapitulatif */}
            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                {factures.length} facture{factures.length > 1 ? 's' : ''}
              </span>
              <span className="text-xs font-semibold text-slate-600">
                Total général TTC :{' '}
                <span className="text-blue-700">
                  {formatMontant(factures.reduce((s, f) => s + (f.total || 0), 0))} $
                </span>
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
