import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Set high limits for handling base64 file uploads
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

const DB_PATH = path.join(process.cwd(), "src", "data", "db.json");

// Ensure data folder exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initial DB template
interface DB {
  files: any[];
  users: any[];
  googleToken: {
    accessToken: string | null;
    email: string | null;
    expiryTime: string | null;
  };
  folders: Record<string, string>;
}

const initialDB: DB = {
  files: [],
  users: [
    { username: "admin", fullName: "ผู้ดูแลระบบ", role: "admin" } // Default fallback admin
  ],
  googleToken: {
    accessToken: null,
    email: null,
    expiryTime: null
  },
  folders: {}
};

// Read database
function readDB(): DB {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify(initialDB, null, 2), "utf-8");
    return initialDB;
  }
  try {
    const data = fs.readFileSync(DB_PATH, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    console.error("Error reading database file, resetting:", err);
    return initialDB;
  }
}

// Write database
function writeDB(data: DB) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing database:", err);
  }
}

// Initialize database
let db = readDB();

// Google Sheets & Drive Info
const SPREADSHEET_ID = "1aQ9jJ5F1dktUzm3LqU-6rYbycSTs2EoteGuHajTtzfQ";
const PARENT_DRIVE_FOLDER_ID = "1zTGB-0OFuZNmddiRxIZBuMcghilOHfTD";

const DEPARTMENTS = ["งานวิชาการ", "งานงบประมาณ", "งานบุคคล", "งานบริหารทั่วไป", "งานธุรการ"];

// Utility to make Google API requests using saved token
async function googleFetch(url: string, options: RequestInit = {}): Promise<any> {
  const currentDB = readDB();
  const token = currentDB.googleToken.accessToken;
  if (!token) {
    throw new Error("ไม่มีการเชื่อมต่อบัญชี Google (Google token is not set)");
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    ...options.headers,
  };

  const response = await fetch(url, { ...options, headers });
  
  if (response.status === 401) {
    // Clear expired token
    const dbUpdate = readDB();
    dbUpdate.googleToken.accessToken = null;
    dbUpdate.googleToken.email = null;
    dbUpdate.googleToken.expiryTime = null;
    writeDB(dbUpdate);
    throw new Error("สิทธิ์การใช้งาน Google หมดอายุ กรุณาลงชื่อเข้าใช้ใหม่อีกครั้ง");
  }

  if (!response.ok) {
    const errText = await response.text();
    console.error(`Google API Error from ${url}:`, errText);
    throw new Error(`Google API Error: ${response.status} - ${errText}`);
  }

  // Handle empty responses (like 204 No Content or DELETE)
  if (response.status === 204 || options.method === "DELETE") {
    return { success: true };
  }

  return response.json();
}

// Check or create department folders under PARENT_DRIVE_FOLDER_ID
async function checkAndCreateFolders(): Promise<Record<string, string>> {
  const currentDB = readDB();
  const foldersMap = { ...currentDB.folders };
  let updated = false;

  console.log("Checking department folders on Google Drive...");
  try {
    // List existing folders in parent
    const listUrl = `https://www.googleapis.com/drive/v3/files?q=mimeType='application/vnd.google-apps.folder'+and+'${PARENT_DRIVE_FOLDER_ID}'+in+parents+and+trashed=false&fields=files(id,name)`;
    const result = await googleFetch(listUrl);
    const existingFolders = result.files || [];

    for (const dept of DEPARTMENTS) {
      const match = existingFolders.find((f: any) => f.name === dept);
      if (match) {
        foldersMap[dept] = match.id;
      } else {
        console.log(`Creating folder '${dept}' inside parent...`);
        const createUrl = "https://www.googleapis.com/drive/v3/files";
        const folderMetadata = {
          name: dept,
          mimeType: "application/vnd.google-apps.folder",
          parents: [PARENT_DRIVE_FOLDER_ID],
        };
        const createdFolder = await googleFetch(createUrl, {
          method: "POST",
          body: JSON.stringify(folderMetadata),
        });
        foldersMap[dept] = createdFolder.id;
        updated = true;

        // Set permission of folder to anyone reader
        try {
          const permUrl = `https://www.googleapis.com/drive/v3/files/${createdFolder.id}/permissions`;
          await googleFetch(permUrl, {
            method: "POST",
            body: JSON.stringify({
              role: "reader",
              type: "anyone",
            }),
          });
        } catch (permErr) {
          console.error("Error setting folder permission:", permErr);
        }
      }
    }

    if (updated || Object.keys(currentDB.folders).length !== Object.keys(foldersMap).length) {
      const dbUpdate = readDB();
      dbUpdate.folders = foldersMap;
      writeDB(dbUpdate);
    }
    return foldersMap;
  } catch (error) {
    console.error("Error checking/creating folders:", error);
    return foldersMap;
  }
}

