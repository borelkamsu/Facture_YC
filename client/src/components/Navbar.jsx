import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { Package, PlusCircle, Receipt, Building2 } from 'lucide-react';
import fallbackLogo from '../img/YC.png';
import api from '../api';

const navLinks = [
  { to: '/factures', label: 'Mes Factures', icon: Receipt },
  { to: '/factures/new', label: 'Créer une Facture', icon: PlusCircle },
  { to: '/articles', label: 'Base Articles', icon: Package },
  { to: '/mes-infos', label: 'Mes Infos', icon: Building2 },
];

export default function Navbar() {
  const [logoSrc, setLogoSrc] = useState(fallbackLogo);
  const [companyName, setCompanyName] = useState('YOUMBI');

  const fetchCompany = () => {
    api.get('/company')
      .then(res => {
        if (res.data.logo) setLogoSrc(res.data.logo);
        if (res.data.nom) setCompanyName(res.data.nom);
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchCompany();
    window.addEventListener('company-updated', fetchCompany);
    return () => window.removeEventListener('company-updated', fetchCompany);
  }, []);

  const parts = companyName.trim().split(' ');
  const nameLine1 = parts[0] || 'YOUMBI';
  const nameLine2 = parts.slice(1).join(' ') || 'CONCEPT';

  return (
    <aside className="w-64 bg-[#0f2444] text-white flex flex-col shadow-2xl flex-shrink-0">
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <img
            src={logoSrc}
            alt="Logo"
            className="w-12 h-12 object-contain rounded-xl flex-shrink-0"
            onError={() => setLogoSrc(fallbackLogo)}
          />
          <div className="min-w-0">
            <div className="font-extrabold text-base tracking-wide truncate">{nameLine1}</div>
            <div className="text-[#cb4154] text-xs font-semibold tracking-widest truncate">{nameLine2}</div>
          </div>
        </div>
        <div className="text-xs text-slate-400 mt-3 font-medium">Gestion de Facturation</div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-3 mt-1">
          Menu
        </p>
        {navLinks.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to !== '/factures/new'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-[#cb4154] text-white shadow-lg shadow-[#cb4154]/30'
                  : 'text-slate-400 hover:bg-white/8 hover:text-white'
              }`
            }
          >
            <Icon size={18} strokeWidth={2} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-white/10 text-[11px] text-slate-500 text-center">
        v1.0.0 &copy; 2025 Youmbi Concept
      </div>
    </aside>
  );
}
