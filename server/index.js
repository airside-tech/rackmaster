import express from "express";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, "..");
const dataDir = process.env.RACKMASTER_DATA_DIR
    ? path.resolve(process.env.RACKMASTER_DATA_DIR)
    : path.resolve(__dirname, "data");
const catalogPath = process.env.RACKMASTER_CATALOG_PATH
    ? path.resolve(process.env.RACKMASTER_CATALOG_PATH)
    : path.join(dataDir, "catalog.json");
const port = Number(process.env.PORT) || 3000;
const lockTtlMs = Number(process.env.RACKMASTER_LOCK_TTL_MS) || 15 * 60 * 1000;

const rackLocks = new Map();

const app = express();

app.use(express.json({ limit: "10mb" }));
app.use(express.static(workspaceRoot));

async function ensureCatalogFile() {
    await fs.mkdir(path.dirname(catalogPath), { recursive: true });
    try {
        await fs.access(catalogPath);
    } catch (_error) {
        await fs.writeFile(catalogPath, JSON.stringify({ rooms: [] }, null, 2), "utf8");
    }
}

function normalizeCatalog(payload) {
    const rooms = Array.isArray(payload?.rooms) ? payload.rooms : [];
    return { rooms };
}

function cleanupExpiredLocks() {
    const now = Date.now();
    for (const [rackId, lock] of rackLocks.entries()) {
        if (!lock || lock.expiresAt <= now) {
            rackLocks.delete(rackId);
        }
    }
}

function getCurrentLock(rackId) {
    cleanupExpiredLocks();
    return rackLocks.get(rackId) || null;
}

function toLockResponse(lock) {
    return {
        rackId: lock.rackId,
        owner: lock.owner,
        acquiredAt: lock.acquiredAt,
        expiresAt: lock.expiresAt
    };
}

app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
});

app.get("/api/catalog", async (_req, res) => {
    try {
        await ensureCatalogFile();
        const raw = await fs.readFile(catalogPath, "utf8");
        const parsed = normalizeCatalog(JSON.parse(raw));
        res.json(parsed);
    } catch (error) {
        res.status(500).json({ error: `Could not read catalog: ${error.message}` });
    }
});

app.put("/api/catalog", async (req, res) => {
    try {
        const normalized = normalizeCatalog(req.body);
        await ensureCatalogFile();
        await fs.writeFile(catalogPath, JSON.stringify(normalized, null, 2), "utf8");
        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ error: `Could not write catalog: ${error.message}` });
    }
});

app.get("/api/locks", (_req, res) => {
    cleanupExpiredLocks();
    const locks = Array.from(rackLocks.values()).map(toLockResponse);
    res.json({ locks });
});

app.post("/api/lock/rack/:rackId", (req, res) => {
    const rackId = String(req.params.rackId || "").trim();
    const owner = String(req.body?.owner || "").trim();
    if (!rackId) {
        res.status(400).json({ locked: false, message: "Rack ID is required." });
        return;
    }
    if (!owner) {
        res.status(400).json({ locked: false, message: "Owner is required." });
        return;
    }

    const now = Date.now();
    const existing = getCurrentLock(rackId);
    if (existing && existing.owner !== owner) {
        res.status(409).json({
            locked: false,
            message: `Rack is locked by ${existing.owner}.`,
            lock: toLockResponse(existing)
        });
        return;
    }

    const nextLock = existing && existing.owner === owner
        ? {
            ...existing,
            expiresAt: now + lockTtlMs
        }
        : {
            rackId,
            owner,
            acquiredAt: now,
            expiresAt: now + lockTtlMs
        };

    rackLocks.set(rackId, nextLock);
    res.json({
        locked: true,
        message: existing ? "Lock renewed." : "Lock acquired.",
        lock: toLockResponse(nextLock)
    });
});

app.post("/api/lock/rack/:rackId/heartbeat", (req, res) => {
    const rackId = String(req.params.rackId || "").trim();
    const owner = String(req.body?.owner || "").trim();
    const existing = getCurrentLock(rackId);

    if (!existing || existing.owner !== owner) {
        res.status(409).json({ locked: false, message: "Lock no longer held." });
        return;
    }

    existing.expiresAt = Date.now() + lockTtlMs;
    rackLocks.set(rackId, existing);
    res.json({ locked: true, lock: toLockResponse(existing) });
});

app.post("/api/unlock/rack/:rackId", (req, res) => {
    const rackId = String(req.params.rackId || "").trim();
    const owner = String(req.body?.owner || "").trim();
    const existing = getCurrentLock(rackId);

    if (!existing) {
        res.json({ unlocked: true, message: "Rack was already unlocked." });
        return;
    }

    if (existing.owner !== owner) {
        res.status(409).json({ unlocked: false, message: `Rack lock is held by ${existing.owner}.` });
        return;
    }

    rackLocks.delete(rackId);
    res.json({ unlocked: true, message: "Lock released." });
});

app.listen(port, async () => {
    await ensureCatalogFile();
    console.log(`RackMaster server running on http://localhost:${port}`);
    console.log(`Catalog path: ${catalogPath}`);
});
