import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../api/client';
import { Activity, Shield, Globe, Clock, Terminal } from 'lucide-react';

export default function AuditDashboard() {
  const { data: logs, isLoading, isError } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: async () => {
      const res = await api.get('/audit-logs/');
      // Handle both paginated and non-paginated DRF responses
      return res.data.results || res.data;
    },
    refetchInterval: 10000, // Refresh every 10s for live monitoring
  });

  if (isError) return (
    <div className="p-4 border-2 border-red-500 bg-red-900/10 text-red-500 font-mono text-xs">
      CRITICAL: FAILED TO CONNECT TO AUDIT STREAM
    </div>
  );

  return (
    <div className="bg-[#050505] border-2 border-vault-accent p-6 shadow-brutal font-mono m-2.5">
      {/* Terminal Header */}
      <div className="flex items-center justify-between mb-6 border-b border-vault-accent/30 pb-4">
        <div className="flex items-center gap-3">
          <Terminal className="text-vault-accent" size={20} />
          <h2 className="text-lg font-black uppercase tracking-[0.2em] text-vault-accent">
            Secure Audit Log
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[9px] text-gray-500 uppercase">Live Monitoring Active</span>
        </div>
      </div>

      {/* Log Feed */}
      <div className="space-y-1 max-h-[450px] overflow-y-auto pr-2 custom-scrollbar">
        {isLoading ? (
          <div className="py-20 text-center opacity-40">
             <Activity className="animate-spin mx-auto mb-2" />
             <p className="text-[10px] uppercase">Decrypting Logs...</p>
          </div>
        ) : logs?.length === 0 ? (
          <div className="py-20 text-center opacity-30 text-[10px] uppercase italic">
            No cryptographic events found in current session.
          </div>
        ) : (
          logs.map((log) => (
            <div 
              key={log.id} 
              className="group flex flex-col md:flex-row md:items-center gap-2 md:gap-4 py-2 px-3 border-l-2 border-transparent hover:border-vault-accent hover:bg-vault-accent/5 transition-all text-[10px]"
            >
              {/* Timestamp */}
              <span className="text-gray-600 whitespace-nowrap">
                [{new Date(log.timestamp).toLocaleString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}]
              </span>

              {/* Action Badge */}
              <span className={`font-bold w-20 px-2 py-0.5 rounded-sm text-center ${
                log.action === 'UPLOAD' ? 'bg-blue-900/40 text-blue-400' :
                log.action === 'SHARE_REVOKED' ? 'bg-red-900/40 text-red-400' :
                'bg-green-900/40 text-green-400'
              }`}>
                {log.action}
              </span>

              {/* User & IP Info */}
              <div className="flex items-center gap-4 flex-1">
                <span className="text-vault-accent font-black">
                  USER: {log.username || 'System'}
                </span>
                <span className="text-gray-500 truncate">
                  ID: {log.file_id?.slice(0, 8)}...
                </span>
              </div>

              {/* Network Location */}
              <div className="flex items-center gap-1 text-gray-600 ml-auto">
                <Globe size={10} />
                <span>{log.ip_address || '0.0.0.0'}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Terminal Footer */}
      <div className="mt-6 flex items-center justify-between opacity-40 text-[8px] uppercase tracking-tighter border-t border-vault-accent/20 pt-4">
        <span className="flex items-center gap-1">
          <Shield size={10} /> Forensic Node-Alpha
        </span>
        <span>End of Stream</span>
      </div>
    </div>
  );
}