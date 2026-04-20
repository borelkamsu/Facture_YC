import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileSignature, Plus, Download, Trash2, Pencil,
  Calendar, User, AlertCircle, CheckCircle, Receipt
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

export default function Contrats() {
  const navigate = useNavigate();
  const [contrats, setContrats]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [toast, setToast]           = useState(null);
  const [downloading, setDownloading] = useState(null);

  const showToast = (type, message) => setToast({ type, message });

  const load = async () => {
    try {
      setLoading(true);
      const r = await api.get('/contrats');
      setContrats(r.data);
    } catch { showToast('error', 'Erreur lors du chargement.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handlePDF = async (c) => {
    try {
      setDownloading(c._id);
      const r = await api.get(`/contrats/${c._id}/pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([r.data], { type: 'application/pdf' }));
      const a = Object.assign(document.createElement('a'), {
        href: url, download: `contrat-${c.numero}.pdf`
      });
      document.body.appendChild(a); a.click();
      URL.revokeObjectURL(url); document.body.removeChild(a);
    } catch { showToast('error', 'Erreur lors de la génération du PDF.'); }
    finally { setDownloading(null); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer définitivement ce contrat ?')) return;
    try {
      await api.delete(`/contrats/${id}`);
      showToast('success', 'Contrat supprimé.');
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
            <div className="w-8 h-8 md:w-9 md:h-9 bg-[#A11010]/10 rounded-xl flex items-center justify-center">
              <FileSignature size={16} className="text-[#A11010]" />
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-800">Mes Contrats</h1>
          </div>
          <p className="text-slate-500 text-xs md:text-sm ml-10 md:ml-12">
            {contrats.length > 0
              ? `${contrats.length} contrat${contrats.length > 1 ? 's' : ''}`
              : 'Gérez vos contrats de services'}
          </p>
        </div>
        <button
          onClick={() => navigate('/contrats/new')}
          className="flex items-center gap-1.5 bg-[#A11010] hover:bg-[#8a0d0d] text-white px-3 py-2 md:px-5 md:py-2.5 rounded-xl font-semibold text-xs md:text-sm transition-all shadow-lg shadow-[#A11010]/25"
        >
          <Plus size={15} />
          <span className="hidden sm:inline">Nouveau Contrat</span>
          <span className="sm:hidden">Nouveau</span>
        </button>
      </div>

      {loading ? (
        <div className="p-14 text-center text-slate-400 text-sm bg-white rounded-2xl border border-slate-200">
          <div className="w-7 h-7 border-2 border-[#A11010]/20 border-t-[#A11010] rounded-full animate-spin mx-auto mb-3" />
          Chargement...
        </div>
      ) : contrats.length === 0 ? (
        <div className="p-16 text-center bg-white rounded-2xl border border-slate-200">
          <div className="w-16 h-16 bg-[#A11010]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FileSignature size={28} className="text-[#A11010]/40" />
          </div>
          <p className="text-slate-500 font-semibold mb-1">Aucun contrat</p>
          <p className="text-slate-400 text-sm mb-6">
            Créez un contrat ou générez-en un depuis une facture.
          </p>
          <button
            onClick={() => navigate('/contrats/new')}
            className="inline-flex items-center gap-2 bg-[#A11010] text-white px-5 py-2.5 rounded-xl font-semibold text-sm shadow-lg shadow-[#A11010]/25"
          >
            <Plus size={16} /> Créer un contrat
          </button>
        </div>
      ) : (
        <>
          {/* ── Table desktop ── */}
          <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {['N° Contrat', 'Date', 'Client', 'Réf. Facture', 'Montant Total', 'Actions'].map((h, i) => (
                    <th key={h} className={`text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3.5 ${i >= 4 ? 'text-right' : 'text-left'}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {contrats.map((c, idx) => (
                  <tr key={c._id} className={`hover:bg-slate-50/80 transition-colors ${idx < contrats.length - 1 ? 'border-b border-slate-50' : ''}`}>
                    <td className="px-5 py-4">
                      <span className="font-bold text-[#A11010] text-sm">{c.numero}</span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5 text-sm text-slate-600">
                        <Calendar size={13} className="text-slate-400" />
                        {fmtDate(c.date)}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5">
                        <User size={13} className="text-slate-400" />
                        <div>
                          <div className="text-sm font-semibold text-slate-700">{c.client?.nom || '—'}</div>
                          {c.client?.ville && <div className="text-xs text-slate-400">{c.client.ville}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      {c.factureNumero
                        ? <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg bg-slate-100 text-xs font-semibold text-slate-600">{c.factureNumero}</span>
                        : <span className="text-slate-400 text-xs">—</span>
                      }
                    </td>
                    <td className="px-5 py-4 text-right font-bold text-slate-800 text-sm">
                      {c.total > 0 ? `${fmtMoney(c.total)} $` : '—'}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => navigate(`/recus/new?contratId=${c._id}`)}
                          className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                          title="Créer un reçu depuis ce contrat"
                        >
                          <Receipt size={12} /> Reçu
                        </button>
                        <button
                          onClick={() => navigate(`/contrats/${c._id}/edit`)}
                          className="inline-flex items-center gap-1 text-slate-600 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                        >
                          <Pencil size={12} /> Modifier
                        </button>
                        <button
                          onClick={() => handlePDF(c)}
                          disabled={downloading === c._id}
                          className="inline-flex items-center gap-1 text-[#A11010] bg-[#A11010]/10 hover:bg-[#A11010]/20 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                        >
                          <Download size={12} />
                          {downloading === c._id
                            ? <span className="flex items-center gap-1"><span className="w-3 h-3 border border-[#A11010] border-t-transparent rounded-full animate-spin" />PDF...</span>
                            : 'PDF'
                          }
                        </button>
                        <button
                          onClick={() => handleDelete(c._id)}
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
              <span className="text-slate-500">{contrats.length} contrat{contrats.length > 1 ? 's' : ''}</span>
              <span className="font-semibold text-slate-600">
                Total : <span className="text-[#A11010]">{fmtMoney(contrats.reduce((s, c) => s + (c.total || 0), 0))} $</span>
              </span>
            </div>
          </div>

          {/* ── Cartes mobile ── */}
          <div className="md:hidden space-y-3">
            {contrats.map(c => (
              <div key={c._id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-4 py-3 flex items-center justify-between border-b border-slate-100">
                  <span className="font-bold text-[#A11010] text-sm">{c.numero}</span>
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <Calendar size={11} />{fmtDate(c.date)}
                  </span>
                </div>
                <div className="px-4 py-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <User size={13} className="text-slate-400" />
                    <span className="font-semibold text-slate-700 text-sm">{c.client?.nom || '—'}</span>
                  </div>
                  {c.factureNumero && (
                    <div className="text-xs text-slate-500 mb-1">Réf. facture : <b>{c.factureNumero}</b></div>
                  )}
                  {c.total > 0 && (
                    <div className="text-sm font-bold text-slate-800">{fmtMoney(c.total)} $</div>
                  )}
                </div>
                <div className="px-3 pb-3 grid grid-cols-4 gap-1.5">
                  <button
                    onClick={() => navigate(`/recus/new?contratId=${c._id}`)}
                    className="flex items-center justify-center gap-1 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 py-2 rounded-xl text-xs font-semibold transition-colors"
                  >
                    <Receipt size={12} /> Reçu
                  </button>
                  <button
                    onClick={() => navigate(`/contrats/${c._id}/edit`)}
                    className="flex items-center justify-center gap-1 text-slate-600 bg-slate-100 hover:bg-slate-200 py-2 rounded-xl text-xs font-semibold transition-colors"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => handlePDF(c)}
                    disabled={downloading === c._id}
                    className="flex items-center justify-center gap-1 text-[#A11010] bg-[#A11010]/10 hover:bg-[#A11010]/20 py-2 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
                  >
                    <Download size={13} />
                  </button>
                  <button
                    onClick={() => handleDelete(c._id)}
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
