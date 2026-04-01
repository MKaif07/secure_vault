import React, { useState } from "react";
import { X, Send, Clock, Check, Copy } from "lucide-react";
import { fileService } from "../api/fileService";

const ShareModal = ({ file, isOpen, onClose }) => {
  const [email, setEmail] = useState("");
  const [hours, setHours] = useState(24);
  const [loading, setLoading] = useState(false);
  const [shareLink, setShareLink] = useState(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleShare = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await fileService.shareFile(file.id, email, hours);
      // Construct the full link using the access_token from backend
      const fullLink = `${window.location.origin}/download/${data.access_token}`;
      setShareLink(fullLink);
    } catch (err) {
      alert(err.response?.data?.error || "User not found or sharing failed");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-[#0a0a0a] border-2 border-vault-accent p-6 shadow-[8px_8px_0px_0px_rgba(var(--vault-accent-rgb),0.3)]">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-black uppercase tracking-tighter text-vault-accent">
            Secure Share: {file.display_name}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {!shareLink ? (
          <form onSubmit={handleShare} className="space-y-4">
            <div>
              <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">
                Recipient Email
              </label>
              <input
                type="email"
                required
                className="w-full bg-black border border-gray-800 p-3 text-white focus:border-vault-accent outline-none"
                placeholder="user@secure-cloud.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1 flex justify-between">
                <span>Access Duration</span>
                <span className="text-vault-accent">{hours} Hours</span>
              </label>
              <input
                type="range"
                min="1"
                max="168"
                className="w-full accent-vault-accent"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-vault-accent text-black font-black py-3 uppercase hover:bg-white transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                "Encrypting Link..."
              ) : (
                <>
                  <Send size={18} /> Generate Secure Link
                </>
              )}
            </button>
          </form>
        ) : (
          <div className="space-y-4 animate-in fade-in zoom-in duration-300">
            <div className="p-4 bg-green-500/10 border border-green-500/50 text-green-500 text-sm">
              Vault access granted successfully. Link expires in {hours} hours.
            </div>

            <div className="relative group">
              <input
                readOnly
                value={shareLink}
                className="w-full bg-black border border-gray-800 p-3 pr-12 text-xs text-gray-400 font-mono overflow-hidden"
              />
              <button
                onClick={copyToClipboard}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-vault-accent text-black hover:bg-white"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>

            <button
              onClick={onClose}
              className="w-full border border-gray-800 text-gray-500 font-black py-3 uppercase hover:text-white"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShareModal;
