import { getCatalogStorageMode } from "../storage.js";

const lockOwnerStorageKey = "rackplanner.lock-owner.v1";

function isApiMode() {
    return getCatalogStorageMode() === "api";
}

export function isLockingEnabled() {
    return isApiMode();
}

export function getStoredLockOwner() {
    return String(localStorage.getItem(lockOwnerStorageKey) || "").trim();
}

export function ensureLockOwner() {
    const existing = getStoredLockOwner();
    if (existing) {
        return existing;
    }

    const input = window.prompt("Enter your name or initials for rack lock ownership:", "");
    const owner = String(input || "").trim();
    if (!owner) {
        return "";
    }

    localStorage.setItem(lockOwnerStorageKey, owner);
    return owner;
}

export async function acquireRackLock(rackId, owner) {
    const response = await fetch(`/api/lock/rack/${encodeURIComponent(rackId)}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
        },
        body: JSON.stringify({ owner })
    });

    const body = await response.json();
    if (!response.ok) {
        return {
            locked: false,
            message: body?.message || `Lock request failed (${response.status}).`,
            lock: body?.lock || null
        };
    }

    return {
        locked: Boolean(body?.locked),
        message: body?.message || "Lock acquired.",
        lock: body?.lock || null
    };
}

export async function sendLockHeartbeat(rackId, owner) {
    const response = await fetch(`/api/lock/rack/${encodeURIComponent(rackId)}/heartbeat`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
        },
        body: JSON.stringify({ owner })
    });

    const body = await response.json();
    return {
        ok: response.ok,
        message: body?.message || "",
        lock: body?.lock || null
    };
}

export async function releaseRackLock(rackId, owner) {
    const response = await fetch(`/api/unlock/rack/${encodeURIComponent(rackId)}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
        },
        body: JSON.stringify({ owner })
    });

    const body = await response.json();
    return {
        ok: response.ok,
        message: body?.message || ""
    };
}
