import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Orcamentos from './pages/Orcamentos';
import OrcamentoBuilder from './pages/OrcamentoBuilder';
import OrcamentoDeParaStudio from './pages/OrcamentoDeParaStudio';
import CalculosQuantitativosPage from './pages/CalculosQuantitativosPage';
import CurvaABC from './pages/CurvaABC';
import FluxoAprovacao from './pages/FluxoAprovacao';
import PadroesTecnicosPage from './pages/PadroesTecnicos';
import Cotacoes from './pages/Cotacoes';
import Configuracoes from './pages/Configuracoes';

// Banco Próprio
import BancoProprioInsumos from './pages/banco-proprio/Insumos';
import BancoProprioComposicoes from './pages/banco-proprio/Composicoes';
import ComposicaoBuilder from './pages/banco-proprio/ComposicaoBuilder';

// Banco do Sistema
import BancoSistemaInsumos from './pages/banco-sistema/Insumos';
import BancoSistemaComposicoes from './pages/banco-sistema/Composicoes';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />

            {/* Orçamentos */}
            <Route path="orcamentos" element={<Orcamentos />} />
            <Route path="orcamentos/calculos" element={<CalculosQuantitativosPage />} />
            <Route path="orcamentos/:id" element={<OrcamentoBuilder />} />
            <Route path="orcamentos/depara/:importId" element={<OrcamentoDeParaStudio />} />

            {/* Banco Próprio */}
            <Route path="banco-proprio/insumos" element={<BancoProprioInsumos />} />
            <Route path="banco-proprio/composicoes" element={<BancoProprioComposicoes />} />
            <Route path="banco-proprio/composicoes/:id" element={<ComposicaoBuilder />} />

            {/* Banco do Sistema */}
            <Route path="banco-sistema/insumos" element={<BancoSistemaInsumos />} />
            <Route path="banco-sistema/composicoes" element={<BancoSistemaComposicoes />} />
            {/* Outros módulos */}
            <Route path="curva-abc" element={<CurvaABC />} />
            <Route path="cotacoes" element={<Cotacoes />} />
            <Route path="fluxo-aprovacao" element={<FluxoAprovacao />} />
            <Route path="padroes-tecnicos" element={<PadroesTecnicosPage />} />
            <Route path="configuracoes" element={<Configuracoes />} />
            <Route path="*" element={
              <div className="flex flex-col items-center justify-center py-24 text-slate-400">
                <p className="text-lg font-semibold mb-1">Módulo em construção</p>
                <p className="text-sm">Em breve disponível nesta área.</p>
              </div>
            } />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
