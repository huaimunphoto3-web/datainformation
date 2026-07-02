import { useState, useEffect } from "react";
import { Navbar } from "./components/Navbar";
import { StatsBanner } from "./components/StatsBanner";
import { FileList } from "./components/FileList";
import { UploadForm } from "./components/UploadForm";
import { LoginModal } from "./components/LoginModal";
import { AdminPanel } from "./components/AdminPanel";
import { FileRecord, UserRecord, GoogleConnectionStatus } from "./types";
import { GraduationCap, FolderOpen, Shield, Cloud } from "lucide-react";

export default function App() {
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [googleStatus, setGoogleStatus] = useState<GoogleConnectionStatus>({
    connected: false,
  });

  const [currentUser, setCurrentUser] = useState<UserRecord | null>(null);
  const [activeTab, setActiveTab] = useState<string>("home");
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);

  // Load active session from localStorage
  useEffect(() => {
    const savedUser = localStorage.getItem("huaimun_user");
    if (savedUser) {
      try {
        setCurrentUser(JSON.parse(savedUser));
      } catch (err) {
        console.error("Failed to parse saved user:", err);
      }
    }
  }, []);

  // Fetch initial data
  useEffect(() => {
    fetchFiles();
    fetchUsers();
    fetchGoogleStatus();
  }, []);

  const fetchFiles = async () => {
    try {
      const response = await fetch("/api/files");
      const data = await response.json();
      if (response.ok) {
        setFiles(data.files || []);
      }
    } catch (err) {
      console.error("Error fetching files:", err);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/users");
      const data = await response.json();
      if (response.ok) {
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error("Error fetching users:", err);
    }
  };

  const fetchGoogleStatus = async () => {
    try {
      const response = await fetch("/api/admin/google-status");
      const data = await response.json();
      if (response.ok) {
        setGoogleStatus(data);
      }
    } catch (err) {
      console.error("Error fetching google status:", err);
    }
  };

  const handleLoginSuccess = (user: UserRecord) => {
    setCurrentUser(user);
    localStorage.setItem("huaimun_user", JSON.stringify(user));
    // Auto-switch to appropriate tab
    if (user.role === "admin") {
      setActiveTab("admin");
    } else {
      setActiveTab("upload");
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem("huaimun_user");
    setActiveTab("home");
  };

  // Admin CRUD for users
  const handleAddUser = async (newUser: UserRecord) => {
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newUser),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to add user");
    
    // Refresh local list
    fetchUsers();
  };

  const handleEditUser = async (username: string, updatedData: Partial<UserRecord>) => {
    const res = await fetch(`/api/users/${username}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to edit user");

    // Refresh lists
    fetchUsers();
  };

  const handleDeleteUser = async (username: string) => {
    const res = await fetch(`/api/users/${username}`, {
      method: "DELETE",
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to delete user");

    // Refresh list
    fetchUsers();
  };

  // File CRUD triggers from FileList
  const handleEditFileMetadata = async (file: FileRecord) => {
    const res = await fetch(`/api/files/${file.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(file),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to edit file metadata");

    fetchFiles();
  };

  const handleDeleteFile = async (fileId: string) => {
    const isConfirmed = window.confirm("คุณต้องการลบไฟล์นี้และข้อมูลการแชร์บน Google Drive ออกจากระบบถาวรใช่หรือไม่?\n(การดำเนินการนี้ไม่สามารถย้อนกลับได้)");
    if (!isConfirmed) return;

    const res = await fetch(`/api/files/${fileId}`, {
      method: "DELETE",
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to delete file");

    fetchFiles();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenLogin={() => setShowLoginModal(true)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
        {/* Active Tab render */}
        {activeTab === "home" && (
          <>
            {/* Header / Hero section */}
            <div className="bg-indigo-900 rounded-3xl text-white p-8 sm:p-12 relative overflow-hidden shadow-2xl border border-slate-900">
              {/* Decorative backgrounds */}
              <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-white/5 rounded-full blur-2xl animate-pulse" />
              <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-48 h-48 bg-indigo-400/10 rounded-full blur-xl animate-pulse" />

              <div className="max-w-3xl space-y-5 relative z-10">
                <div className="inline-flex items-center space-x-2 bg-white/10 border border-white/20 px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest text-indigo-100">
                  <GraduationCap className="h-4 w-4 text-indigo-300" />
                  <span>ระบบจัดเก็บข้อมูลแบบรวมศูนย์</span>
                </div>
                
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black leading-tight tracking-tight uppercase">
                  ระบบจัดเก็บข้อมูล เอกสาร รายงาน
                  <br />
                  <span className="text-amber-400 font-black">โรงเรียนบ้านห้วยมุ่น สพป.เลย เขต 3</span>
                </h1>
                
                <p className="text-sm sm:text-base text-indigo-100/90 leading-relaxed max-w-2xl font-medium">
                  ยินดีต้อนรับสู่แหล่งรวบรวมไฟล์รายงานและเอกสารทางการศึกษาออนไลน์ ครอบคลุมงานบริหารจัดเก็บข้อมูลแยกเป็นสัดส่วนของทั้ง 5 ฝ่ายงาน 
                  เพื่อความปลอดภัย รวดเร็ว และรองรับการเข้าใช้ของบุคลากรทางการศึกษาทุกระบบอย่างมีประสิทธิภาพ
                </p>

                <div className="pt-4 flex flex-wrap gap-3">
                  <div className="bg-indigo-950/40 border border-indigo-800/50 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center space-x-2 text-indigo-50">
                    <FolderOpen className="w-4 h-4 text-amber-400" />
                    <span>บริหารแยก 5 ฝ่ายงาน</span>
                  </div>
                  <div className="bg-indigo-950/40 border border-indigo-800/50 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center space-x-2 text-indigo-50">
                    <Cloud className="w-4 h-4 text-sky-400" />
                    <span>ซิงค์ตรงกับ Google Drive & Sheets</span>
                  </div>
                  <div className="bg-indigo-950/40 border border-indigo-800/50 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center space-x-2 text-indigo-50">
                    <Shield className="w-4 h-4 text-emerald-400" />
                    <span>ระบบหลังบ้านควบคุมสิทธิ์</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Metric counters */}
            <StatsBanner
              files={files}
              userCount={users.length}
              googleConnected={googleStatus.connected}
            />

            {/* List Section */}
            <div className="space-y-4 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-4">
                <div>
                  <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">คลังไฟล์เอกสารล่าสุด</h2>
                  <p className="text-xs text-slate-500 mt-1 font-bold">ค้นหาหรือคลิกปุ่ม "ดูไฟล์ออนไลน์" เพื่อเข้าดูไฟล์ผ่านคลาวด์ได้โดยตรง</p>
                </div>
              </div>

              <FileList
                files={files}
                currentUser={currentUser}
                onEditFile={handleEditFileMetadata}
                onDeleteFile={handleDeleteFile}
              />
            </div>
          </>
        )}

        {activeTab === "upload" && currentUser && (
          <UploadForm
            currentUser={currentUser}
            users={users}
            onUploadSuccess={fetchFiles}
            googleConnected={googleStatus.connected}
          />
        )}

        {activeTab === "admin" && currentUser?.role === "admin" && (
          <AdminPanel
            users={users}
            googleStatus={googleStatus}
            onRefreshUsers={fetchUsers}
            onRefreshGoogleStatus={fetchGoogleStatus}
            onAddUser={handleAddUser}
            onEditUser={handleEditUser}
            onDeleteUser={handleDeleteUser}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-10 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-2">
          <p className="text-sm text-slate-700 font-black uppercase tracking-wide">
            ระบบจัดเก็บข้อมูล เอกสาร รายงาน โรงเรียนบ้านห้วยมุ่น
          </p>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
            สังกัดสำนักงานเขตพื้นที่การศึกษาประถมศึกษาเลย เขต 3 (สพป.เลย เขต 3)
          </p>
          <p className="text-[10px] text-slate-300 uppercase tracking-widest pt-3 font-bold">
            School Management File Vault System &copy; {new Date().getFullYear()} All Rights Reserved
          </p>
        </div>
      </footer>

      {/* Login Dialog popup */}
      {showLoginModal && (
        <LoginModal
          onClose={() => setShowLoginModal(false)}
          onLoginSuccess={handleLoginSuccess}
        />
      )}
    </div>
  );
}
