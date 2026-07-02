import React, { useState, useRef } from "react";
import { UploadCloud, File, X, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";
import { UserRecord } from "../types";

interface UploadFormProps {
  currentUser: UserRecord | null;
  users: UserRecord[];
  onUploadSuccess: () => void;
  googleConnected: boolean;
}

const DEPARTMENTS = ["งานวิชาการ", "งานงบประมาณ", "งานบุคคล", "งานบริหารทั่วไป", "งานธุรการ"];

export const UploadForm: React.FC<UploadFormProps> = ({
  currentUser,
  users,
  onUploadSuccess,
  googleConnected,
}) => {
  const [name, setName] = useState("");
  const [department, setDepartment] = useState("งานวิชาการ");
  
  // Default uploader name to logged-in user, but allow selecting any user
  const [uploader, setUploader] = useState(currentUser?.fullName || "");
  const [description, setDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState<globalThis.File | null>(null);
  
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const teacherUsers = users.filter((u) => u.role === "teacher" || u.role === "admin");

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      if (!name) setName(file.name.substring(0, file.name.lastIndexOf(".")) || file.name);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setSelectedFile(file);
      if (!name) setName(file.name.substring(0, file.name.lastIndexOf(".")) || file.name);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const convertToBase64 = (file: globalThis.File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (err) => reject(err);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setError("กรุณาเลือกไฟล์เอกสารที่ต้องการอัปโหลด");
      return;
    }

    setIsUploading(true);
    setError(null);
    setSuccess(null);

    try {
      const base64Data = await convertToBase64(selectedFile);
      
      const response = await fetch("/api/files", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          department,
          uploader,
          uploaderUsername: currentUser?.username || "unknown",
          description: description.trim(),
          base64Data,
          mimeType: selectedFile.type,
        }),
      });

      const resData = await response.json();

      if (!response.ok) {
        throw new Error(resData.error || "เกิดข้อผิดพลาดในการอัปโหลดไฟล์");
      }

      setSuccess("อัปโหลดเอกสารเข้า Google Drive สำเร็จเรียบร้อยแล้ว!");
      setName("");
      setDescription("");
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      onUploadSuccess();
    } catch (err: any) {
      setError(err.message || "เกิดข้อผิดพลาดในการติดต่อเซิร์ฟเวอร์");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden relative">
      <div className="bg-indigo-900 p-8 text-white text-center relative overflow-hidden">
        {/* Background visual accents */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-xl" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-lg" />
        
        <h3 className="text-2xl font-black uppercase tracking-tight relative z-10">ส่งเอกสาร / อัปโหลดรายงาน</h3>
        <p className="text-xs text-indigo-200 mt-1.5 relative z-10 font-bold uppercase tracking-wider">
          อัปโหลดไฟล์ไปจัดเก็บยัง Google Drive แยกฝ่ายงานตามระบบบริหารจัดการ
        </p>
      </div>

      <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
        {/* Connection Notice */}
        {!googleConnected && (
          <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-2xl flex items-start space-x-3 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-600" />
            <div>
              <p className="font-black uppercase tracking-tight text-red-900">ระบบปิดใช้งานการอัปโหลดชั่วคราว</p>
              <p className="text-xs mt-1 font-medium">ระบบยังไม่ได้เชื่อมต่อกับบัญชี Google Drive ของโรงเรียน กรุณาติดต่อผู้ดูแลระบบ (Admin) เพื่อลงชื่อเข้าใช้ระบบหลังบ้าน</p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-2xl flex items-center space-x-3 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-600" />
            <span className="font-bold">{error}</span>
          </div>
        )}

        {success && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-2xl flex items-center space-x-3 text-sm">
            <CheckCircle className="w-5 h-5 shrink-0 text-emerald-600" />
            <span className="font-black uppercase tracking-wide">{success}</span>
          </div>
        )}

        {/* Input Details */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">ชื่อเอกสาร / หัวข้อรายงาน</label>
            <input
              type="text"
              required
              disabled={!googleConnected || isUploading}
              placeholder="เช่น รายงานการสอนประจำสัปดาห์, แผนการจัดการเรียนรู้"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all text-slate-800 placeholder-slate-400 font-medium"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">ส่งไปยังฝ่ายงาน</label>
              <select
                required
                disabled={!googleConnected || isUploading}
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all text-slate-800 font-bold"
              >
                {DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">ชื่อผู้ส่งเอกสาร (คุณครู)</label>
              <select
                required
                disabled={!googleConnected || isUploading}
                value={uploader}
                onChange={(e) => setUploader(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all text-slate-800 font-bold"
              >
                <option value="">-- เลือกชื่อของคุณครูผู้ส่ง --</option>
                {/* Always make sure currentUser's full name is in dropdown as backup */}
                {currentUser && !teacherUsers.some(u => u.fullName === currentUser.fullName) && (
                  <option value={currentUser.fullName}>{currentUser.fullName}</option>
                )}
                {teacherUsers.map((user) => (
                  <option key={user.username} value={user.fullName}>
                    {user.fullName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">รายละเอียดเพิ่มเติม (ไม่บังคับ)</label>
            <textarea
              disabled={!googleConnected || isUploading}
              placeholder="ระบุข้อความ บันทึก หรือรายละเอียดเพิ่มเติมเกี่ยวกับเอกสารเล่มนี้..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all text-slate-800 placeholder-slate-400 font-medium"
            />
          </div>
        </div>

        {/* Drag and Drop Box */}
        <div
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => googleConnected && !isUploading && fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 text-center flex flex-col items-center justify-center transition-all ${
            !googleConnected || isUploading
              ? "bg-slate-50 border-slate-200 cursor-not-allowed opacity-60"
              : "border-indigo-200 bg-indigo-50/20 hover:bg-indigo-50/50 hover:border-indigo-400 cursor-pointer"
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            disabled={!googleConnected || isUploading}
            className="hidden"
          />

          {selectedFile ? (
            <div className="space-y-3 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
              <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl inline-flex items-center justify-center border border-indigo-100">
                <File className="w-10 h-10" />
              </div>
              <div>
                <p className="text-sm font-black text-slate-800 truncate" title={selectedFile.name}>
                  {selectedFile.name}
                </p>
                <p className="text-xs text-slate-500 mt-0.5 font-bold">
                  {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
              <button
                type="button"
                onClick={handleRemoveFile}
                className="inline-flex items-center space-x-1 px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 text-xs font-black rounded-xl transition-all border border-red-100 cursor-pointer uppercase tracking-wider"
              >
                <X className="w-3.5 h-3.5" />
                <span>ยกเลิกไฟล์</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="p-4 bg-slate-50 text-slate-400 rounded-2xl inline-flex items-center justify-center border border-slate-100">
                <UploadCloud className="w-10 h-10" />
              </div>
              <div>
                <p className="text-sm font-black text-slate-700">ลากและวางไฟล์ หรือคลิกเพื่อค้นหา</p>
                <p className="text-xs text-slate-400 mt-1 font-bold">รองรับไฟล์เอกสารทุกชนิด (PDF, Word, Excel, รูปภาพ และอื่นๆ)</p>
              </div>
            </div>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={!googleConnected || !selectedFile || isUploading}
          className="w-full py-4 px-6 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-100 disabled:text-slate-400 disabled:border-none disabled:shadow-none text-white font-black rounded-2xl shadow-md shadow-indigo-100 hover:shadow-xl transition-all flex items-center justify-center space-x-2 cursor-pointer uppercase tracking-wide"
        >
          {isUploading ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span>กำลังอัปโหลดไฟล์เข้าระบบ Google Drive...</span>
            </>
          ) : (
            <span>ยืนยันและเริ่มการอัปโหลดเอกสาร</span>
          )}
        </button>
      </form>
    </div>
  );
};
