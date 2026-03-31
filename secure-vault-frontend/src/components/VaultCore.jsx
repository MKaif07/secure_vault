import React, { useState } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { fileService } from "../api/fileService";
import { Upload, Shield, Loader2, Search, FileText } from "lucide-react";

export default function VaultCore() {
  const [search, setSearch] = useState("");
  const queryClient = new QueryClient();

  // 1. Fetch Logic (React Query)
  const {
    data: files,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["files", search],
    queryFn: () => fileService.getFiles(search),
  });

  // 2. Upload Logic (Mutation)
  const uploadMutation = useMutation({
    mutationFn: fileService.uploadFile,
    onSuccess: () => {
      // ✅ This now correctly talks to the provider's cache
      queryClient.invalidateQueries({ queryKey: ["files"] });
      alert("FILE ENCRYPTED & SAVED TO VAULT");
    },
    onError: (error) => {
      console.error("Upload failed:", error);
      alert("ENCRYPTION FAILURE: Check Backend Logs");
    },
  });

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      uploadMutation.mutate(file);
      // Reset input so the same file can be uploaded again if needed
      e.target.value = null;
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto p-6">
      {/* UPLOAD ZONE */}
      <div className="border-4 border-dashed border-vault-accent p-10 bg-vault-gray text-center shadow-brutal hover:bg-black transition-colors relative">
        <input
          type="file"
          onChange={handleFileChange}
          className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
          disabled={uploadMutation.isPending}
        />
        {uploadMutation.isPending ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="animate-spin text-vault-accent" size={48} />
            <p className="font-black uppercase italic">
              Encrypting for Vault...
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload size={48} />
            <p className="font-black uppercase">
              Drop file here or click to secure
            </p>
            <span className="text-[10px] opacity-50">
              AES-256 GCM ENCRYPTION ENABLED
            </span>
          </div>
        )}
      </div>

      {/* SEARCH BAR */}
      <div className="relative">
        <Search
          className="absolute left-4 top-1/2 -translate-y-1/2 opacity-40"
          size={20}
        />
        <input
          type="text"
          placeholder="QUERY VAULT INDEX..."
          className="w-full bg-vault-gray border-2 border-vault-accent p-4 pl-12 outline-none focus:bg-black uppercase font-mono text-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* FILE GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          // Loading Skeletons
          [1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-40 bg-vault-gray border-2 border-vault-accent animate-pulse opacity-20"
            ></div>
          ))
        ) : isError ? (
          <div className="col-span-full py-10 text-center border-2 border-red-500 bg-red-900/10 text-red-500 font-black uppercase">
            Critical: Could not connect to Secure Backend
          </div>
        ) : Array.isArray(files) && files.length > 0 ? (
          files.map((file) => (
            <div
              key={file.id}
              className="p-6 border-2 border-vault-accent bg-vault-gray shadow-brutal group hover:bg-black transition-all"
            >
              <div className="flex justify-between items-start mb-4">
                <FileText className="text-vault-accent" size={32} />
                <Shield className="text-green-500 opacity-50" size={16} />
              </div>
              <h3 className="font-bold truncate uppercase tracking-tighter">
                {file.display_name || "Unnamed File"}
              </h3>
              <div className="mt-4 flex gap-2">
                <button 
                onClick={()=> fileService.downloadFile(file.id, file.display_name)}
                className="flex-1 bg-vault-accent text-black text-[10px] font-black py-2 uppercase hover:bg-white transition-colors">
                  Retrieve
                </button>
                <button className="px-3 border border-vault-accent text-vault-accent text-[10px] font-black uppercase hover:bg-red-900 hover:border-red-900 transition-colors">
                  Delete
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-20 text-center border-2 border-dashed border-vault-gray">
            <p className="font-mono text-sm opacity-50 uppercase">
              No encrypted payloads found in this sector
            </p>
          </div>
        )}
      </div>
    </div>
  );
}