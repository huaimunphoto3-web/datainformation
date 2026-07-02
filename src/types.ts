export interface FileRecord {
  id: string; // unique ID or Google Drive File ID
  name: string; // File name/title
  uploader: string; // Teacher's full name
  uploaderUsername: string; // Teacher's username
  department: string; // งานวิชาการ, งานงบประมาณ, งานบุคคล, งานบริหารทั่วไป, งานธุรการ
  uploadDate: string; // ISO string
  driveUrl: string; // link to view/download file
  fileType?: string; // pdf, doc, xls, image, etc.
  description?: string; // optional description
}

export interface UserRecord {
  username: string;
  password?: string;
  fullName: string;
  role: 'teacher' | 'admin';
}

export interface GoogleConnectionStatus {
  connected: boolean;
  email?: string;
  expiryTime?: string;
}
