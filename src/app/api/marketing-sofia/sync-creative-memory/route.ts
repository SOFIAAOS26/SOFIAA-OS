/**
 * POST /api/marketing-sofia/sync-creative-memory
 *
 * Auto-registra una SmmMetrica con retorno > 0 en prometeo_creative_memory.
 * Se llama automáticamente cuando el usuario guarda una métrica con retorno positivo.
 *
 * Body: { workspaceId, metrica: SmmMetrica }
 * Auth: Firebase ID token en Authorization header.
 *
 * Lógica:
 *   1. Calcula performanceScore desde ROAS, engagement y leads
 *   2. Mapea plataforma SMM → CanalMarketing PROMETEO
 *   3. Crea/actualiza el registro en prometeo_creative_memory
 */

import { NextRequest, NextResponse }  from "next/server";
import { getAuth }                    from "firebase-admin/auth";
import { getAdminApp, getAdminDb }    from "@/lib/firebase-admin";
import { FieldValue }                 from "firebase-admin/firestore";
import type { SmmMetrica }            from "@/lib/marketing/types";
import type { CreativeMemory, CanalMarketing, HookType, FormatoCreativo, TipoObjetivo } from "@/extensions/prometeo/schema";

// ── Mapeo de plataforma SMM → CanalMarketing PROMETEO ────────────────────────

const CANAL_MAP: Record<string, CanalMarketing> = {
  Instagram: "Instagram",
  Facebook:  "Facebook",
  TikTok:    "TikTok",
  YouTube:   "YouTube",
  LinkedIn:  "LinkedIn",
  Google:    "Google",
  X:         "Instagram",       // fallback
  Pinterest: "Instagram",       // fallback
};

// ── Hook default basado en plataforma ────────────────────────────────────────

function inferHookType(plataforma: string, engagementPct: number): HookType {
  if (plataforma === "TikTok" || plataforma === "Instagram") {
    return engagementPct > 0.05 ? "HISTORIA_CLIENTE" : "CIFRA_IMPACTANTE";
  }
  if (plataforma === "Google") return "PROBLEMA_SOLUCION";
  if (plataforma === "LinkedIn") return "CIFRA_IMPACTANTE";
  return "PREGUNTA_PROVOCADORA";
}

// ── Formato default basado en plataforma ─────────────────────────────────────

function inferFormato(plataforma: string): FormatoCreativo {
  if (plataforma === "TikTok") return "REEL";
  if (plataforma === "Instagram") return "REEL";
  if (plataforma === "YouTube") return "VIDEO";
  if (plataforma === "Facebook") return "VIDEO";
  return "IMAGEN";
}

// ── Objetivo inferido desde ROAS ──────────────────────────────────────────────

function inferObjetivo(roas: number, leads: number): TipoObjetivo {
  if (leads > 0)   return "CONVERSION";
  if (roas >= 2)   return "CONVERSION";
  if (roas >= 1)   return "CONSIDERACION";
  return "AWARENESS";
}

// ── Calcular Performance Score ────────────────────────────────────────────────

function calcPerformanceScore(roas: number, ctr: number, conversiones: number): number {
  // ROAS → max 40 pts
  const roasPts = roas >= 4 ? 40 : roas >= 3 ? 28 : roas >= 2 ? 16 : roas >= 1 ? 8 : 0;
  // CTR → max 30 pts
  const ctrPts  = ctr >= 0.05 ? 30 : ctr >= 0.03 ? 20 : ctr >= 0.01 ? 10 : 0;
  // Conversiones → max 20 pts (escala log)
  const convPts = conversiones >= 100 ? 20 : conversiones >= 30 ? 14 : conversiones >= 10 ? 8 : conversiones > 0 ? 4 : 0;
  // usarDeNuevo bonus → 10 pts (se otorga si score total ≥ 60)
  const base = roasPts + ctrPts + convPts;
  return Math.min(100, base >= 60 ? base + 10 : base);
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    getAdminApp();

    // ── Auth ──────────────────────────────────────────────────────
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) return NextResponse.json({ error: "No auth token" }, { status: 401 });

    try {
      await getAuth(getAdminApp()).verifyIdToken(token);
    } catch {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 });
    }

    // ── Body ──────────────────────────────────────────────────────
    const { workspaceId, metrica } = await req.json() as {
      workspaceId: string;
      metrica:     SmmMetrica;
    };

    if (!workspaceId || !metrica) {
      return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 });
    }

    if (!metrica.retorno || metrica.retorno <= 0) {
      return NextResponse.json({ ok: true, skipped: "Sin retorno" });
    }

    // ── Calcular métricas ─────────────────────────────────────────
    const roas        = metrica.invPubli > 0 ? metrica.retorno / metrica.invPubli : 0;
    const ctr         = metrica.engagementPct; // aproximación de CTR desde engagement
    const canal       = CANAL_MAP[metrica.plataforma] ?? "Instagram";
    const hookType    = inferHookType(metrica.plataforma, metrica.engagementPct);
    const formato     = inferFormato(metrica.plataforma);
    const objetivo    = inferObjetivo(roas, metrica.leads);
    const score       = calcPerformanceScore(roas, ctr, metrica.leads);
    const usarDeNuevo = score >= 60;

    const aprendizaje =
      `${metrica.plataforma} — ${metrica.mes}: ` +
      `ROAS ${roas.toFixed(2)}x, engagement ${(metrica.engagementPct * 100).toFixed(1)}%, ` +
      `${metrica.leads} leads con inversión $${metrica.invPubli.toLocaleString("es-MX")} MXN. ` +
      (usarDeNuevo ? "Alto performance — reutilizar estrategia." : "Performance moderado — revisar creativos.");

    // ID único por cliente + mes + plataforma
    const memId = `smm-${metrica.clienteId}-${metrica.mes}-${canal.toLowerCase()}`;

    const db = getAdminDb();
    const ref = db
      .collection("smm_workspaces")
      .doc(workspaceId)
      .collection("prometeo_creative_memory")
      .doc(memId);

    const payload: Omit<CreativeMemory, "id"> = {
      clienteId:        metrica.clienteId,
      workspaceId,
      hookType,
      hookTexto:        `Campaña ${metrica.plataforma} — ${metrica.mes}`,
      scriptTexto:      `Campaña auto-registrada desde Marketing Sofia. ${aprendizaje}`,
      formato,
      canal,
      roasLogrado:      parseFloat(roas.toFixed(2)),
      ctr:              parseFloat((ctr * 100).toFixed(2)),
      cpa:              metrica.leads > 0 ? parseFloat((metrica.invPubli / metrica.leads).toFixed(2)) : 0,
      alcance:          metrica.alcance,
      inversion:        metrica.invPubli,
      conversiones:     metrica.leads,
      industria:        "Auto-registrado",
      objetivoTipo:     objetivo,
      duracionDias:     30,
      performanceScore: score,
      aprendizaje,
      usarDeNuevo,
      createdAt:        Date.now(),
    };

    await ref.set({ ...payload, id: memId, updatedAt: FieldValue.serverTimestamp() }, { merge: true });

    return NextResponse.json({ ok: true, memId, score, roas: roas.toFixed(2) });
  } catch (err) {
    console.error("[MKT-SOFIA][sync-creative-memory]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
