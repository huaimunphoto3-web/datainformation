import React from "react";
import { FolderOpen, FileText, Users, HardDrive } from "lucide-react";
import { FileRecord } from "../types";

interface StatsBannerProps {
  files: FileRecord[];
  userCount: number;
  googleConnected: boolean;
}

export const StatsBanner: React.FC<StatsBannerProps> = ({ files, userCount, googleConnected }) => {
  const fileCount = files.length;
  
  // Group files by department
  const deptsCount = files.reduce((acc, file) => {
    acc[file.department] = (acc[file.department] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const activeDepartments = Object.keys(deptsCount).length;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
      <div className="flex flex-col justify-between p-2">
        <span className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">ไฟล์ทั้งหมดในระบบ</span>
        <span className="text-3xl font-black text-indigo-600 leading-none">{fileCount} <span className="text-sm font-bold text-slate-400">รายการ</span></span>
      </div>

      <div className="flex flex-col justify-between p-2">
        <span className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">ฝ่ายงานที่มีไฟล์จัดเก็บ</span>
        <span className="text-3xl font-black text-slate-800 leading-none">{activeDepartments} <span className="text-sm font-bold text-slate-400">/ 5 ฝ่ายงาน</span></span>
      </div>

      <div className="flex flex-col justify-between p-2">
        <span className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">บุคลากรคุณครู</span>
        <span className="text-3xl font-black text-slate-800 leading-none">{userCount} <span className="text-sm font-bold text-slate-400">คน</span></span>
      </div>

      <div className="flex flex-col justify-between p-2">
        <span className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">สิทธิ์เชื่อมต่อคลาวด์</span>
        <span className={`text-xl font-black leading-none mt-1 flex items-center ${googleConnected ? "text-emerald-500" : "text-red-500"}`}>
          <span className={`inline-block w-3 h-3 rounded-full mr-2 shrink-0 ${googleConnected ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`} />
          {googleConnected ? "เชื่อมต่อ Google แล้ว" : "ยังไม่ได้เชื่อมต่อ"}
        </span>
      </div>
    </div>
  );
};
