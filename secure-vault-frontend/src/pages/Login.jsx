import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom'

export default function Login() {
  const [creds, setCreds] = useState({ username: '', password: '' });
  const [isDecrypting, setIsDecrypting] = useState(false); // New: Loading state
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsDecrypting(true); // Start animation/lock
    
    const result = await login(creds.username, creds.password);
    
    if (!result.success) {
      alert(result.message);
      setIsDecrypting(false); // Unlock on failure
    } else {
      navigate("/"); 
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-4 font-mono">
      <div className="w-full max-w-md bg-vault-gray border-4 border-vault-accent p-8 shadow-brutal animate-in fade-in duration-500">
        <div className="flex items-center gap-3 mb-8 border-b-2 border-vault-accent pb-4">
          <ShieldAlert className={`${isDecrypting ? 'animate-spin' : ''} text-vault-accent w-10 h-10`} />
          <h1 className="text-3xl font-black uppercase tracking-tighter italic">Vault Access</h1>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6 text-white">
          <div>
            <label className="block uppercase text-[10px] font-black mb-2 tracking-[0.2em] opacity-40">Identity Signature</label>
            <input 
              required
              className="w-full bg-black border-2 border-vault-accent p-4 outline-none focus:bg-vault-accent focus:text-black transition-all uppercase placeholder:opacity-20"
              type="text" 
              placeholder="Username..."
              onChange={(e) => setCreds({...creds, username: e.target.value})}
            />
          </div>
          <div>
            <label className="block uppercase text-[10px] font-black mb-2 tracking-[0.2em] opacity-40">Cryptographic Key</label>
            <input 
              required
              className="w-full bg-black border-2 border-vault-accent p-4 outline-none focus:bg-vault-accent focus:text-black transition-all placeholder:opacity-20"
              type="password" 
              placeholder="••••••••"
              onChange={(e) => setCreds({...creds, password: e.target.value})}
            />
          </div>
          
          <button 
            disabled={isDecrypting}
            className={`w-full font-black py-5 uppercase transition-all shadow-brutal flex items-center justify-center gap-2 
              ${isDecrypting ? 'bg-gray-800 text-gray-500' : 'bg-vault-accent text-black hover:bg-white'}`}
          >
            {isDecrypting ? 'Decrypting Hash...' : 'Authorize Entry'}
          </button>
        </form>
      </div>
    </div>
  );
}