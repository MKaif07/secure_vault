import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import FileList from './components/FileList';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import VaultCore from './components/VaultCore';

const queryClient = new QueryClient();

function Dashboard() {
  const { user, logout } = useAuth();
  if (!user) return <Login />;

  return (
    <div className="p-4">
      <button onClick={logout} className="text-xs border border-red-500 text-red-500 p-1 mb-4 uppercase">Lock Vault</button>
      <FileList />
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <div className="min-h-screen bg-vault-black text-vault-accent font-sans">
          <VaultCore />
        </div>
      </AuthProvider>
    </QueryClientProvider>
  );
}