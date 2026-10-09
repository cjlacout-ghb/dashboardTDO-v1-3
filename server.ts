import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("tramites.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS tramites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    distrito TEXT,
    td_no TEXT,
    exe_nro TEXT,
    tipo_tramite TEXT,
    TD_fecha_ingr TEXT,
    TD_fecha_autorizacion TEXT
  );
  UPDATE tramites SET tipo_tramite = 'TDO' WHERE UPPER(TRIM(tipo_tramite)) IN ('TRAMITE DIGITAL', 'TRÁMITE DIGITAL');
  UPDATE tramites SET tipo_tramite = 'TDO+PROYECTO' WHERE UPPER(TRIM(tipo_tramite)) IN ('TD+PROYECTO', 'TD + PROYECTO');
`);

try {
  db.exec(`ALTER TABLE tramites ADD COLUMN exe_nro TEXT;`);
} catch {
  // Column already exists
}

function normalizeTipo(raw: any): string {
  const s = String(raw || "").trim();
  const u = s.toUpperCase();
  if (u === 'TRAMITE DIGITAL' || u === 'TRÁMITE DIGITAL') return 'TDO';
  if (u === 'TD+PROYECTO' || u === 'TD + PROYECTO') return 'TDO+PROYECTO';
  if (u === 'TDO+TDI' || u === 'TDO + TDI') return 'TDO+TDI';
  return s;
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '50mb' }));

  function isValidAdminPassword(pwd: any): boolean {
    if (!pwd) return false;
    const clean = String(pwd).trim().toLowerCase();
    const allowed = ["clacout", "cjlacout"];
    if (process.env.ADMIN_PASSWORD) {
      allowed.push(process.env.ADMIN_PASSWORD.trim().toLowerCase());
    }
    return allowed.includes(clean);
  }

  // API Routes
  app.post("/api/auth", (req, res) => {
    const { password } = req.body;
    if (isValidAdminPassword(password)) {
      return res.json({ success: true });
    }
    return res.status(401).json({ error: "Contraseña incorrecta" });
  });

  app.get("/api/tramites", (req, res) => {
    try {
      const rows = db.prepare("SELECT * FROM tramites").all();
      res.json(rows);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch tramites" });
    }
  });

  app.post("/api/upload", (req, res) => {
    const { password, data } = req.body;

    if (!isValidAdminPassword(password)) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!Array.isArray(data) || data.length === 0) {
      return res.status(400).json({ error: "Invalid data format or empty data" });
    }

    try {
      const deleteStmt = db.prepare("DELETE FROM tramites");
      const insertStmt = db.prepare(`
        INSERT INTO tramites (distrito, td_no, exe_nro, tipo_tramite, TD_fecha_ingr, TD_fecha_autorizacion)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      const transaction = db.transaction((items) => {
        deleteStmt.run();
        for (const item of items) {
          const exeVal = String(item.exe_nro || item['EXE-NRO'] || item['exe-nro'] || item['EXE_NRO'] || item.exenro || "").trim();
          insertStmt.run(
            String(item.distrito || item.Distrito || "").trim(),
            String(item.td_no || item['tdo nº'] || item['tdo no'] || item.tdo || item['n° trámite'] || item['nº trámite'] || item.tramite || "").trim(),
            exeVal === 'null' || exeVal === 'undefined' ? '' : exeVal,
            normalizeTipo(item.tipo_tramite || item.tipo),
            String(item.TD_fecha_ingr || item.td_fecha_ingr || item.ingreso || "").trim(),
            String(item.TD_fecha_autorizacion || item.td_fecha_autorizacion || item.autorizacion || "").trim()
          );
        }
      });

      transaction(data);
      res.json({ success: true, count: data.length });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ error: "Failed to upload data" });
    }
  });

  // Vite middleware for development
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
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
