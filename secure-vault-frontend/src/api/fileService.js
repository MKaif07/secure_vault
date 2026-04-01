import { FileDiffIcon } from "lucide-react";
import api from "./client";

export const fileService = {
  //Fetch all files
  getFiles: async (search = "") => {
    const { data } = await api.get("/files/", { params: { search } });
    return data.results || data || [];
  },

  // Upload  a new file (Multipart)
  uploadFile: async (file) => {
    const formData = new FormData();
    formData.append("file", file);

    const { data } = await api.post("/files/", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  },

  downloadFile: async (fileId, fileName, version = null) => {
    try {
        const url = `/files/${fileId}/download/${version ? `?v=${version}` : ""}`;
        
        const response = await api.get(url, {
            responseType: 'blob', // Critical for binary data
            withCredentials: true,
            // headers: {
            //     'Accept': 'application/octet-stream',
            // }
        });

        // Create a URL for the blob
        const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = blobUrl;
        
        // Use the filename passed or fallback
        link.setAttribute('download', fileName || `vault_file_${fileId.slice(0,4)}`);
        
        document.body.appendChild(link);
        link.click();
        
        // Clean up to prevent memory leaks
        link.remove();
        window.URL.revokeObjectURL(blobUrl);

    } catch (error) {
        console.error("CORS or Decryption Error:", error);
    }
  },

  shareFile: async (fileId, email, expiresInHours) => {
    const response = await api.post(`/files/${fileId}/share/`, {
      email: email,
      expires_in_hours: expiresInHours,
    });
    return response.data;
  },
};
