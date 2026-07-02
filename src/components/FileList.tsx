import React, { useState } from "react";
import { Search, ExternalLink, Calendar, User, Tag, FileDown, Trash2, Edit3, X, AlertCircle } from "lucide-react";
import { FileRecord, UserRecord } from "../types";

interface FileListProps {
  files: FileRecord[];
  currentUser: UserRecord | null;
  onEditFile: (file: FileRecord) => void;
  onDeleteFile: (fileId: string) => void;
}

const DEPARTMENTS = ["ทั้งหมด", "งานวิชาการ", "งานงบประมาณ", "งานบุคคล", "งานบริหารทั่วไป", "งานธุรการ"];

export const FileList: React.FC<FileListProps> = ({
  files,
  currentUser,
  onEditFile,
  onDeleteFile,
}) => {
  const [selectedDept, setSelectedDept] = useState("ทั้งหมด");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("date-desc"); // date-desc, date-asc, name-asc

  // Edit / Delete states
  const [editingFile, setEditingFile] = useState<FileRecord | null>(null);
  const [editName, setEditName] = useState("");
  const [editDept, setEditDept] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const isAdmin = currentUser?.role === "admin";

  // Filter files
  const filteredFiles = files.filter((file) => {
    const matchesDept = selectedDept === "ทั้งหมด" || file.department === selectedDept;
    const matchesSearch =
      file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      file.uploader.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (file.description && file.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesDept && matchesSearch;
  });

  // Sort files
  const sortedFiles = [...filteredFiles].sort((a, b) => {
    if (sortBy === "date-desc") {
      return new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime();
    }
    if (sortBy === "date-asc") {
      return new Date(a.uploadDate).getTime() - new Date(b.uploadDate).getTime();
    }
    if (sortBy === "name-asc") {
      return a.name.localeCompare(b.name, "th");
    }
    return 0;
  });

  // Format date to local Thai format
  const formatThaiDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("th-TH", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }) + " น.";
    } catch {
      return dateString;
    }
  };

  const handleStartEdit = (file: FileRecord) => {
    setEditingFile(file);
    setEditName(file.name);
    setEditDept(file.department);
    setEditDesc(file.description || "");
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFile) return;

    setIsSaving(true);
    try {
      await onEditFile({
        ...editingFile,
        name: editName,
        department: editDept,
        description: editDesc,
      });
      setEditingFile(null);
    } catch (err) {
      console.error("Save edit error:", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Department Quick Filter Pills */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 px-1">กรองข้อมูลแยกตามฝ่ายงาน</h3>
        <div className="flex flex-wrap gap-2">
          {DEPARTMENTS.map((dept) => (
            <button
              key={dept}
              onClick={() => setSelectedDept(dept)}
              className={`px-4 py-2.5 rounded-xl text-sm font-bold tracking-tight border transition-all cursor-pointer ${
                selectedDept === dept
                  ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-100"
                  : "bg-white border-slate-200 text-slate-700 hover:border-slate-400 hover:text-slate-900"
              }`}
            >
              {dept}
            </button>
          ))}
        </div>
      </div>

      {/* Search and Sort controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5" />
          <input
            type="text"
            placeholder="ค้นหาชื่อรายงาน, ชื่อผู้ส่ง, รายละเอียด..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all text-slate-800 font-medium"
          />
        </div>

        <div className="flex items-center space-x-3">
          <label className="text-xs font-black text-slate-400 uppercase tracking-widest">จัดเรียง:</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-bold"
          >
            <option value="date-desc">ล่าสุด ➔ เก่าสุด</option>
            <option value="date-asc">เก่าสุด ➔ ล่าสุด</option>
            <option value="name-asc">ก - ฮ (ชื่อไฟล์)</option>
          </select>
        </div>
      </div>

      {/* Main Files Display */}
      {sortedFiles.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
          <div className="mx-auto w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 text-gray-400 border border-slate-100">
            <AlertCircle className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-black text-slate-800 mb-1">ไม่พบข้อมูลไฟล์เอกสาร</h3>
          <p className="text-sm text-slate-500">กรุณาลองปรับการค้นหาหรือเลือกฝ่ายงานอื่น</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedFiles.map((file) => (
            <div
              key={file.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-[2px] transition-all flex flex-col justify-between overflow-hidden relative group"
            >
              {/* Department badge accent */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-600" />
              
              <div className="p-5 space-y-4">
                {/* Header */}
                <div className="flex justify-between items-start">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-black bg-indigo-50 text-indigo-700 border border-indigo-100/50 uppercase tracking-wider">
                    <Tag className="w-3 h-3 mr-1" />
                    {file.department}
                  </span>
                  
                  {/* Date */}
                  <span className="text-[11px] text-slate-400 font-black uppercase tracking-wider flex items-center">
                    <Calendar className="w-3.5 h-3.5 mr-1" />
                    {formatThaiDate(file.uploadDate)}
                  </span>
                </div>

                {/* File Title */}
                <div>
                  <h4 className="text-base font-black text-slate-800 line-clamp-2 leading-snug group-hover:text-indigo-600 transition-colors" title={file.name}>
                    {file.name}
                  </h4>
                  {file.description && (
                    <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100 font-medium">
                      {file.description}
                    </p>
                  )}
                </div>

                {/* Uploader */}
                <div className="flex items-center space-x-2 text-xs text-slate-600 border-t border-slate-100 pt-3 font-bold">
                  <div className="w-6.5 h-6.5 bg-indigo-50 border border-indigo-100/50 text-indigo-700 font-black rounded-lg flex items-center justify-center text-[10px]">
                    {file.uploader.charAt(0)}
                  </div>
                  <span className="font-bold text-slate-700">{file.uploader}</span>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="bg-slate-50 px-5 py-3.5 border-t border-slate-100 flex items-center justify-between">
                <a
                  href={file.driveUrl}
                  target="_blank"
                  referrerPolicy="no-referrer"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-sm transition-all cursor-pointer uppercase"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>ดูไฟล์ออนไลน์</span>
                </a>

                {/* Admin specific controls */}
                {isAdmin && (
                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={() => handleStartEdit(file)}
                      className="p-2 text-amber-600 hover:bg-amber-100 rounded-lg transition-colors cursor-pointer"
                      title="แก้ไขข้อมูลไฟล์"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDeleteFile(file.id)}
                      className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors cursor-pointer"
                      title="ลบไฟล์และข้อมูล"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit File Modal */}
      {editingFile && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden relative">
            <div className="bg-indigo-900 px-6 py-4 flex justify-between items-center text-white">
              <h3 className="font-black text-lg uppercase tracking-tight">แก้ไขข้อมูลเอกสาร</h3>
              <button
                onClick={() => setEditingFile(null)}
                className="p-1 text-indigo-100 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">ชื่อเอกสาร / รายงาน</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all text-slate-800 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">ฝ่ายงานผู้รับผิดชอบ</label>
                <select
                  required
                  value={editDept}
                  onChange={(e) => setEditDept(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all text-slate-800 font-bold"
                >
                  {DEPARTMENTS.filter(d => d !== "ทั้งหมด").map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">คำอธิบายเอกสาร / บันทึกย่อ</label>
                <textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  rows={3}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all text-slate-800 font-medium"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingFile(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
