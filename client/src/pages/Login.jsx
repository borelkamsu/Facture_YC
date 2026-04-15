import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logo from '../img/YC.png';

export default function Login() {
  const { login }          = useAuth();
  const navigate           = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      navigate('/factures', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Identifiant ou mot de passe incorrect.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f2444] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Logo & titre */}
        <div className="flex flex-col items-center mb-8">
          <img src={logo} alt="Logo" className="w-20 h-20 object-contain rounded-2xl mb-4 shadow-xl" />
          <h1 className="text-white font-extrabold text-2xl tracking-wide">YOUMBI CONCEPT</h1>
          <p className="text-[#cb4154] text-xs font-semibold tracking-widest mt-1">PAYSAGISTE</p>
          <p className="text-slate-400 text-sm mt-3">Connectez-vous pour accéder à la facturation</p>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6 space-y-4">

          {error && (
            <div className="bg-[#cb4154]/20 border border-[#cb4154]/40 text-[#f87c8b] text-sm rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          <div>
            <label className="text-slate-300 text-sm font-medium block mb-1.5">Identifiant</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Votre identifiant"
              required
              autoFocus
              className="w-full bg-white/10 border border-white/20 text-white placeholder-slate-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#cb4154] focus:ring-1 focus:ring-[#cb4154] transition"
            />
          </div>

          <div>
            <label className="text-slate-300 text-sm font-medium block mb-1.5">Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Votre mot de passe"
              required
              className="w-full bg-white/10 border border-white/20 text-white placeholder-slate-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#cb4154] focus:ring-1 focus:ring-[#cb4154] transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#cb4154] hover:bg-[#b53345] disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-colors text-sm mt-2"
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        <p className="text-slate-600 text-xs text-center mt-6">
          v1.0.0 &copy; 2025 Youmbi Concept
        </p>
      </div>
    </div>
  );
}
