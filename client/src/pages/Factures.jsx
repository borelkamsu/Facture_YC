import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Receipt, Plus, Download, Trash2, Pencil,
  Calendar, User, AlertCircle, CheckCircle, FileText, FileSignature
} from 'lucide-react';
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

const fmtDate  = d => new Date(d).toLocaleDateString('fr-CA', { year: 'numeric', month: 'short', day: 'numeric' });
const fmtMoney = v => parseFloat(v || 0).toLocaleString('fr-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function Factures() {
  const navigate = useNavigate();
  const [factures, setFactures]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [toast, setToast]           = useState(null);
  const [downloading, setDownloading] = useState(null);

  const showToast = (type, message) => setToast({ type, message });

  const load = async () => {
    try { setLoading(true); const r = await api.get('/factures'); setFactures(r.data); }
    catch { showToast('error', 'Erreur lors du chargement.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handlePDF = async (f) => {
    try {
      setDownloading(f._id);
      const r = await api.get(`/factures/${f._id}/pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([r.data], { type: 'application/pdf' }));
      const a = Object.assign(document.createElement('a'), { href: url, download: `facture-${f.numero}.pdf` });
      document.body.appendChild(a); a.click(); URL.revokeObjectURL(url); document.body.removeChild(a);
    } catch { showToast('error', 'Erreur lors de la génération du PDF.'); }
    finally { setDownloading(null); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer définitivement cette facture ?')) return;
    try { await api.delete(`/factures/${id}`); showToast('success', 'Facture supprimée.'); load(); }
    catch { showToast('error', 'Erreur lors de la suppression.'); }
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}

      {/* En-tête */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2.5 mb-0.5">
            <div className="w-8 h-8 md:w-9 md:h-9 bg-[#A11010]/10 rounded-xl flex items-center justify-center">
              <Receipt size={16} className="text-[#A11010]" />
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-800">Mes Factures</h1>
          </div>
          <p className="text-slate-500 text-xs md:text-sm ml-10 md:ml-12">
            {factures.length > 0 ? `${factures.length} facture${factures.length > 1 ? 's' : ''}` : 'Historique de vos factures'}
          </p>
        </div>
        <button
          onClick={() => navigate('/factures/new')}
          className="flex items-center gap-1.5 bg-[#A11010] hover:bg-[#8a0d0d] text-white px-3 py-2 md:px-5 md:py-2.5 rounded-xl font-semibold text-xs md:text-sm transition-all shadow-lg shadow-[#A11010]/25"
        >
          <Plus size={15} />
          <span className="hidden sm:inline">Nouvelle Facture</span>
          <span className="sm:hidden">Nouveau</span>
        </button>
      </div>

      {loading ? (
        <div className="p-14 text-center text-slate-400 text-sm bg-white rounded-2xl border border-slate-200">
          <div className="w-7 h-7 border-2 border-[#A11010]/20 border-t-[#A11010] rounded-full animate-spin mx-auto mb-3" />
          Chargement...
        </div>
      ) : factures.length === 0 ? (
        <div className="p-16 text-center bg-white rounded-2xl border border-slate-200">
          <div className="w-16 h-16 bg-[#A11010]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FileText size={28} className="text-[#A11010]/40" />
          </div>
          <p className="text-slate-500 font-semibold mb-1">Aucune facture</p>
          <p className="text-slate-400 text-sm mb-6">Créez votre première facture.</p>
          <button onClick={() => navigate('/factures/new')} className="inline-flex items-center gap-2 bg-[#A11010] text-white px-5 py-2.5 rounded-xl font-semibold text-sm shadow-lg shadow-[#A11010]/25">
            <Plus size={16} /> Créer une facture
          </button>
        </div>
      ) : (
        <>
          {/* ── Table desktop ── */}
          <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {['N° Facture','Date','Client','Sous-total HT','Total TTC','Actions'].map((h, i) => (
                    <th key={h} className={`text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3.5 ${i >= 3 ? 'text-right' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {factures.map((f, idx) => (
                  <tr key={f._id} className={`hover:bg-slate-50/80 transition-colors ${idx < factures.length - 1 ? 'border-b border-slate-50' : ''}`}>
                    <td className="px-5 py-4">
                      <span className="font-bold text-[#A11010] text-sm">{f.numero}</span>
                      {f.nom && <div className="text-xs text-slate-500 mt-0.5">{f.nom}</div>}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5 text-sm text-slate-600">
                        <Calendar size={13} className="text-slate-400" />{fmtDate(f.date)}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5">
                        <User size={13} className="text-slate-400" />
                        <div>
                          <div className="text-sm font-semibold text-slate-700">{f.client?.nom || '—'}</div>
                          {f.client?.ville && <div className="text-xs text-slate-400">{f.client.ville}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right text-sm text-slate-500">{fmtMoney(f.soustotal)} $</td>
                    <td className="px-5 py-4 text-right font-bold text-slate-800 text-sm">{fmtMoney(f.total)} $</td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button onClick={() => navigate(`/contrats/new?factureId=${f._id}`)} className="inline-flex items-center gap-1 text-[#A11010] bg-[#A11010]/10 hover:bg-[#A11010]/20 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors" title="Générer un contrat depuis cette facture">
                          <FileSignature size={12} /> Contrat
                        </button>
                        <button onClick={() => navigate(`/factures/${f._id}/edit`)} className="inline-flex items-center gap-1 text-slate-600 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors">
                          <Pencil size={12} /> Modifier
                        </button>
                        <button onClick={() => handlePDF(f)} disabled={downloading === f._id} className="inline-flex items-center gap-1 text-slate-600 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50">
                          <Download size={12} />
                          {downloading === f._id ? <span className="flex items-center gap-1"><span className="w-3 h-3 border border-slate-500 border-t-transparent rounded-full animate-spin" />PDF...</span> : 'PDF'}
                        </button>
                        <button onClick={() => handleDelete(f._id)} className="w-7 h-7 flex items-center justify-center text-red-400 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex justify-between text-xs">
              <span className="text-slate-500">{factures.length} facture{factures.length > 1 ? 's' : ''}</span>
              <span className="font-semibold text-slate-600">Total TTC : <span className="text-[#A11010]">{fmtMoney(factures.reduce((s, f) => s + (f.total || 0), 0))} $</span></span>
            </div>
          </div>

          {/* ── Cartes mobile ── */}
          <div className="md:hidden space-y-3">
            {factures.map(f => (
              <div key={f._id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-4 py-3 flex items-center justify-between border-b border-slate-100">
                  <div>
                    <span className="font-bold text-[#A11010] text-sm">{f.numero}</span>
                    {f.nom && <div className="text-xs text-slate-500 mt-0.5">{f.nom}</div>}
                  </div>
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <Calendar size={11} />{fmtDate(f.date)}
                  </span>
                </div>
                <div className="px-4 py-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <User size={13} className="text-slate-400" />
                    <span className="font-semibold text-slate-700 text-sm">{f.client?.nom || '—'}</span>
                    {f.client?.ville && <span className="text-xs text-slate-400">— {f.client.ville}</span>}
                  </div>
                  <div className="flex gap-4 text-xs text-slate-500">
                    <span>HT : <b className="text-slate-700">{fmtMoney(f.soustotal)} $</b></span>
                    <span>TTC : <b className="text-slate-800 text-sm">{fmtMoney(f.total)} $</b></span>
                  </div>
                </div>
                <div className="px-3 pb-3 grid grid-cols-4 gap-1.5">
                  <button onClick={() => navigate(`/contrats/new?factureId=${f._id}`)} className="flex items-center justify-center gap-1 text-[#A11010] bg-[#A11010]/10 hover:bg-[#A11010]/20 py-2 rounded-xl text-xs font-semibold transition-colors" title="Générer un contrat">
                    <FileSignature size={12} />
                  </button>
                  <button onClick={() => navigate(`/factures/${f._id}/edit`)} className="flex items-center justify-center gap-1.5 text-slate-600 bg-slate-100 hover:bg-slate-200 py-2 rounded-xl text-xs font-semibold transition-colors">
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => handlePDF(f)} disabled={downloading === f._id} className="flex items-center justify-center gap-1.5 text-slate-600 bg-slate-100 hover:bg-slate-200 py-2 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50">
                    <Download size={13} />
                  </button>
                  <button onClick={() => handleDelete(f._id)} className="flex items-center justify-center text-red-400 bg-red-50 hover:bg-red-100 rounded-xl transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
            <div className="text-center text-xs text-slate-500 py-2">
              Total général TTC : <span className="font-bold text-[#A11010]">{fmtMoney(factures.reduce((s, f) => s + (f.total || 0), 0))} $</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
