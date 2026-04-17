import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Package, PlusCircle, Receipt, Building2, LogOut } from 'lucide-react';
import fallbackLogo from '../img/YC.png';
import api from '../api';
import { useAuth } from '../context/AuthContext';

const navLinks = [
  { to: '/factures',     label: 'Mes Factures',     short: 'Factures', icon: Receipt    },
  { to: '/factures/new', label: 'Créer une Facture', short: 'Créer',    icon: PlusCircle },
  { to: '/articles',     label: 'Base Articles',     short: 'Articles', icon: Package    },
  { to: '/mes-infos',    label: 'Mes Infos',         short: 'Infos',    icon: Building2  },
];

export default function Navbar() {
  const { logout, username } = useAuth();
  const navigate             = useNavigate();
  const [logoSrc, setLogoSrc]       = useState(fallbackLogo);
  const [companyName, setCompanyName] = useState('YOUMBI CONCEPT INC');

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const fetchCompany = () => {
    api.get('/company')
      .then(res => {
        if (res.data.logo) setLogoSrc(res.data.logo);
        if (res.data.nom)  setCompanyName(res.data.nom);
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchCompany();
    window.addEventListener('company-updated', fetchCompany);
    return () => window.removeEventListener('company-updated', fetchCompany);
  }, []);

  const parts     = companyName.trim().split(' ');
  const nameLine1 = parts[0] || 'YOUMBI';
  const nameLine2 = parts.slice(1).join(' ') || 'CONCEPT INC';

  return (
    <>
      {/* ── Desktop sidebar ──────────────────────────────────────────── */}
      <aside className="hidden md:flex w-64 bg-[#111111] text-white flex-col shadow-2xl flex-shrink-0">
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
              <div className="text-[#A11010] text-xs font-semibold tracking-widest truncate">{nameLine2}</div>
            </div>
          </div>
          <div className="text-xs text-slate-400 mt-3 font-medium">Gestion de Facturation</div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-3 mt-1">Menu</p>
          {navLinks.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to !== '/factures/new'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-[#A11010] text-white shadow-lg shadow-[#A11010]/30'
                    : 'text-slate-400 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <Icon size={18} strokeWidth={2} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10 space-y-2">
          <div className="text-[11px] text-slate-400 px-1">
            Connecté : <span className="text-white font-semibold">{username}</span>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:bg-white/10 hover:text-white transition-all"
          >
            <LogOut size={16} strokeWidth={2} />
            Déconnexion
          </button>
          <div className="text-[11px] text-slate-600 text-center pt-1">
            v1.0.0 &copy; 2025 Youmbi Concept Inc
          </div>
        </div>
      </aside>

      {/* ── Mobile top bar ────────────────────────────────────────────── */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-50 h-14 bg-[#111111] flex items-center px-4 gap-3 shadow-xl">
        <img
          src={logoSrc}
          alt="Logo"
          className="w-8 h-8 object-contain rounded-lg flex-shrink-0"
          onError={() => setLogoSrc(fallbackLogo)}
        />
        <div className="min-w-0 flex-1">
          <div className="font-extrabold text-white text-sm leading-tight truncate">{nameLine1}</div>
          <div className="text-[#A11010] text-[10px] font-semibold tracking-widest truncate">{nameLine2}</div>
        </div>
        <button
          onClick={handleLogout}
          className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          title="Déconnexion"
        >
          <LogOut size={18} strokeWidth={2} />
        </button>
      </header>

      {/* ── Mobile bottom nav ─────────────────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#111111] border-t border-white/10 flex safe-bottom">
        {navLinks.map(({ to, short, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to !== '/factures/new'}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-[10px] font-semibold transition-colors ${
                isActive ? 'text-[#A11010]' : 'text-slate-500'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                <span>{short}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </>
  );
}
