import React, { useState } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { fileService } from "../api/fileService";
import {
  Upload,
  Shield,
  Loader2,
  Search,
  FileText,
  ShieldCheck,
  Download,
  HardDrive,
  Share2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import ShareModal from "./ShareModal";
import ManageAccessModal from "./ManageAccessModal";
import DeleteModal from "./DeleteModal";

export default function VaultCore() {
  const [search, setSearch] = useState("");
  const queryClient = new QueryClient();

  const [isShareModalOpen, setShareModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  const [expandedFile, setExpandedFile] = useState(null);

  const [isAccessModalOpen, setAccessModalOpen] = useState(false);

  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);

  const handleOpenShare = (file) => {
    setSelectedFile(file);
    setShareModalOpen(true);
  };

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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
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
            // Inside VaultCore's files.map((file) => ...)
            <div
              key={file.id}
              className="group relative p-6 border-2 border-vault-accent bg-vault-gray shadow-[4px_4px_0px_0px_rgba(var(--vault-accent-rgb),1)] hover:shadow-[8px_8px_0px_0px_rgba(var(--vault-accent-rgb),1)] transition-all duration-200"
            >
              {/* TOP DECORATION / STATUS */}
              <div className="flex justify-between items-start mb-6">
                <div className="p-2 border border-vault-accent/20 bg-black/20">
                  <FileText className="text-vault-accent" size={28} />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-green-500/70 tracking-widest uppercase">
                    Secured
                  </span>
                  <Shield className="text-green-500/50" size={14} />
                </div>
              </div>

              {/* FILE INFO */}
              <div className="space-y-1">
                <h3 className="text-lg font-black truncate uppercase tracking-tighter text-white group-hover:text-vault-accent transition-colors">
                  {file.display_name}
                </h3>

                <div className="flex items-center gap-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      console.log("EXP_FILE: ", expandedFile)
                      console.log("FILE_ID: ", file.id)
                      setExpandedFile(
                        expandedFile === file.id ? null : file.id,
                      );
                    }}
                    className="group/id flex items-center gap-2 font-mono text-[10px] text-gray-500 hover:text-white transition-colors"
                  >
                    <span className="bg-white/5 px-1.5 py-0.5 border border-white/10 group-hover/id:border-vault-accent">
                      ID: {file.id.slice(0, 8)}
                    </span>
                    <span className="text-vault-accent/60">
                      V{file.version_count}
                    </span>
                    {expandedFile === file.id ? (
                      <ChevronUp size={12} className="text-vault-accent" />
                    ) : (
                      <ChevronDown size={12} />
                    )}
                  </button>
                </div>
              </div>

              {/* EXPANDABLE VERSIONS PANEL */}
              {expandedFile === file.id && (
                <div className="mt-4 overflow-hidden border border-vault-accent/30 bg-black/40 backdrop-blur-sm animate-in slide-in-from-top-2 duration-200">
                  <div className="px-3 py-2 bg-vault-accent/10 border-b border-vault-accent/30">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-vault-accent">
                      Version History
                    </span>
                  </div>
                  <div className="max-h-32 overflow-y-auto custom-scrollbar">
                    {file.versions?.map((v) => (
                      <div
                        key={v.id}
                        className="flex justify-between items-center p-3 border-b border-white/5 last:border-none hover:bg-white/5 transition-colors"
                      >
                        <div className="flex flex-col">
                          <span className="font-mono text-[10px] text-white">
                            VER_{v.version_number}
                          </span>
                          <span className="text-[9px] text-gray-500 uppercase">
                            {v.size_human}
                          </span>
                        </div>
                        <button
                          onClick={() =>
                            fileService.downloadFile(
                              file.id,
                              file.display_name,
                              v.version_number,
                            )
                          }
                          className="text-[9px] font-bold uppercase px-3 py-1 border border-vault-accent/50 text-vault-accent hover:bg-vault-accent hover:text-black transition-all"
                        >
                          Restore
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ACTION GRID */}
              <div className="mt-8 grid grid-cols-2 gap-2">
                <button
                  onClick={() =>
                    fileService.downloadFile(file.id, file.display_name)
                  }
                  className="flex items-center justify-center gap-2 py-2.5 border-2 border-green-500 text-green-500 text-[11px] font-black uppercase hover:bg-green-500 hover:text-white transition-all active:translate-y-0.5"
                >
                  Retrieve
                </button>
                <button
                  onClick={() => handleOpenShare(file)}
                  className="flex items-center justify-center gap-2 py-2.5 border-2 border-white/20 text-white/70 text-[11px] font-black uppercase hover:border-white hover:text-white transition-all active:translate-y-0.5"
                >
                  Share
                </button>
                <button
                  onClick={() => {
                    setSelectedFile(file);
                    setAccessModalOpen(true);
                  }}
                  className="flex items-center justify-center gap-2 py-2.5 border-2 border-white/20 text-white/70 text-[11px] font-black uppercase hover:border-white hover:text-white transition-all active:translate-y-0.5"
                >
                  Access
                </button>
                <button 
                onClick={()=>{
                  setSelectedFile(file);
                  setDeleteModalOpen(true);
                }}
                className="flex items-center justify-center gap-2 py-2.5 border-2 border-red-900/30 text-red-500 text-[11px] font-black uppercase hover:border-red-600 hover:bg-red-600 hover:text-white transition-all active:translate-y-0.5">
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
        <ShareModal
          file={selectedFile}
          isOpen={isShareModalOpen}
          onClose={() => setShareModalOpen(false)}
        />
      </div>
      <ManageAccessModal
        file={selectedFile}
        isOpen={isAccessModalOpen}
        onClose={() => setAccessModalOpen(false)}
      />
      <DeleteModal
      file={selectedFile}
      isOpen={isDeleteModalOpen}
      onClose={()=>setDeleteModalOpen(false)}
      />
    </div>
  );
}
