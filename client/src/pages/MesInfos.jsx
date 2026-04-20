import { useState, useEffect, useRef } from 'react';
import { Building2, Upload, Save, CheckCircle, AlertCircle, X } from 'lucide-react';
import api from '../api';

function resizeImage(file, maxSize = 400) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = Math.round(height * maxSize / width);
            width = maxSize;
          } else {
            width = Math.round(width * maxSize / height);
            height = maxSize;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/png', 0.92));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function Toast({ type, message, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);

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

const FIELDS = [
  {
    section: 'Identité',
    fields: [
      { key: 'nom', label: 'Nom de l\'entreprise', placeholder: 'YOUMBI CONCEPT INC', full: true },
      { key: 'tagline', label: 'Slogan / Tagline', placeholder: 'Solutions professionnelles', full: true },
    ]
  },
  {
    section: 'Adresse',
    fields: [
      { key: 'adresse', label: 'Adresse', placeholder: '1173 rue Léon Provancher', full: true },
      { key: 'ville', label: 'Ville', placeholder: 'Lévis' },
      { key: 'province', label: 'Province', placeholder: 'QC' },
      { key: 'codePostal', label: 'Code postal', placeholder: 'G7A 0H6' },
    ]
  },
  {
    section: 'Contact',
    fields: [
      { key: 'telephone', label: 'Téléphone', placeholder: '+1 581 928-4374' },
      { key: 'email', label: 'Courriel', placeholder: 'youmbiconcepting@gmail.com', type: 'email' },
    ]
  },
  {
    section: 'Certifications',
    fields: [
      { key: 'rbq', label: 'Numéro R.B.Q.', placeholder: '58-50-0893' },
      { key: 'apchq', label: 'Numéro A.P.C.H.Q.', placeholder: '208827' },
    ]
  },
];

export default function MesInfos() {
  const [form, setForm] = useState({
    nom: '', tagline: '', adresse: '', ville: '', province: '',
    codePostal: '', telephone: '', email: '', rbq: '', apchq: '', logo: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef(null);

  const showToast = (type, message) => setToast({ type, message });

  useEffect(() => {
    api.get('/company')
      .then(res => setForm(f => ({ ...f, ...res.data })))
      .catch(() => showToast('error', 'Erreur lors du chargement.'))
      .finally(() => setLoading(false));
  }, []);

  const handleLogoFile = async (file) => {
    if (!file || !file.type.startsWith('image/')) {
      return showToast('error', 'Veuillez sélectionner une image valide.');
    }
    if (file.size > 5 * 1024 * 1024) {
      return showToast('error', 'L\'image ne doit pas dépasser 5 Mo.');
    }
    const base64 = await resizeImage(file);
    setForm(f => ({ ...f, logo: base64 }));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleLogoFile(file);
  };

  const handleSave = async () => {
    if (!form.nom.trim()) return showToast('error', 'Le nom de l\'entreprise est requis.');
    try {
      setSaving(true);
      const res = await api.put('/company', form);
      setForm(f => ({ ...f, ...res.data }));
      showToast('success', 'Informations sauvegardées !');
      // Déclenche un événement pour que la navbar se rafraîchisse
      window.dispatchEvent(new Event('company-updated'));
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Erreur lors de la sauvegarde.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[#640000]/30 border-t-[#640000] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto pb-12">
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}

      {/* En-tête */}
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5 mb-0.5">
            <div className="w-8 h-8 md:w-9 md:h-9 bg-rose-100 rounded-xl flex items-center justify-center">
              <Building2 size={16} className="text-[#640000]" />
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-800">Mes Infos</h1>
          </div>
          <p className="text-slate-500 text-xs md:text-sm ml-10 md:ml-12">Informations de votre entreprise utilisées sur les factures.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-[#640000] hover:bg-[#8a0d0d] active:scale-95 text-white px-3 py-2 md:px-6 md:py-2.5 rounded-xl font-semibold text-xs md:text-sm transition-all shadow-lg shadow-[#640000]/25 disabled:opacity-50 flex-shrink-0"
        >
          <Save size={15} />
          <span className="hidden sm:inline">{saving ? 'Sauvegarde...' : 'Enregistrer'}</span>
          <span className="sm:hidden">{saving ? '...' : 'Sauver'}</span>
        </button>
      </div>

      {/* Logo */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 md:p-6 mb-4">
        <h2 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
          <Upload size={15} className="text-[#640000]" />
          Logo de l'entreprise
        </h2>
        <div className="flex flex-col sm:flex-row items-center gap-4">
          {/* Prévisualisation */}
          <div className="relative flex-shrink-0">
            {form.logo ? (
              <div className="relative group">
                <img
                  src={form.logo}
                  alt="Logo"
                  className="w-20 h-20 md:w-24 md:h-24 object-contain rounded-2xl border-2 border-slate-200 bg-slate-50 p-2"
                />
                <button
                  onClick={() => setForm(f => ({ ...f, logo: '' }))}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center text-slate-400">
                <Building2 size={22} className="mb-1 opacity-40" />
                <span className="text-[10px]">Aucun logo</span>
              </div>
            )}
          </div>

          {/* Zone de dépôt */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className={`flex-1 w-full border-2 border-dashed rounded-2xl p-4 md:p-6 text-center cursor-pointer transition-all ${
              dragOver
                ? 'border-[#640000] bg-rose-50'
                : 'border-slate-200 hover:border-[#640000]/50 hover:bg-rose-50/30'
            }`}
          >
            <Upload size={20} className="mx-auto mb-2 text-slate-400" />
            <p className="text-sm font-medium text-slate-600">
              <span className="hidden sm:inline">Glissez votre logo ici ou </span>
              <span className="text-[#640000] font-semibold">Appuyez pour choisir</span>
            </p>
            <p className="text-xs text-slate-400 mt-1">PNG, JPG, SVG — max 5 Mo</p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => { if (e.target.files[0]) handleLogoFile(e.target.files[0]); e.target.value = ''; }}
          />
        </div>
      </div>

      {/* Sections de formulaire */}
      {FIELDS.map(({ section, fields }) => (
        <div key={section} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 md:p-6 mb-4">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">{section}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {fields.map(({ key, label, placeholder, type = 'text', full }) => (
              <div key={key} className={full ? 'md:col-span-2' : ''}>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">{label}</label>
                <input
                  type={type}
                  value={form[key] || ''}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#640000]/20 focus:border-[#640000]/60 transition-all"
                />
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Aperçu facture */}
      <div className="bg-gradient-to-br from-rose-50 to-white rounded-2xl border border-rose-100 p-4 md:p-5 mb-6">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
          Aperçu — En-tête de facture
        </p>
        <div className="flex items-start gap-4">
          {form.logo
            ? <img src={form.logo} alt="Logo" className="w-14 h-14 object-contain rounded-xl border border-slate-200 bg-white p-1" />
            : <div className="w-14 h-14 bg-[#640000] rounded-xl flex items-center justify-center text-white font-bold text-lg">{(form.nom || 'YC').substring(0, 2)}</div>
          }
          <div>
            <div className="font-extrabold text-[#640000] text-lg">{form.nom || 'Nom de l\'entreprise'}</div>
            {form.tagline && <div className="text-slate-500 text-xs mt-0.5">{form.tagline}</div>}
            <div className="text-slate-500 text-xs mt-1 leading-relaxed">
              {[form.adresse, [form.ville, form.province, form.codePostal].filter(Boolean).join(' ')].filter(Boolean).join(' • ')}
              {form.telephone && <> • {form.telephone}</>}
              {form.email && <> • {form.email}</>}
            </div>
            <div className="flex gap-2 mt-1.5">
              {form.rbq && (
                <span className="text-[10px] bg-rose-100 text-[#640000] px-2 py-0.5 rounded-full font-semibold">
                  R.B.Q. {form.rbq}
                </span>
              )}
              {form.apchq && (
                <span className="text-[10px] bg-rose-100 text-[#640000] px-2 py-0.5 rounded-full font-semibold">
                  A.P.C.H.Q. {form.apchq}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bouton bas de page */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#640000] hover:bg-[#8a0d0d] active:scale-95 text-white px-8 py-3 rounded-xl font-semibold text-sm transition-all shadow-lg shadow-[#640000]/25 disabled:opacity-50"
        >
          <Save size={16} />
          {saving ? 'Sauvegarde en cours...' : 'Enregistrer les modifications'}
        </button>
      </div>
    </div>
  );
}