// Fetch Google Sheet user list without Auth (public fallback)
async function fetchSheetPublic(): Promise<any[]> {
  try {
    const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Public fetch failed");
    const text = await res.text();
    const jsonText = text.substring(text.indexOf("{"), text.lastIndexOf("}") + 1);
    const data = JSON.parse(jsonText);
    const rows = data.table.rows || [];
    
    const parsedUsers: any[] = [];
    rows.forEach((row: any, index: number) => {
      if (index === 0) return; // skip header row
      const cells = row.c || [];
      const username = cells[0]?.v ? String(cells[0].v).trim() : "";
      const password = cells[1]?.v ? String(cells[1].v).trim() : "";
      const fullName = cells[2]?.v ? String(cells[2].v).trim() : "";
      const role = cells[3]?.v ? String(cells[3].v).toLowerCase().trim() : "teacher";

      if (username && password && fullName) {
        parsedUsers.push({
          username,
          password,
          fullName,
          role: role === "admin" ? "admin" : "teacher"
        });
      }
    });

    return parsedUsers;
  } catch (err) {
    console.error("Error fetching public spreadsheet data:", err);
    return [];
  }
}

// Push local user list to Google Sheet
async function saveUsersToGoogleSheet(users: any[]) {
  try {
    const currentDB = readDB();
    if (!currentDB.googleToken.accessToken) {
      console.log("No Google token, skipping sync to Google Sheet");
      return;
    }

    console.log("Saving user list to Google Sheet...");
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/Sheet1!A1:D100?valueInputOption=USER_ENTERED`;
    
    const values = [
      ["Username", "Password", "FullName", "Role"],
      ...users.map(u => [u.username, u.password || "", u.fullName, u.role])
    ];

    await googleFetch(url, {
      method: "PUT",
      body: JSON.stringify({
        range: "Sheet1!A1:D100",
        majorDimension: "ROWS",
        values
      })
    });
    console.log("User list synced to Google Sheet successfully!");
  } catch (err) {
    console.error("Error updating Google Sheet:", err);
  }
}

// Sync users from Google Sheet
async function syncUsersFromGoogleSheet() {
  const currentDB = readDB();
  let users: any[] = [];

  if (currentDB.googleToken.accessToken) {
    try {
      console.log("Fetching users from Google Sheet via Auth API...");
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/Sheet1!A:D`;
      const result = await googleFetch(url);
      const rows = result.values || [];
      if (rows.length > 1) {
        users = rows.slice(1).map((row: any) => {
          return {
            username: row[0] ? String(row[0]).trim() : "",
            password: row[1] ? String(row[1]).trim() : "",
            fullName: row[2] ? String(row[2]).trim() : "",
            role: row[3] && String(row[3]).trim().toLowerCase() === "admin" ? "admin" : "teacher"
          };
        }).filter((u: any) => u.username && u.fullName);
      }
    } catch (err) {
      console.error("Auth-based Sheet sync failed, falling back to public sync:", err);
      users = await fetchSheetPublic();
    }
  } else {
    users = await fetchSheetPublic();
  }

  if (users.length > 0) {
    const dbUpdate = readDB();
    dbUpdate.users = users;
    writeDB(dbUpdate);
    console.log(`Synced ${users.length} users into local DB`);
  }
}

// -------------------------------------------------------------
// API Endpoints
// -------------------------------------------------------------

// Public files metadata list
app.get("/api/files", (req, res) => {
  const currentDB = readDB();
  res.json({ files: currentDB.files });
});

// Admin Google Status
app.get("/api/admin/google-status", (req, res) => {
  const currentDB = readDB();
  const tokenData = currentDB.googleToken;
  res.json({
    connected: !!tokenData.accessToken,
    email: tokenData.email || null,
    expiryTime: tokenData.expiryTime || null,
  });
});

// Admin save Google OAuth access token
app.post("/api/admin/save-token", async (req, res) => {
  const { accessToken, email, expiryTime } = req.body;
  if (!accessToken) {
    return res.status(400).json({ error: "Access token is required" });
  }

  try {
    const dbUpdate = readDB();
    dbUpdate.googleToken = {
      accessToken,
      email: email || "Connected Google User",
      expiryTime: expiryTime || null,
    };
    writeDB(dbUpdate);

    // Run background folder creation check and user sync
    console.log("Initializing folders and syncing users with new Google token...");
    await checkAndCreateFolders();
    await syncUsersFromGoogleSheet();

    res.json({ success: true, message: "เชื่อมต่อกับระบบ Google สำเร็จเรียบร้อยแล้ว!" });
  } catch (err: any) {
    console.error("Error setting Google token:", err);
    res.status(500).json({ error: err.message });
  }
});

