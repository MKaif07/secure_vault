import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom'

export default function Login() {
  const [creds, setCreds] = useState({ username: '', password: '' });
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
  e.preventDefault();
  const result = await login(creds.username, creds.password);
  
  if (!result.success) {
    alert(result.message); // High-contrast Neo-Brutalist alert or Toast
  } else {
    navigate("/"); // Move to the vault on success
  }
};

  return (
    <div className="min-h-screen flex items-center justify-center bg-vault-black p-4">
      <div className="w-full max-w-md bg-vault-gray border-4 border-vault-accent p-8 shadow-brutal">
        <div className="flex items-center gap-3 mb-8">
          <ShieldAlert className="text-vault-accent w-10 h-10" />
          <h1 className="text-3xl font-black uppercase tracking-tighter">Access Vault</h1>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block uppercase text-xs font-bold mb-2 opacity-60">Identity</label>
            <input 
              className="w-full bg-black border-2 border-vault-accent p-3 outline-none focus:bg-vault-accent focus:text-black transition-colors"
              type="text" 
              onChange={(e) => setCreds({...creds, username: e.target.value})}
            />
          </div>
          <div>
            <label className="block uppercase text-xs font-bold mb-2 opacity-60">Security Key</label>
            <input 
              className="w-full bg-black border-2 border-vault-accent p-3 outline-none focus:bg-vault-accent focus:text-black transition-colors"
              type="password" 
              onChange={(e) => setCreds({...creds, password: e.target.value})}
            />
          </div>
          <button className="w-full bg-vault-accent text-black font-black py-4 uppercase hover:translate-x-1 hover:-translate-y-1 transition-transform shadow-[4px_4px_0px_0px_rgba(255,255,255,0.5)]">
            Decrypt & Enter
          </button>
        </form>
      </div>
    </div>
  );
}