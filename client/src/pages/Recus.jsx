import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardCheck, Plus, Download, Trash2, Pencil,
  Calendar, User, AlertCircle, CheckCircle, FileSignature
} from 'lucide-react';
import api from '../api';

function Toast({ type, message, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`fixed top-16 md:top-5 right-3 md:right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium border max-w-xs ${
      type === 'error'
        ? 'bg-red-50 text-red-700 border-red-200'
        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
    }`}>
      {type === 'error' ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
      {message}
    </div>
  );
}

const fmtDate  = d => new Date(d).toLocaleDateString('fr-CA', { year: 'numeric', month: 'short', day: 'numeric' });
const fmtMoney = v => parseFloat(v || 0).toLocaleString('fr-CA', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

export default function Recus() {
  const navigate = useNavigate();
  const [recus, setRecus]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [toast, setToast]           = useState(null);
  const [downloading, setDownloading] = useState(null);

  const showToast = (type, message) => setToast({ type, message });

  const load = async () => {
    try {
      setLoading(true);
      const r = await api.get('/recus');
      setRecus(r.data);
    } catch { showToast('error', 'Erreur lors du chargement.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handlePDF = async (r) => {
    try {
      setDownloading(r._id);
      const res = await api.get(`/recus/${r._id}/pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = Object.assign(document.createElement('a'), {
        href: url, download: `recu-${r.numero}.pdf`
      });
      document.body.appendChild(a); a.click();
      URL.revokeObjectURL(url); document.body.removeChild(a);
    } catch { showToast('error', 'Erreur lors de la génération du PDF.'); }
    finally { setDownloading(null); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer définitivement ce reçu ?')) return;
    try {
      await api.delete(`/recus/${id}`);
      showToast('success', 'Reçu supprimé.');
      load();
    } catch { showToast('error', 'Erreur lors de la suppression.'); }
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}

      {/* En-tête */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2.5 mb-0.5">
            <div className="w-8 h-8 md:w-9 md:h-9 bg-emerald-500/10 rounded-xl flex items-center justify-center">
              <ClipboardCheck size={16} className="text-emerald-600" />
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-800">Mes Reçus</h1>
          </div>
          <p className="text-slate-500 text-xs md:text-sm ml-10 md:ml-12">
            {recus.length > 0
              ? `${recus.length} reçu${recus.length > 1 ? 's' : ''}`
              : 'Gérez vos reçus de paiement'}
          </p>
        </div>
        <button
          onClick={() => navigate('/recus/new')}
          className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 md:px-5 md:py-2.5 rounded-xl font-semibold text-xs md:text-sm transition-all shadow-lg shadow-emerald-500/25"
        >
          <Plus size={15} />
          <span className="hidden sm:inline">Nouveau Reçu</span>
          <span className="sm:hidden">Nouveau</span>
        </button>
      </div>

      {loading ? (
        <div className="p-14 text-center text-slate-400 text-sm bg-white rounded-2xl border border-slate-200">
          <div className="w-7 h-7 border-2 border-emerald-200 border-t-emerald-500 rounded-full animate-spin mx-auto mb-3" />
          Chargement...
        </div>
      ) : recus.length === 0 ? (
        <div className="p-16 text-center bg-white rounded-2xl border border-slate-200">
          <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ClipboardCheck size={28} className="text-emerald-500/40" />
          </div>
          <p className="text-slate-500 font-semibold mb-1">Aucun reçu</p>
          <p className="text-slate-400 text-sm mb-6">
            Créez un reçu ou générez-en un depuis un contrat.
          </p>
          <button
            onClick={() => navigate('/recus/new')}
            className="inline-flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-semibold text-sm shadow-lg shadow-emerald-500/25"
          >
            <Plus size={16} /> Créer un reçu
          </button>
        </div>
      ) : (
        <>
          {/* ── Table desktop ── */}
          <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {['N° Reçu', 'Date', 'Client', 'Réf. Contrat', 'Reçu', 'Reste à payer', 'Actions'].map((h, i) => (
                    <th key={h} className={`text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3.5 ${i >= 4 ? 'text-right' : 'text-left'}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recus.map((r, idx) => (
                  <tr key={r._id} className={`hover:bg-slate-50/80 transition-colors ${idx < recus.length - 1 ? 'border-b border-slate-50' : ''}`}>
                    <td className="px-4 py-4">
                      <span className="font-bold text-emerald-700 text-sm">{r.numero}</span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1.5 text-sm text-slate-600">
                        <Calendar size={13} className="text-slate-400" />
                        {fmtDate(r.date)}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1.5">
                        <User size={13} className="text-slate-400" />
                        <div>
                          <div className="text-sm font-semibold text-slate-700">{r.client?.nom || '—'}</div>
                          {r.client?.ville && <div className="text-xs text-slate-400">{r.client.ville}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {r.contratNumero
                        ? <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-[#A11010]/10 text-xs font-semibold text-[#A11010]">
                            <FileSignature size={10} />{r.contratNumero}
                          </span>
                        : <span className="text-slate-400 text-xs">—</span>
                      }
                    </td>
                    <td className="px-4 py-4 text-right font-bold text-emerald-700 text-sm">
                      {r.montantRecu > 0 ? `${fmtMoney(r.montantRecu)} $` : '—'}
                    </td>
                    <td className="px-4 py-4 text-right text-sm">
                      {r.resteAPayer > 0
                        ? <span className="font-semibold text-amber-600">{fmtMoney(r.resteAPayer)} $</span>
                        : <span className="text-emerald-600 font-semibold">Soldé ✓</span>
                      }
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => navigate(`/recus/${r._id}/edit`)}
                          className="inline-flex items-center gap-1 text-slate-600 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                        >
                          <Pencil size={12} /> Modifier
                        </button>
                        <button
                          onClick={() => handlePDF(r)}
                          disabled={downloading === r._id}
                          className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                        >
                          <Download size={12} />
                          {downloading === r._id
                            ? <span className="flex items-center gap-1"><span className="w-3 h-3 border border-emerald-600 border-t-transparent rounded-full animate-spin" />PDF...</span>
                            : 'PDF'
                          }
                        </button>
                        <button
                          onClick={() => handleDelete(r._id)}
                          className="w-7 h-7 flex items-center justify-center text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex justify-between text-xs">
              <span className="text-slate-500">{recus.length} reçu{recus.length > 1 ? 's' : ''}</span>
              <span className="font-semibold text-slate-600">
                Total encaissé : <span className="text-emerald-600">{fmtMoney(recus.reduce((s, r) => s + (r.montantRecu || 0), 0))} $</span>
              </span>
            </div>
          </div>

          {/* ── Cartes mobile ── */}
          <div className="md:hidden space-y-3">
            {recus.map(r => (
              <div key={r._id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-4 py-3 flex items-center justify-between border-b border-slate-100">
                  <span className="font-bold text-emerald-700 text-sm">{r.numero}</span>
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <Calendar size={11} />{fmtDate(r.date)}
                  </span>
                </div>
                <div className="px-4 py-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <User size={13} className="text-slate-400" />
                    <span className="font-semibold text-slate-700 text-sm">{r.client?.nom || '—'}</span>
                  </div>
                  {r.contratNumero && <div className="text-xs text-slate-500 mb-1">Réf. contrat : <b>{r.contratNumero}</b></div>}
                  <div className="flex gap-4 text-xs mt-1">
                    {r.montantRecu > 0 && <span className="text-emerald-700 font-bold">Reçu : {fmtMoney(r.montantRecu)} $</span>}
                    {r.resteAPayer > 0
                      ? <span className="text-amber-600 font-semibold">Reste : {fmtMoney(r.resteAPayer)} $</span>
                      : <span className="text-emerald-600 font-semibold">Soldé ✓</span>
                    }
                  </div>
                </div>
                <div className="px-3 pb-3 grid grid-cols-3 gap-1.5">
                  <button
                    onClick={() => navigate(`/recus/${r._id}/edit`)}
                    className="flex items-center justify-center gap-1 text-slate-600 bg-slate-100 hover:bg-slate-200 py-2 rounded-xl text-xs font-semibold transition-colors"
                  >
                    <Pencil size={12} /> Modifier
                  </button>
                  <button
                    onClick={() => handlePDF(r)}
                    disabled={downloading === r._id}
                    className="flex items-center justify-center gap-1 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 py-2 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
                  >
                    <Download size={13} />
                  </button>
                  <button
                    onClick={() => handleDelete(r._id)}
                    className="flex items-center justify-center text-red-400 bg-red-50 hover:bg-red-100 py-2 rounded-xl transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