// Sync users route
app.post("/api/users/sync", async (req, res) => {
  try {
    await syncUsersFromGoogleSheet();
    const currentDB = readDB();
    res.json({ success: true, users: currentDB.users });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// User login endpoint
app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "กรุณากรอก Username และ Password" });
  }

  // Admin bypass
  if (password === "Huaimun1234" && (username.toLowerCase() === "admin" || username.trim() !== "")) {
    return res.json({
      success: true,
      user: {
        username: "admin",
        fullName: "ผู้ดูแลระบบ (Admin)",
        role: "admin",
      },
    });
  }

  // Find user in DB
  const currentDB = readDB();
  const user = currentDB.users.find(
    (u) => u.username.toLowerCase() === username.toLowerCase() && u.password === password
  );

  if (user) {
    return res.json({
      success: true,
      user: {
        username: user.username,
        fullName: user.fullName,
        role: user.role,
      },
    });
  }

  res.status(401).json({ error: "Username หรือ Password ไม่ถูกต้อง" });
});

// Fetch user list (Admin only)
app.get("/api/users", (req, res) => {
  const currentDB = readDB();
  res.json({ users: currentDB.users });
});

// Add new user (Admin only)
app.post("/api/users", async (req, res) => {
  const { username, password, fullName, role } = req.body;

  if (!username || !password || !fullName) {
    return res.status(400).json({ error: "กรุณากรอกข้อมูลให้ครบถ้วน" });
  }

  const dbUpdate = readDB();
  const exists = dbUpdate.users.some(u => u.username.toLowerCase() === username.toLowerCase());
  if (exists) {
    return res.status(400).json({ error: "Username นี้มีอยู่ในระบบแล้ว" });
  }

  const newUser = {
    username: username.trim(),
    password: password.trim(),
    fullName: fullName.trim(),
    role: role === "admin" ? "admin" : "teacher",
  };

  dbUpdate.users.push(newUser);
  writeDB(dbUpdate);

  // Sync to Google Sheet asynchronously
  await saveUsersToGoogleSheet(dbUpdate.users);

  res.json({ success: true, user: newUser });
});

// Edit user (Admin only)
app.put("/api/users/:username", async (req, res) => {
  const { username } = req.params;
  const { password, fullName, role } = req.body;

  const dbUpdate = readDB();
  const index = dbUpdate.users.findIndex(u => u.username.toLowerCase() === username.toLowerCase());

  if (index === -1) {
    return res.status(404).json({ error: "ไม่พบผู้ใช้ในระบบ" });
  }

  dbUpdate.users[index] = {
    ...dbUpdate.users[index],
    password: password ? password.trim() : dbUpdate.users[index].password,
    fullName: fullName ? fullName.trim() : dbUpdate.users[index].fullName,
    role: role ? role : dbUpdate.users[index].role,
  };

  writeDB(dbUpdate);

  // Sync to Google Sheet
  await saveUsersToGoogleSheet(dbUpdate.users);

  res.json({ success: true, user: dbUpdate.users[index] });
});

// Delete user (Admin only)
app.delete("/api/users/:username", async (req, res) => {
  const { username } = req.params;

  const dbUpdate = readDB();
  const filtered = dbUpdate.users.filter(u => u.username.toLowerCase() !== username.toLowerCase());

  if (filtered.length === dbUpdate.users.length) {
    return res.status(404).json({ error: "ไม่พบผู้ใช้ในระบบ" });
  }

  dbUpdate.users = filtered;
  writeDB(dbUpdate);

  // Sync to Google Sheet
  await saveUsersToGoogleSheet(dbUpdate.users);

  res.json({ success: true, message: "ลบผู้ใช้งานสำเร็จแล้ว" });
});

