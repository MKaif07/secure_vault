import React, { useEffect, useState } from "react";
import api from "../api/client";
// Added missing icons here
import {
  ShieldCheck,
  Download,
  HardDrive,
  Share2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export default function FileList() {
  const [files, setFiles] = useState([]);
  const [search, setSearch] = useState("");
  const [expandedFile, setExpandedFile] = useState(null);

  const handleDownload = async (fileId, versionNum = null) => {
    try {
      // FIX: Cleaned up the slash before the query parameter
      const url = `/files/${fileId}/download${versionNum ? `?v=${versionNum}` : ""}`;

      const response = await api.get(url, { responseType: "blob" });

      const blob = new Blob([response.data]);
      const link = document.createElement("a");
      link.href = window.URL.createObjectURL(blob);

      // OPTIONAL: Try to get the real filename from headers if your CORS allows it
      link.setAttribute("download", `vault_decrypt_${fileId.slice(0, 4)}`);

      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error("Vault Decryption Error:", error);
      alert("Failed to decrypt or retrieve file. Access may be expired.");
    }
  };

  const fetchFiles = async () => {
    try {
      const response = await api.get("/files/", {
        params: { search: search },
      });
      // Ensure we handle pagination if your DRF settings use it
      setFiles(response.data.results || response.data);
    } catch (error) {
      console.error("Vault Connection Error:", error);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, [search]);

  return (
    <div className="p-8 bg-vault-black min-h-screen text-vault-accent">
      <h1 className="text-4xl font-bold mb-8 uppercase tracking-tighter">
        Secure Vault
      </h1>

      <div className="relative mb-8">
        <input
          type="text"
          placeholder="Search encrypted metadata..."
          className="w-full p-4 bg-vault-gray border-2 border-vault-accent shadow-brutal outline-none focus:bg-black transition-colors"
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {files.map((file) => {
          console.log(file);
          return (
            <div
              key={file.id}
              className="p-6 border-2 border-vault-accent bg-vault-gray shadow-brutal transition-all hover:bg-[#151515]"
            >
              <div className="flex justify-between items-start mb-4">
                <HardDrive className="text-vault-accent w-8 h-8" />
                <div className="flex gap-2">
                  <button className="hover:text-white transition-colors">
                    <Share2 size={18} />
                  </button>
                  <ShieldCheck className="text-green-500 w-5 h-5 opacity-80" />
                </div>
              </div>

              <h3 className="font-bold text-lg mb-1 truncate">
                {'=>'} {file.display_name} {file.versions[-1].version_number}
              </h3>

              <button
                onClick={() =>
                  setExpandedFile(expandedFile === file.id ? null : file.id)
                }
                className="flex items-center gap-1 text-[10px] text-gray-500 uppercase font-mono hover:text-vault-accent transition-colors"
              >
                ID: {file.id.slice(0, 8)}...{" "}
                {expandedFile === file.id ? (
                  <ChevronUp size={12} />
                ) : (
                  <ChevronDown size={12} />
                )}
              </button>

              {expandedFile === file.id && (
                <div className="mt-4 space-y-2 border-t border-gray-800 pt-4">
                  <p className="text-[10px] font-black text-gray-600 uppercase mb-2 italic">
                    Cryptographic History
                  </p>
                  {file.versions?.length > 0 ? (
                    file.versions?.map((v) => (
                      <div
                        key={v.id}
                        className="flex justify-between items-center bg-black/40 p-2 border border-gray-800 hover:border-vault-accent group"
                      >
                        <div className="text-[10px] font-mono">
                          <span className="text-vault-accent font-bold">
                            V{v.version_number}
                          </span>
                          {/* Updated to use the smart-sized string from backend */}
                          <span className="text-gray-400 ml-2">
                            [{v.size_human}]
                          </span>
                          <span className="text-gray-600 ml-2 italic">
                            {v.created_at}
                          </span>
                        </div>
                        <button
                          onClick={() =>
                            handleDownload(file.id, v.version_number)
                          }
                          className="text-[9px] bg-gray-800 px-2 py-1 uppercase font-black hover:bg-vault-accent hover:text-black transition-all"
                        >
                          Restore
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="text-[10px] text-gray-700">
                      No versions recorded.
                    </p>
                  )}
                </div>
              )}

              <button
                onClick={() => handleDownload(file.id)}
                className="mt-6 w-full flex items-center justify-center gap-2 bg-vault-accent text-black px-4 py-3 font-black uppercase hover:bg-white transition-colors"
              >
                <Download size={18} />
                Retrieve Latest
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
