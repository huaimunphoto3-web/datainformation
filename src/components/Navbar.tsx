import React from "react";
import { LogIn, LogOut, Upload, Shield, Home, User, BookOpen } from "lucide-react";
import { UserRecord } from "../types";

interface NavbarProps {
  currentUser: UserRecord | null;
  onLogout: () => void;
  onOpenLogin: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onLogout,
  onOpenLogin,
  activeTab,
  setActiveTab,
}) => {
  return (
    <nav className="bg-indigo-900 border-b border-indigo-800 sticky top-0 z-50 shadow-md text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20">
          {/* Logo and school name */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab("home")}>
            <div className="bg-amber-400 p-2.5 rounded-xl text-indigo-950 flex items-center justify-center shadow-md">
              <BookOpen className="h-6 w-6 font-black" />
            </div>
            <div>
              <span className="text-lg font-black text-white tracking-tighter block leading-tight uppercase">
                ระบบจัดเก็บข้อมูล เอกสาร รายงาน
              </span>
              <span className="text-xs text-indigo-200 font-bold tracking-wider block uppercase">
                โรงเรียนบ้านห้วยมุ่น สพป.เลย เขต 3
              </span>
            </div>
          </div>

          {/* Nav menu items */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            <button
              onClick={() => setActiveTab("home")}
              className={`flex items-center space-x-1 px-3.5 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                activeTab === "home"
                  ? "bg-white/15 text-white border border-white/25"
                  : "text-indigo-200 hover:text-white hover:bg-white/10"
              }`}
            >
              <Home className="h-4.5 w-4.5" />
              <span className="hidden sm:inline uppercase tracking-wider">หน้าแรก</span>
            </button>

            {currentUser && (
              <button
                onClick={() => setActiveTab("upload")}
                className={`flex items-center space-x-1 px-3.5 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                  activeTab === "upload"
                    ? "bg-white/15 text-white border border-white/25"
                    : "text-indigo-200 hover:text-white hover:bg-white/10"
                }`}
              >
                <Upload className="h-4.5 w-4.5" />
                <span className="hidden sm:inline uppercase tracking-wider">อัปโหลดไฟล์</span>
              </button>
            )}

            {currentUser?.role === "admin" && (
              <button
                onClick={() => setActiveTab("admin")}
                className={`flex items-center space-x-1 px-3.5 py-2 rounded-xl text-sm font-black transition-all cursor-pointer ${
                  activeTab === "admin"
                    ? "bg-amber-400 text-indigo-950 font-black shadow-md"
                    : "bg-white/10 text-amber-300 border border-amber-400/20 hover:bg-white/20"
                }`}
              >
                <Shield className="h-4.5 w-4.5" />
                <span className="hidden sm:inline uppercase tracking-wider">แผงควบคุม</span>
              </button>
            )}

            <div className="h-6 w-[1px] bg-indigo-800" />

            {/* User status & Auth trigger */}
            {currentUser ? (
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2 bg-white/10 border border-white/10 px-3.5 py-1.5 rounded-xl">
                  <div className="w-6.5 h-6.5 bg-amber-400 text-indigo-950 rounded-full flex items-center justify-center text-xs font-black uppercase">
                    {currentUser.fullName.charAt(0)}
                  </div>
                  <span className="text-sm font-bold text-white hidden md:inline max-w-[120px] truncate">
                    {currentUser.fullName}
                  </span>
                </div>
                
                <button
                  onClick={onLogout}
                  className="flex items-center justify-center bg-red-600/20 hover:bg-red-600/40 text-red-200 p-2.5 rounded-xl transition-colors cursor-pointer border border-red-500/10"
                  title="ออกจากระบบ"
                >
                  <LogOut className="h-4.5 w-4.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenLogin}
                className="flex items-center space-x-1.5 bg-amber-400 hover:bg-amber-500 text-indigo-950 px-5 py-2.5 rounded-xl text-sm font-black tracking-tight shadow-md transition-all active:scale-95 cursor-pointer uppercase"
              >
                <LogIn className="h-4.5 w-4.5" />
                <span>เข้าสู่ระบบ</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
