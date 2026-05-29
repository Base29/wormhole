import { useState } from "react";
import { Key, Eye, EyeOff, ShieldAlert } from "lucide-react";

interface PassphrasePromptProps {
  hostName: string;
  authMethod: string; // "password" | "key" | "agent"
  onCancel: () => void;
  onSubmit: (secret: string, saveInKeychain: boolean) => void;
}

export default function PassphrasePrompt({
  hostName,
  authMethod,
  onCancel,
  onSubmit,
}: PassphrasePromptProps) {
  const [secret, setSecret] = useState<string>("");
  const [showSecret, setShowSecret] = useState<boolean>(false);
  const [saveInKeychain, setSaveInKeychain] = useState<boolean>(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!secret.trim()) return;
    onSubmit(secret, saveInKeychain);
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-md z-50 animate-fade-in">
      <div className="w-96 bg-[#282a36] border border-white/10 rounded-xl p-5 shadow-2xl space-y-4">
        
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400">
            <Key size={20} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Credentials Required</h3>
            <p className="text-[10px] text-white/40">Secure Connection Vault</p>
          </div>
        </div>

        {/* Info */}
        <div className="bg-white/5 border border-white/5 rounded-lg p-3 flex items-start gap-2.5 text-xs text-white/70">
          <ShieldAlert size={16} className="text-purple-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-medium text-white/90">Authentication Fallback</span>
            <p className="text-[11px] leading-relaxed text-white/50">
              The system ssh-agent does not hold an active credential for <strong className="text-white/80">{hostName}</strong>. 
              Please enter the {authMethod === "key" ? "private key passphrase" : "password"} to authenticate.
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider">
              {authMethod === "key" ? "Key Passphrase" : "SSH Password"}
            </label>
            <div className="relative">
              <input
                type={showSecret ? "text" : "password"}
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                placeholder={authMethod === "key" ? "Enter passphrase..." : "Enter password..."}
                className="w-full bg-black/20 border border-white/10 rounded-lg pl-3 pr-10 py-2.5 text-xs text-white placeholder-white/20 focus:outline-none focus:border-purple-400"
                autoFocus
                required
              />
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="absolute right-3 top-2.5 text-white/40 hover:text-white/70 transition-colors"
              >
                {showSecret ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {/* Save to Keychain */}
          <label className="flex items-center gap-2 cursor-pointer select-none py-1">
            <input
              type="checkbox"
              checked={saveInKeychain}
              onChange={(e) => setSaveInKeychain(e.target.checked)}
              className="accent-purple-500 rounded"
            />
            <span className="text-[11px] text-white/60 hover:text-white/80 transition-colors">
              Store securely in macOS Keychain
            </span>
          </label>

          {/* Actions */}
          <div className="flex justify-end gap-2 text-xs pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-3.5 py-2 bg-white/5 hover:bg-white/10 text-white/80 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3.5 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium shadow-lg shadow-purple-500/20 transition-colors"
            >
              Connect
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
