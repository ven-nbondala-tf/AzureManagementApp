import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '@/store';
import { Sidebar, UpdateNotification } from '@/components/common';
import { ConfigSelector } from '@/components/auth';
import { CostManagement } from '@/components/modules/CostManagement';
import { RBACManager } from '@/components/modules/RBACManager';
import { GroupsManager } from '@/components/modules/GroupsManager';
import { ServicePrincipalManager } from '@/components/modules/ServicePrincipalManager';
import { KeyVaultManager } from '@/components/modules/KeyVaultManager';
import { SecretMonitor } from '@/components/modules/SecretMonitor';
import { Settings } from '@/components/modules/Settings';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

function AppLayout() {
  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <Routes>
        <Route path="/" element={<Navigate to="/costs" replace />} />
        <Route path="/costs" element={<CostManagement />} />
        <Route path="/rbac" element={<RBACManager />} />
        <Route path="/groups" element={<GroupsManager />} />
        <Route path="/service-principals" element={<ServicePrincipalManager />} />
        <Route path="/keyvault" element={<KeyVaultManager />} />
        <Route path="/secrets" element={<SecretMonitor />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </div>
  );
}

export function App() {
  const { isAuthenticated } = useAuthStore();

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {isAuthenticated ? <AppLayout /> : <ConfigSelector />}
        <UpdateNotification />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
