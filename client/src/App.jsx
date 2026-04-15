import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Articles from './pages/Articles';
import CreateFacture from './pages/CreateFacture';
import Factures from './pages/Factures';
import MesInfos from './pages/MesInfos';

function AppLayout() {
  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      <Navbar />
      <main className="flex-1 overflow-y-auto pt-14 pb-16 md:pt-0 md:pb-0">
        <Routes>
          <Route path="/" element={<Navigate to="/factures" replace />} />
          <Route path="/articles"         element={<Articles />} />
          <Route path="/factures"         element={<Factures />} />
          <Route path="/factures/new"     element={<CreateFacture />} />
          <Route path="/factures/:id/edit" element={<CreateFacture />} />
          <Route path="/mes-infos"        element={<MesInfos />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/*" element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          } />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
