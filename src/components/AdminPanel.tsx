import React, { useState } from "react";
import { Shield, Key, Users, RefreshCw, Trash2, Edit2, Plus, HardDrive, CheckCircle2, AlertTriangle, Eye, EyeOff } from "lucide-react";
import { UserRecord, GoogleConnectionStatus } from "../types";
import { loginWithGoogle } from "../lib/firebase";

interface AdminPanelProps {
  users: UserRecord[];
  googleStatus: GoogleConnectionStatus;
  onRefreshUsers: () => void;
  onRefreshGoogleStatus: () => void;
  onAddUser: (user: UserRecord) => Promise<void>;
  onEditUser: (username: string, updatedData: Partial<UserRecord>) => Promise<void>;
  onDeleteUser: (username: string) => Promise<void>;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  users,
  googleStatus,
  onRefreshUsers,
  onRefreshGoogleStatus,
  onAddUser,
  onEditUser,
  onDeleteUser,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<"google" | "users">("google");
  
  // User Form States
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newFullName, setNewFullName] = useState("");
  const [newRole, setNewRole] = useState<"teacher" | "admin">("teacher");

  // Edit User State
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [editPassword, setEditPassword] = useState("");
  const [editFullName, setEditFullName] = useState("");
  const [editRole, setEditRole] = useState<"teacher" | "admin">("teacher");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Password visibility
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

  const togglePasswordVisibility = (username: string) => {
    setShowPasswords(prev => ({
      ...prev,
      [username]: !prev[username]
    }));
  };

  const handleConnectGoogle = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    try {
      // 1. Sign in with Google using Firebase popup to obtain access token
      const result = await loginWithGoogle();
      
      // 2. Send token to our server
      const response = await fetch("/api/admin/save-token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          accessToken: result.accessToken,
          email: result.user.email,
          expiryTime: new Date(Date.now() + 3600 * 1000).toISOString(), // 1 hour expiration
        }),
      });

      if (!response.ok) {
        throw new Error("ล้มเหลวในการส่งข้อมูลโทเค็นไปยังเซิร์ฟเวอร์");
      }

      setSuccess("เชื่อมต่อกับบัญชี Google Drive & Sheets สำเร็จแล้ว!");
      onRefreshGoogleStatus();
      onRefreshUsers();
    } catch (err: any) {
      console.error("Connect Google Error:", err);
      setError(err.message || "เกิดข้อผิดพลาดในการเชื่อมต่อกับ Google");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await onAddUser({
        username: newUsername.trim(),
        password: newPassword.trim(),
        fullName: newFullName.trim(),
        role: newRole,
      });

      setSuccess(`เพิ่มผู้ใช้งาน '${newFullName}' ลงในระบบและ Google Sheet สำเร็จแล้ว`);
      setNewUsername("");
      setNewPassword("");
      setNewFullName("");
      setNewRole("teacher");
      setShowAddForm(false);
    } catch (err: any) {
      setError(err.message || "ล้มเหลวในการเพิ่มผู้ใช้");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await onEditUser(editingUser.username, {
        password: editPassword.trim(),
        fullName: editFullName.trim(),
        role: editRole,
      });

      setSuccess(`แก้ไขข้อมูลผู้ใช้ '${editFullName}' สำเร็จแล้ว`);
      setEditingUser(null);
    } catch (err: any) {
      setError(err.message || "ล้มเหลวในการแก้ไขผู้ใช้");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteUserClick = async (username: string, fullName: string) => {
    const isConfirmed = window.confirm(
      `คุณแน่ใจหรือไม่ว่าต้องการลบผู้ใช้งาน '${fullName}' (${username}) ออกจากระบบ?\nข้อมูลรหัสผ่านใน Google Sheet จะถูกนำออกด้วย`
    );
    if (!isConfirmed) return;

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await onDeleteUser(username);
      setSuccess(`ลบผู้ใช้งานสำเร็จแล้ว`);
    } catch (err: any) {
      setError(err.message || "ล้มเหลวในการลบผู้ใช้");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSyncNow = async () => {
    setIsSyncing(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/users/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Sync failed");
      
      setSuccess(`ประสานข้อมูล (Sync) จาก Google Sheet สำเร็จ! โหลดผู้ใช้งานทั้งหมด ${data.users?.length || 0} คน`);
      onRefreshUsers();
    } catch (err: any) {
      setError("เกิดข้อผิดพลาดในการประสานข้อมูล: " + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const startEditUser = (user: UserRecord) => {
    setEditingUser(user);
    setEditPassword(user.password || "");
    setEditFullName(user.fullName);
    setEditRole(user.role);
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden min-h-[500px]">
      {/* Header section */}
      <div className="bg-indigo-900 p-6 sm:p-8 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-xl" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-lg" />

        <div className="flex items-center space-x-3 relative z-10">
          <div className="p-2.5 bg-white/10 rounded-xl text-white border border-white/10">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-black uppercase tracking-tight">ระบบจัดการหลังบ้านผู้ดูแลระบบ</h3>
            <p className="text-xs text-indigo-200 mt-0.5 font-bold uppercase tracking-wider">จัดการระบบจัดเก็บไฟล์ Google Drive และรายชื่อคุณครู Google Sheets</p>
          </div>
        </div>

        {/* Sync Trigger */}
        <button
          onClick={handleSyncNow}
          disabled={isSyncing}
          className="relative z-10 flex items-center space-x-2 bg-indigo-700/60 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-xs font-black transition-all border border-indigo-600 cursor-pointer disabled:opacity-50 uppercase tracking-wider"
        >
          <RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`} />
          <span>ซิงค์ข้อมูล Google Sheet</span>
        </button>
      </div>

      {/* Sub Tabs control */}
      <div className="flex border-b border-slate-200 bg-slate-50">
        <button
          onClick={() => setActiveSubTab("google")}
          className={`flex-1 py-4 text-center font-black text-xs uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            activeSubTab === "google"
              ? "border-indigo-600 text-indigo-700 bg-white"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50"
          }`}
        >
          <div className="flex items-center justify-center space-x-2">
            <HardDrive className="w-4 h-4" />
            <span>เชื่อมต่อ Google Workspace</span>
          </div>
        </button>
        <button
          onClick={() => setActiveSubTab("users")}
          className={`flex-1 py-4 text-center font-black text-xs uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            activeSubTab === "users"
              ? "border-indigo-600 text-indigo-700 bg-white"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50"
          }`}
        >
          <div className="flex items-center justify-center space-x-2">
            <Users className="w-4 h-4" />
            <span>จัดการผู้ใช้งานคุณครู</span>
          </div>
        </button>
      </div>

      {/* Messages */}
      <div className="p-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-2xl flex items-start space-x-3 text-sm mb-6 animate-fade-in">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-red-600" />
            <span className="font-bold">{error}</span>
          </div>
        )}

        {success && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-2xl flex items-start space-x-3 text-sm mb-6 animate-fade-in">
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600" />
            <span className="font-black uppercase tracking-wider">{success}</span>
          </div>
        )}

        {/* Tab 1: Google Connection */}
        {activeSubTab === "google" && (
          <div className="space-y-6">
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
              <h4 className="font-black text-slate-800 text-lg uppercase tracking-tight mb-2">สถานะสิทธิ์การเชื่อมต่อ Google (Google OAuth API)</h4>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">
                ระบบคลังเอกสารจำเป็นต้องได้รับการยืนยันสิทธิ์จากบัญชี Google เพื่อให้สามารถสร้างโฟลเดอร์ของฝ่ายงานใน <b>Google Drive</b> 
                และบันทึกผู้ใช้คุณครูลงใน <b>Google Sheet</b> ได้
              </p>

              <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between p-5 bg-white rounded-xl border border-slate-200 gap-4">
                <div className="flex items-center space-x-4">
                  <div className={`p-3 rounded-xl border ${googleStatus.connected ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-red-50 text-red-600 border-red-100"}`}>
                    <HardDrive className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">บัญชีผู้ใช้ Google</p>
                    <p className="text-lg font-black text-slate-800 mt-0.5">
                      {googleStatus.connected ? googleStatus.email : "ยังไม่ได้เชื่อมต่อ"}
                    </p>
                    {googleStatus.connected && (
                      <span className="inline-block mt-1 px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[10px] font-black rounded-md uppercase tracking-wider border border-emerald-200">
                        Active & Synced
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={handleConnectGoogle}
                  disabled={isLoading}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl text-sm shadow-sm hover:shadow-md transition-all flex items-center space-x-2 cursor-pointer disabled:opacity-50 shrink-0 uppercase tracking-wider"
                >
                  <Key className="w-4 h-4" />
                  <span>{googleStatus.connected ? "เชื่อมต่อใหม่อีกครั้ง" : "เชื่อมต่อบัญชี Google"}</span>
                </button>
              </div>
            </div>

            <div className="p-5 bg-amber-50 rounded-2xl border border-amber-200 text-amber-800 text-sm space-y-2">
              <p className="font-black uppercase tracking-tight text-amber-900">ข้อมูลลิงก์ปลายทางในการจัดเก็บข้อมูลของแอปพลิเคชัน:</p>
              <ul className="list-disc pl-5 text-xs space-y-1.5 text-amber-900/90 font-medium">
                <li><b>Google Drive Parent Folder ID:</b> <code className="bg-white px-1.5 py-0.5 rounded border border-amber-200 font-mono text-[11px]">{googleStatus.connected ? "1zTGB-0OFuZNmddiRxIZBuMcghilOHfTD" : "1zTGB-0OFuZNmddiRxIZBuMcghilOHfTD"}</code></li>
                <li><b>Google Sheet ID (Users list):</b> <code className="bg-white px-1.5 py-0.5 rounded border border-amber-200 font-mono text-[11px]">1aQ9jJ5F1dktUzm3LqU-6rYbycSTs2EoteGuHajTtzfQ</code></li>
              </ul>
            </div>
          </div>
        )}

        {/* Tab 2: User Management (CRUD) */}
        {activeSubTab === "users" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h4 className="font-black text-slate-800 text-base uppercase tracking-tight">รายชื่อคุณครูและสิทธิ์ใช้งานในระบบ ({users.length} คน)</h4>
              <button
                onClick={() => {
                  setShowAddForm(!showAddForm);
                  setEditingUser(null);
                }}
                className="flex items-center space-x-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-sm transition-all cursor-pointer uppercase tracking-wider"
              >
                <Plus className="w-4 h-4" />
                <span>เพิ่มผู้ใช้ใหม่</span>
              </button>
            </div>

            {/* Add User Form */}
            {showAddForm && (
              <form onSubmit={handleAddUserSubmit} className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4 animate-fade-in">
                <h5 className="font-black text-slate-800 text-sm uppercase tracking-tight">กรอกข้อมูลผู้ใช้รายใหม่</h5>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">ชื่อผู้ใช้ (Username)</label>
                    <input
                      type="text"
                      required
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      placeholder="เช่น krusorn"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-800 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">รหัสผ่าน (Password)</label>
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="เช่น 123456"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-800 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">ชื่อ-นามสกุลจริง</label>
                    <input
                      type="text"
                      required
                      value={newFullName}
                      onChange={(e) => setNewFullName(e.target.value)}
                      placeholder="เช่น ครูวิไล สอนสนุก"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-800 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">ระดับสิทธิ์</label>
                    <select
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-800 font-bold"
                    >
                      <option value="teacher">ครูผู้สอนทั่วไป (Teacher)</option>
                      <option value="admin">ผู้ดูแลระบบ (Admin)</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-5 py-2 text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50 uppercase tracking-wider"
                  >
                    {isLoading ? "กำลังสร้าง..." : "บันทึกบัญชีใหม่"}
                  </button>
                </div>
              </form>
            )}

            {/* Edit User Form */}
            {editingUser && (
              <form onSubmit={handleEditUserSubmit} className="bg-amber-50 p-5 rounded-2xl border border-amber-200 space-y-4 animate-fade-in">
                <h5 className="font-black text-amber-900 text-sm uppercase tracking-tight">แก้ไขข้อมูลผู้ใช้: {editingUser.username}</h5>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-amber-800/60 uppercase tracking-widest mb-1.5">ชื่อผู้ใช้ (เปลี่ยนไม่ได้)</label>
                    <input
                      type="text"
                      disabled
                      value={editingUser.username}
                      className="w-full px-3.5 py-2.5 bg-amber-100/50 border border-amber-200 rounded-xl text-sm text-amber-800 cursor-not-allowed font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-amber-800/60 uppercase tracking-widest mb-1.5">รหัสผ่านใหม่ (Password)</label>
                    <input
                      type="text"
                      required
                      value={editPassword}
                      onChange={(e) => setEditPassword(e.target.value)}
                      placeholder="ป้อนรหัสผ่านใหม่"
                      className="w-full px-3.5 py-2.5 bg-white border border-amber-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-800 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-amber-800/60 uppercase tracking-widest mb-1.5">ชื่อ-นามสกุลจริง</label>
                    <input
                      type="text"
                      required
                      value={editFullName}
                      onChange={(e) => setEditFullName(e.target.value)}
                      placeholder="เช่น ครูวิไล สอนสนุก"
                      className="w-full px-3.5 py-2.5 bg-white border border-amber-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-800 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-amber-800/60 uppercase tracking-widest mb-1.5">ระดับสิทธิ์</label>
                    <select
                      value={editRole}
                      onChange={(e) => setEditRole(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 bg-white border border-amber-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-800 font-bold"
                    >
                      <option value="teacher">ครูผู้สอนทั่วไป (Teacher)</option>
                      <option value="admin">ผู้ดูแลระบบ (Admin)</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-2 border-t border-amber-200">
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="px-4 py-2 text-xs font-bold text-amber-800 hover:bg-amber-100 rounded-xl transition-colors cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-5 py-2 text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50 uppercase tracking-wider"
                  >
                    {isLoading ? "กำลังอัปเดต..." : "บันทึกการแก้ไข"}
                  </button>
                </div>
              </form>
            )}

            {/* Users List Table */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs font-black text-slate-400 uppercase tracking-widest">
                      <th className="py-4 px-6">ชื่อ-นามสกุลจริง</th>
                      <th className="py-4 px-6">Username</th>
                      <th className="py-4 px-6">Password</th>
                      <th className="py-4 px-6">สิทธิ์เข้าใช้งาน</th>
                      <th className="py-4 px-6 text-right">การจัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users.map((user) => (
                      <tr key={user.username} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 px-6 font-black text-slate-800">{user.fullName}</td>
                        <td className="py-4 px-6 text-slate-600">
                          <code className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 text-xs font-mono font-medium">{user.username}</code>
                        </td>
                        <td className="py-4 px-6 text-slate-600">
                          <div className="flex items-center space-x-2">
                            <span className="font-mono text-xs">
                              {showPasswords[user.username] ? (user.password || "••••••") : "••••••"}
                            </span>
                            <button
                              type="button"
                              onClick={() => togglePasswordVisibility(user.username)}
                              className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
                            >
                              {showPasswords[user.username] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`inline-flex px-2.5 py-1 rounded-md text-xs font-black uppercase tracking-wider border ${
                            user.role === "admin"
                              ? "bg-rose-50 text-rose-700 border-rose-100"
                              : "bg-indigo-50 text-indigo-700 border-indigo-100"
                          }`}>
                            {user.role === "admin" ? "ผู้ดูแลระบบ (Admin)" : "ครูผู้สอน (Teacher)"}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end space-x-1">
                            <button
                              onClick={() => startEditUser(user)}
                              className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                              title="แก้ไขข้อมูลผู้ใช้"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteUserClick(user.username, user.fullName)}
                              className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="ลบข้อมูลผู้ใช้"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
