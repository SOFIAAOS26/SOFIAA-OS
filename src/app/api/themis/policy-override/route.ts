/**
 * SOFIAA THEMIS — Sprint T-3
 * GET + POST /api/themis/policy-override
 *
 * GET  — devuelve todas las políticas del registry con su estado de override actual
 * POST — activa o desactiva una política individual (admin-only)
 *
 * Autenticación: Firebase ID token + isAdmin (email allowlist)
 * Persistencia:  Firestore Admin SDK → system/themis → campo overrides
 *
 * POST body: { policyId: string, enabled: boolean, note?: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuth }     from "firebase-admin/auth";
import { getAdminApp } from "@/lib/firebase-admin";
import { getAllPolicies } from "@/core/cognitive.policy";
import { invalidateOverridesCache } from "@/core/themis";

/** Estructura completa guardada en Firestore por override */
interface StoredOverride {
  enabled:   boolean;
  note:      string;
  updatedAt: string;
  updatedBy: string;
}

type StoredOverridesMap = Record<string, StoredOverride>;

// ── Admin emails — duplica isAdmin() de firestore.rules ──────────────────
const ADMIN_EMAILS = ["u.cannmx@gmail.com", "benjacob.urrutia@gmail.com"];

// ── Auth helper ───────────────────────────────────────────────────────────

async function verifyAdmin(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get("Authorization") ?? "";
  const token      = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return null;

  try {
    const decoded = await getAuth(getAdminApp()).verifyIdToken(token);
    if (!decoded.email || !ADMIN_EMAILS.includes(decoded.email)) return null;
    return decoded.email;
  } catch {
    return null;
  }
}

// ── Firestore helpers ─────────────────────────────────────────────────────

async function readOverrides(): Promise<StoredOverridesMap> {
  const { adminDb } = await import("@/lib/firebase-admin");
  const snap = await adminDb.collection("system").doc("themis").get();
  if (!snap.exists) return {};
  const data = snap.data() as { overrides?: StoredOverridesMap };
  return data.overrides ?? {};
}

async function writeOverride(
  policyId: string,
  enabled:  boolean,
  note:     string,
  updatedBy: string
): Promise<void> {
  const { adminDb } = await import("@/lib/firebase-admin");
  await adminDb.collection("system").doc("themis").set(
    {
      overrides: {
        [policyId]: { enabled, note, updatedAt: new Date().toISOString(), updatedBy },
      },
    },
    { merge: true }
  );
  // Invalidar cache inmediatamente — el próximo request lee fresco
  invalidateOverridesCache();
}

// ── GET ───────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const adminEmail = await verifyAdmin(req);
  if (!adminEmail) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const [allPolicies, overrides] = await Promise.all([
      Promise.resolve(getAllPolicies()),
      readOverrides(),
    ]);

    const result = allPolicies.map((p) => ({
      id:          p.id,
      name:        p.name,
      scope:       p.scope,
      priority:    p.priority,
      appliesTo:   p.appliesTo ?? [],
      constraints: p.constraints.map((c) => ({
        id:          c.id,
        severity:    c.severity,
        instruction: c.instruction,
      })),
      // Override actual
      enabled:   overrides[p.id]?.enabled ?? true, // por defecto activo
      note:      overrides[p.id]?.note ?? "",
      updatedAt: overrides[p.id]?.updatedAt ?? null,
      updatedBy: overrides[p.id]?.updatedBy ?? null,
    }));

    return NextResponse.json({ policies: result }, { status: 200 });
  } catch (err) {
    console.error("[THEMIS][policy-override GET]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// ── POST ──────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const adminEmail = await verifyAdmin(req);
  if (!adminEmail) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const policyId = String(b.policyId ?? "").trim();
  const enabled  = Boolean(b.enabled ?? true);
  const note     = String(b.note ?? "").slice(0, 300);

  if (!policyId) {
    return NextResponse.json({ error: "policyId requerido" }, { status: 400 });
  }

  // Verificar que la política existe en el registry
  const allPolicies = getAllPolicies();
  const exists = allPolicies.some((p) => p.id === policyId);
  if (!exists) {
    return NextResponse.json({ error: `Política '${policyId}' no existe en el registry` }, { status: 404 });
  }

  // No permitir deshabilitar privacy_guard — es un escudo crítico
  if (policyId === "privacy_guard" && !enabled) {
    return NextResponse.json(
      { error: "privacy_guard no puede deshabilitarse — es un escudo de seguridad crítico" },
      { status: 403 }
    );
  }

  try {
    await writeOverride(policyId, enabled, note, adminEmail);
    return NextResponse.json(
      { ok: true, policyId, enabled, note, updatedBy: adminEmail },
      { status: 200 }
    );
  } catch (err) {
    console.error("[THEMIS][policy-override POST]", err);
    return NextResponse.json({ error: "Error al guardar override" }, { status: 500 });
  }
}
