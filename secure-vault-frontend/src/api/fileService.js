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

  downloadFile: async (fileId, fileName) => {
    const response = await api.get(`/files/${fileId}/download/`, {
      responseType: "blob",
    });

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    link.remove();
  },

  shareFile: async (fileId, email, expiresInHours) => {
    const response = await api.post(`/files/${fileId}/share/`, {
      email: email,
      expires_in_hours: expiresInHours,
    });
    return response.data;
  },
};
