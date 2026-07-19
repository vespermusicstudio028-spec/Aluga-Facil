/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

class ErrorBoundary extends React.Component<{children: React.ReactNode}, {error: Error | null}> {
  constructor(props: any) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{padding: 40, fontFamily: 'monospace', background: '#1e1e1e', color: '#ff6b6b', minHeight: '100vh'}}>
          <h2 style={{color: '#ff6b6b', marginBottom: 16}}>⚠️ Erro de Runtime</h2>
          <pre style={{background: '#2d2d2d', padding: 20, borderRadius: 8, overflowX: 'auto', color: '#f8f8f2', whiteSpace: 'pre-wrap'}}>
            {this.state.error.message}{'\n\n'}{this.state.error.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Properties from './pages/Properties';
import PropertyDetails from './pages/PropertyDetails';
import Tenants from './pages/Tenants';
import NewTenantFlow from './pages/NewTenantFlow';
import Contracts from './pages/Contracts';
import ContractDetails from './pages/ContractDetails';
import Payments from './pages/Payments';
import Receipts from './pages/Receipts';
import Reports from './pages/Reports';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import TenantDashboard from './pages/TenantDashboard';
import Admin from './pages/Admin';
import MyPlan from './pages/MyPlan';
import PublicPropertyFlow from './pages/PublicPropertyFlow';
import AuthCallback from './pages/AuthCallback';
import Chat from './pages/Chat';

const ProtectedRoute = ({ children, requireAdmin = false }: { children: React.ReactNode, requireAdmin?: boolean }) => {
  const { user, loading } = useAuth();

  // Impede que o Router redirecione para /login antes do Supabase processar o token da URL
  const isOauthCallback = window.location.hash.includes('access_token') || window.location.hash.includes('refresh_token');

  if (loading || isOauthCallback) return (
    <div className="flex flex-col items-center justify-center h-screen bg-slate-50 dark:bg-slate-950">
      <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4" />
      <p className="text-slate-500 font-medium">Processando login...</p>
    </div>
  );
  
  if (!user) return <Navigate to="/login" replace />;
  if (requireAdmin && user.role !== 'admin') return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
};

// Redireciona admin para /admin automaticamente ao acessar /dashboard
const AdminRedirect = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const isOauthCallback = window.location.hash.includes('access_token') || window.location.hash.includes('refresh_token');
  if (loading || isOauthCallback) return null;
  if (user?.role === 'admin') return <Navigate to="/admin" replace />;
  return <>{children}</>;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/p/:id" element={<PublicPropertyFlow />} />
      <Route path="/login" element={<Login />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/tenant-dashboard" element={<TenantDashboard />} />
      <Route path="/register" element={<Register />} />
      
      <Route path="/dashboard" element={<ProtectedRoute><AdminRedirect><Dashboard /></AdminRedirect></ProtectedRoute>} />
      <Route path="/properties" element={<ProtectedRoute><Properties /></ProtectedRoute>} />
      <Route path="/properties/:id" element={<ProtectedRoute><PropertyDetails /></ProtectedRoute>} />
      <Route path="/tenants" element={<ProtectedRoute><Tenants /></ProtectedRoute>} />
      <Route path="/tenants/new" element={<ProtectedRoute><NewTenantFlow /></ProtectedRoute>} />
      <Route path="/tenants/edit/:id" element={<ProtectedRoute><NewTenantFlow /></ProtectedRoute>} />
      <Route path="/contracts" element={<ProtectedRoute><Contracts /></ProtectedRoute>} />
      <Route path="/contracts/:id" element={<ProtectedRoute><ContractDetails /></ProtectedRoute>} />
      <Route path="/payments" element={<ProtectedRoute><Payments /></ProtectedRoute>} />
      <Route path="/receipts" element={<ProtectedRoute><Receipts /></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="/plan" element={<ProtectedRoute><MyPlan /></ProtectedRoute>} />
      <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute requireAdmin><Admin /></ProtectedRoute>} />
    </Routes>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <Router>
            <AppRoutes />
          </Router>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