// Upload file to Google Drive & Save metadata
app.post("/api/files", async (req, res) => {
  const { name, department, uploader, uploaderUsername, description, base64Data, mimeType } = req.body;

  if (!name || !department || !uploader || !base64Data) {
    return res.status(400).json({ error: "กรุณากรอกข้อมูลและเลือกไฟล์ให้ถูกต้อง" });
  }

  const currentDB = readDB();
  if (!currentDB.googleToken.accessToken) {
    return res.status(400).json({ error: "ระบบยังไม่ได้เชื่อมต่อ Google Drive กรุณาแจ้งผู้ดูแลระบบ" });
  }

  try {
    // 1. Ensure folder mapping exists
    let folderId = currentDB.folders[department];
    if (!folderId) {
      const freshFolders = await checkAndCreateFolders();
      folderId = freshFolders[department] || PARENT_DRIVE_FOLDER_ID;
    }

    // 2. Decode base64 file data
    const commaIndex = base64Data.indexOf(",");
    const pureBase64 = commaIndex !== -1 ? base64Data.substring(commaIndex + 1) : base64Data;
    const fileBuffer = Buffer.from(pureBase64, "base64");

    // 3. Prepare multipart body for Google Drive upload API
    const boundary = "-------314159265358979323846";
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const metadata = {
      name: name,
      parents: [folderId],
    };

    const multipartBody = Buffer.concat([
      Buffer.from(delimiter + 'Content-Type: application/json; charset=UTF-8\r\n\r\n' + JSON.stringify(metadata) + '\r\n'),
      Buffer.from(delimiter + `Content-Type: ${mimeType || "application/octet-stream"}\r\nContent-Transfer-Encoding: base64\r\n\r\n`),
      Buffer.from(pureBase64),
      Buffer.from(closeDelimiter)
    ]);

    console.log(`Uploading file '${name}' to Drive folder '${department}' (${folderId})...`);
    
    const uploadUrl = "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink,webContentLink";
    const uploadResult = await googleFetch(uploadUrl, {
      method: "POST",
      headers: {
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body: multipartBody,
    });

    const fileId = uploadResult.id;
    if (!fileId) {
      throw new Error("ล้มเหลวในการสร้างไฟล์บน Google Drive");
    }

    // 4. Set permission to reader for anyone (public share link works)
    try {
      const permUrl = `https://www.googleapis.com/drive/v3/files/${fileId}/permissions`;
      await googleFetch(permUrl, {
        method: "POST",
        body: JSON.stringify({
          role: "reader",
          type: "anyone",
        }),
      });
    } catch (permErr) {
      console.error("Could not set anyone-reader permission:", permErr);
    }

    // Get direct share links
    const driveUrl = uploadResult.webViewLink || `https://drive.google.com/file/d/${fileId}/view?usp=drivesdk`;

    // 5. Add file record to DB
    const newFile = {
      id: fileId,
      name,
      department,
      uploader,
      uploaderUsername: uploaderUsername || "unknown",
      uploadDate: new Date().toISOString(),
      driveUrl,
      fileType: mimeType ? mimeType.split("/")[1] || "file" : "file",
      description: description || "",
    };

    const dbUpdate = readDB();
    dbUpdate.files.unshift(newFile);
    writeDB(dbUpdate);

    res.json({ success: true, file: newFile });
  } catch (error: any) {
    console.error("Error uploading file:", error);
    res.status(500).json({ error: error.message || "เกิดข้อผิดพลาดในการอัพโหลดไฟล์" });
  }
});

// Edit file metadata (Admin or owner)
app.put("/api/files/:id", (req, res) => {
  const { id } = req.params;
  const { name, department, description } = req.body;

  const dbUpdate = readDB();
  const index = dbUpdate.files.findIndex(f => f.id === id);

  if (index === -1) {
    return res.status(404).json({ error: "ไม่พบข้อมูลไฟล์ในระบบ" });
  }

  dbUpdate.files[index] = {
    ...dbUpdate.files[index],
    name: name ? name.trim() : dbUpdate.files[index].name,
    department: department ? department.trim() : dbUpdate.files[index].department,
    description: description !== undefined ? description.trim() : dbUpdate.files[index].description,
  };

  writeDB(dbUpdate);
  res.json({ success: true, file: dbUpdate.files[index] });
});

// Delete file from Google Drive and DB (Admin only)
app.delete("/api/files/:id", async (req, res) => {
  const { id } = req.params;

  const dbUpdate = readDB();
  const index = dbUpdate.files.findIndex(f => f.id === id);

  if (index === -1) {
    return res.status(404).json({ error: "ไม่พบข้อมูลไฟล์ในระบบ" });
  }

  // 1. Delete from Google Drive
  try {
    if (dbUpdate.googleToken.accessToken) {
      console.log(`Deleting file '${id}' from Google Drive...`);
      const deleteUrl = `https://www.googleapis.com/drive/v3/files/${id}`;
      await googleFetch(deleteUrl, { method: "DELETE" });
    }
  } catch (err) {
    console.error(`Failed to delete file ${id} from Google Drive:`, err);
    // Continue deleting from local database even if Drive fails, to prevent broken UI
  }

  // 2. Remove from DB
  const removedFile = dbUpdate.files.splice(index, 1)[0];
  writeDB(dbUpdate);

  res.json({ success: true, message: `ลบไฟล์ '${removedFile.name}' สำเร็จเรียบร้อยแล้ว` });
});

// Trigger initial sync of user list on backend start
syncUsersFromGoogleSheet().catch(err => {
  console.error("Initial Google Sheet sync failed on boot:", err);
});

// -------------------------------------------------------------
// Vite server integration
// -------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT} in ${process.env.NODE_ENV || "development"} mode`);
  });
}

startServer();
