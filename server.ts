import express from "express";
import { createServer as createViteServer } from "vite";
import { exec } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route to call the Python Compiler
  app.post("/api/compile", (req, res) => {
    const { expression } = req.body;
    
    if (!expression) {
      return res.status(400).json({ error: "Expression is required" });
    }

    // Escape single quotes for shell command (basic protection)
    const escapedExpr = expression.replace(/'/g, "\\'");
    const command = `python3 compiler.py '${escapedExpr}' --json`;

    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Exec error: ${error}`);
        return res.status(500).json({ error: "Internal Server Error during compilation" });
      }
      
      try {
        const result = JSON.parse(stdout);
        res.json(result);
      } catch (parseError) {
        console.error(`Parse error: ${parseError}, stdout: ${stdout}`);
        res.status(500).json({ error: "Failed to parse compiler output" });
      }
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
