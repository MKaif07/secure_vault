import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';
import { X, UserMinus, ShieldAlert, Loader2, Clock } from 'lucide-react';

export default function ManageAccessModal({ file, isOpen, onClose }) {
  const queryClient = useQueryClient();

  // 1. Fetch active shares for this specific file
  const { data: shares, isLoading, isError } = useQuery({
    queryKey: ['shares', file?.id],
    queryFn: async () => {
      const res = await api.get(`/files/${file.id}/shares/`);
      return res.data;
    },
    // Only run the query if the modal is actually open and a file exists
    enabled: !!file && isOpen,
  });

  // 2. Revocation Mutation (The Kill Switch)
  const revokeMutation = useMutation({
    mutationFn: async (shareId) => {
      return await api.post(`/files/${file.id}/revoke/`, { share_id: shareId });
    },
    onSuccess: () => {
      // Refresh the list immediately after revoking
      queryClient.invalidateQueries(['shares', file?.id]);
      alert("CRITICAL: USER ACCESS TERMINATED");
    },
    onError: (error) => {
      console.error("Revocation Failed:", error);
      alert("ERROR: COULD NOT REVOKE ACCESS");
    }
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
      {/* Brutalist Modal Container */}
      <div className="bg-vault-gray border-4 border-vault-accent w-full max-w-lg p-8 shadow-[12px_12px_0px_0px_rgba(var(--vault-accent-rgb),1)] animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-8 border-b-2 border-vault-accent pb-4">
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-3">
              <ShieldAlert className="text-red-500 animate-pulse" /> Access Control
            </h2>
            <p className="text-[10px] font-mono text-gray-500 mt-1">
              TARGET: {file?.display_name?.toUpperCase()}
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="hover:rotate-90 hover:text-red-500 transition-all duration-300"
          >
            <X size={32} />
          </button>
        </div>

        {/* Content Area */}
        <div className="max-h-[400px] overflow-y-auto space-y-4 pr-2 custom-scrollbar">
          {isLoading ? (
            <div className="flex flex-col items-center py-10 opacity-50">
              <Loader2 className="animate-spin mb-2" size={32} />
              <p className="text-[10px] font-black uppercase">Scanning Permissions...</p>
            </div>
          ) : isError ? (
            <div className="p-4 bg-red-900/20 border border-red-500 text-red-500 text-xs font-bold uppercase">
              Failed to retrieve access records.
            </div>
          ) : shares?.length === 0 ? (
            <div className="py-10 text-center border-2 border-dashed border-gray-800">
              <p className="text-xs text-gray-600 uppercase font-bold italic">
                No active external links detected for this payload.
              </p>
            </div>
          ) : (
            shares?.map((share) => (
              <div 
                key={share.id} 
                className="flex justify-between items-center bg-black/60 p-4 border border-gray-800 hover:border-vault-accent transition-colors group"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-sm text-vault-accent">
                      {share.shared_with_username}
                    </span>
                    <span className="text-[9px] bg-gray-900 px-2 py-0.5 text-gray-500 rounded">
                      {share.shared_with_email}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[9px] text-gray-600 font-mono uppercase">
                    <span className="flex items-center gap-1">
                      <Clock size={10} /> Expires: {new Date(share.expires_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <button 
                  onClick={() => {
                    if(window.confirm(`REVOKE ACCESS FOR ${share.shared_with_username}?`)) {
                      revokeMutation.mutate(share.id);
                    }
                  }}
                  disabled={revokeMutation.isPending}
                  className="p-3 bg-red-950/20 border border-red-900 text-red-500 hover:bg-red-600 hover:text-white transition-all disabled:opacity-50"
                  title="Revoke Permission"
                >
                  {revokeMutation.isPending ? (
                    <Loader2 className="animate-spin" size={20} />
                  ) : (
                    <UserMinus size={20} />
                  )}
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer Actions */}
        <div className="mt-8 pt-6 border-t border-gray-800 flex flex-col gap-3">
          <p className="text-[9px] text-gray-700 italic text-center uppercase tracking-widest">
            All revocations are permanent and logged to the audit stream.
          </p>
          <button 
            onClick={onClose}
            className="w-full bg-vault-accent text-black py-4 font-black uppercase text-sm hover:bg-white transition-colors shadow-brutal"
          >
            Exit Terminal
          </button>
        </div>
      </div>
    </div>
  );
}