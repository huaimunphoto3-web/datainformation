import React, { useState } from "react";
import { X, Lock, User, AlertCircle } from "lucide-react";
import { UserRecord } from "../types";

interface LoginModalProps {
  onClose: () => void;
  onLoginSuccess: (user: UserRecord) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onClose, onLoginSuccess }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: username.trim(),
          password: password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "เกิดข้อผิดพลาดในการเข้าสู่ระบบ");
      }

      onLoginSuccess(data.user);
      onClose();
    } catch (err: any) {
      setError(err.message || "การเชื่อมต่อเซิร์ฟเวอร์ล้มเหลว");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-3xl max-w-sm w-full shadow-2xl border border-slate-200 overflow-hidden relative">
        <div className="bg-indigo-900 p-6 text-white text-center relative">
          <h3 className="text-xl font-black uppercase tracking-tight">เข้าสู่ระบบบริการข้อมูล</h3>
          <p className="text-xs text-indigo-200 mt-1 font-bold uppercase tracking-wider">โรงเรียนบ้านห้วยมุ่น สพป.เลย เขต 3</p>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 text-indigo-100 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 p-3.5 rounded-2xl flex items-center space-x-2 text-xs">
              <AlertCircle className="w-4.5 h-4.5 shrink-0 text-red-600" />
              <span className="font-bold">{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">ชื่อผู้ใช้งาน (Username)</label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 h-4.5 w-4.5" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="ป้อนชื่อบัญชีผู้ใช้ของคุณ"
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all text-gray-800 placeholder-slate-400 font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">รหัสผ่าน (Password)</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 h-4.5 w-4.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="ป้อนรหัสผ่าน"
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all text-slate-800 placeholder-slate-400 font-medium"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-black shadow-md shadow-indigo-100 hover:shadow-lg transition-all flex items-center justify-center cursor-pointer disabled:opacity-50 uppercase tracking-wider"
          >
            {isLoading ? "กำลังตรวจสอบข้อมูล..." : "ลงชื่อเข้าใช้งาน"}
          </button>
        </form>
      </div>
    </div>
  );
};
