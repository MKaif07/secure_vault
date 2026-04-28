import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { LogOut, Shield, HardDrive, Activity } from "lucide-react";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    navigate("/login");
    logout();
  };

  return (
    <nav className="bg-vault-black border-b-4 border-vault-gray p-4 mb-8 flex justify-between items-center sticky top-0 z-50">
      <div className="flex items-center gap-6">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="bg-vault-accent p-1 group-hover:rotate-90 transition-transform">
            <Shield size={20} className="text-black" />
          </div>
          <span className="font-black uppercase tracking-tighter text-xl">
            Vault_OS
          </span>
        </Link>

        <div className="hidden md:flex gap-4 font-mono text-xs uppercase">
          <Link
            title="My Files"
            to="/"
            className="hover:text-white flex items-center gap-1"
          >
            <HardDrive size={14} /> Drive
          </Link>
          <Link
            title="Audit Logs"
            to="/audit"
            className="hover:text-white flex items-center gap-1"
          >
            <Activity size={14} /> Audit
          </Link>
        </div>
        {/* <div>
          <Link
            to="/audit"
            className="flex items-center gap-2 hover:text-vault-accent"
          >
            <Activity size={18} />
            <span>Security Logs</span>
          </Link>
        </div> */}
      </div>

      <div className="flex items-center gap-4">
        <span className="text-[10px] bg-vault-gray px-2 py-1 border border-vault-accent/30 font-mono">
          USER: {user?.username}
        </span>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 bg-red-900/20 border border-red-500 text-red-500 px-3 py-1 text-xs font-bold hover:bg-red-600 hover:text-white transition-all"
        >
          <LogOut size={14} /> EXIT
        </button>
      </div>
    </nav>
  );
}
