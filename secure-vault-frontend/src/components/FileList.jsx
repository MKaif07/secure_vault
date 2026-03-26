import React, { useEffect, useState } from "react";
import api from "../api/client";

import { ShieldCheck, Download, HardDrive, Search } from "lucide-react";

export default function FileList() {
  const [files, setFiles] = useState([]);
  const [search, setSearch] = useState("");

  const fetchFiles = async () => {
    try {
      // This calls http://127.0.0.1:8000/api/files/?search=...
      console.log(" --- Attempting to Fetch from Vault ---")
      const response = await api.get("/files/", {
        params: { search: search },
      });
      setFiles(response.data.results);
    } catch (error) {
      console.error(
        "Vault Connection Error:",
        error.response?.data || error.message,
      );
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

      <input
        type="text"
        placeholder="Search the vault..."
        className="w-full p-4 mb-8 bg-vault-gray border-2 border-vault-accent shadow-brutal outline-none"
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {files.map((file) => (
          <div
            key={file.id}
            className="p-6 border-2 border-vault-accent bg-vault-gray hover:translate-x-1 hover:-translate-y-1 transition-all shadow-brutal group"
          >
            <div className="flex justify-between items-start mb-4">
              <HardDrive className="text-vault-accent w-8 h-8" />
              <ShieldCheck className="text-green-500 w-5 h-5 opacity-80" />
            </div>

            <h3 className="font-bold text-lg mb-1 truncate">
              {file.display_name}
            </h3>
            <p className="text-xs text-gray-500 uppercase font-mono">
              ID: {file.id.slice(0, 8)}...
            </p>

            <button
              onClick={() => handleDownload(file.id)}
              className="mt-6 w-full flex items-center justify-center gap-2 bg-vault-accent text-black px-4 py-3 font-black uppercase hover:bg-white transition-colors"
            >
              <Download size={18} />
              Retrieve File
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
