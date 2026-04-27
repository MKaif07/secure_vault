import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../api/client";
import { X, UserMinus, ShieldAlert, Loader2, Clock, Trash2 } from "lucide-react";
import { toast } from "react-hot-toast";

export default function DeleteModal({ file, isOpen, onClose }) {
  const queryClient = useQueryClient();

  // 1. Fetch active shares (Your existing logic)
  const { data: shares, isLoading, isError } = useQuery({
    queryKey: ["shares", file?.id],
    queryFn: async () => {
      const res = await api.get(`/files/${file.id}/shares/`);
      return res.data;
    },
    enabled: !!file && isOpen,
  });

  // 2. Revocation Mutation (Your existing logic)
  const revokeMutation = useMutation({
    mutationFn: async (shareId) => {
      return await api.post(`/files/${file.id}/revoke/`, { share_id: shareId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["shares", file?.id]);
      toast.success("ACCESS TERMINATED");
    },
  });

  // 3. FILE DELETION MUTATION (The new request)
  const deleteFileMutation = useMutation({
    mutationFn: async () => {
      // Matches your cURL: DELETE http://127.0.0.1:8000/api/files/<file_id>/
      return await api.delete(`/files/${file.id}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["files"]); // Refresh your file list
      toast.error("FILE PERMANENTLY PURGED", {
        icon: <Trash2 />,
        style: { background: '#333', color: '#fff' }
      });
      onClose(); // Close modal on success
    },
    onError: () => {
      toast.error("PURGE FAILED: SERVER REJECTED REQUEST");
    }
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
      <div className="bg-vault-gray border-4 border-vault-accent w-full max-w-lg p-8 shadow-[12px_12px_0px_0px_rgba(var(--vault-accent-rgb),1)]">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-8 border-b-2 border-vault-accent pb-4">
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-3">
              <ShieldAlert className="text-red-500 animate-pulse" /> Final Confirmation
            </h2>
            <p className="text-[10px] font-mono text-gray-500 mt-1 uppercase">
              DESTRUCTION TARGET: {file?.display_name || "UNKNOWN_PAYLOAD"}
            </p>
          </div>
          <button onClick={onClose} className="hover:rotate-90 hover:text-red-500 transition-all">
            <X size={32} />
          </button>
        </div>

        {/* Existing Share/Revoke List */}
        <div className="max-h-[200px] overflow-y-auto space-y-4 pr-2 custom-scrollbar mb-6">
           <p className="text-[10px] font-black text-vault-accent uppercase mb-2">Active Access Links:</p>
           {/* ... (Your existing mapping logic for shares stays here) ... */}
           {shares?.map((share) => (
              <div key={share.id} className="flex justify-between items-center bg-black/40 p-3 border border-gray-800">
                <span className="text-xs font-mono">{share.shared_with_username}</span>
                <button 
                  onClick={() => revokeMutation.mutate(share.id)}
                  className="text-red-500 hover:text-white"
                >
                  <UserMinus size={16} />
                </button>
              </div>
           ))}
        </div>

        {/* WARNING MESSAGE */}
        <div className="p-4 bg-red-950/30 border-l-4 border-red-600 mb-8">
            <p className="text-xs text-red-500 font-bold uppercase tracking-widest">
                Warning: This action will overwrite and purge encrypted blocks from disk. Recovery is impossible.
            </p>
        </div>

        {/* FOOTER ACTIONS - The buttons you requested */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={onClose}
            className="bg-green-600 text-black py-4 font-black uppercase text-sm hover:bg-green-400 transition-colors border-2 border-green-900"
          >
            Cancel / Abort
          </button>
          
          <button
            onClick={() => deleteFileMutation.mutate()}
            disabled={deleteFileMutation.isPending}
            className="bg-red-600 text-white py-4 font-black uppercase text-sm hover:bg-red-500 transition-colors border-2 border-red-900 flex items-center justify-center gap-2"
          >
            {deleteFileMutation.isPending ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <>
                <Trash2 size={20} /> Confirm Purge
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}