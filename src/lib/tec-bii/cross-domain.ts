/**
 * TEC Bii — Cross-Domain Reasoning Engine (Sprint T2-4)
 * RUMBO A TIER 4
 *
 * Conecta capturas de NEXO con entidades TEC Bii mediante:
 * 1. Comparación de embeddings (cosine similarity)
 * 2. Detección de pares con similitud > CROSS_DOMAIN_THRESHOLD
 * 3. Generación de hipótesis en lenguaje natural con Gemini Flash
 * 4. Persistencia en la entidad TEC Bii (campo `hypotheses` + `linkedNexoNodes`)
 *
 * Solo corre en contexto servidor.
 */

import { getAdminDb }         from "@/lib/firebase-admin";
import { nexoNodesCol }       from "@/lib/nexo/firestore";
import { cosineSimilarity }   from "@/lib/nexo/embeddings";
import { tecBiiPath }         from "@/lib/tec-bii/collections";
import { callGroq }           from "@/lib/groq";
import type { NexoNode }      from "@/types/nexo";
import type {
  Hypothesis, TecBiiEntityType,
} from "@/extensions/tec-bii/schema";

// ── Configuración ─────────────────────────────────────────────────────────────

/** Umbral de similitud coseno para considerar un par como relacionado */
const CROSS_DOMAIN_THRESHOLD = 0.60;

/** Máximo de capturas a comparar por sesión (evitar costo excesivo) */
const MAX_CAPTURED_NODES = 30;

/** Máximo de TEC Bii entities a comparar */
const MAX_TEC_BII_NODES = 20;

/** Máximo de hipótesis a generar por entidad */
const MAX_HYPOTHESES_PER_ENTITY = 3;

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface CrossDomainPair {
  tecBiiNodeId:   string;
  capturedNodeId: string;
  similarity:     number;
  entityType:     TecBiiEntityType;
  entityId:       string;
  entityTitle:    string;
  capturedTitle:  string;
  capturedSummary: string;
}

export interface CrossDomainResult {
  pairsDetected:     number;
  hypothesesCreated: number;
  entitiesUpdated:   number;
  hypotheses:        Array<{
    entityTitle: string;
    entityType:  TecBiiEntityType;
    hypothesis:  Hypothesis;
  }>;
}

// ── Extraer tipo y id del nodeId ──────────────────────────────────────────────

function parseTecBiiNodeId(nodeId: string): { type: TecBiiEntityType; id: string } | null {
  // formato: "tec-bii:{type}:{entityId}"
  const parts = nodeId.split(":");
  if (parts.length !== 3 || parts[0] !== "tec-bii") return null;
  const type = parts[1] as TecBiiEntityType;
  const id   = parts[2];
  if (!type || !id) return null;
  return { type, id };
}

// ── Generación de hipótesis con Gemini ───────────────────────────────────────

async function generateHypothesis(
  entityTitle:   string,
  entitySummary: string,
  captures:      Array<{ title: string; summary: string; similarity: number }>,
): Promise<string | null> {
  const capturesText = captures
    .map((c, i) => `${i + 1}. "${c.title}" (similitud: ${Math.round(c.similarity * 100)}%)\n   ${c.summary}`)
    .join("\n\n");

  const prompt = `Eres el motor de razonamiento cruzado de SOFIAA, un sistema cognitivo del Área de Producción Audiovisual del TEC de Monterrey.

Has detectado una conexión semántica entre una entidad del sistema TEC Bii y capturas del usuario en NEXO (páginas web, documentos, referencias guardadas).

ENTIDAD TEC BII:
"${entityTitle}"
${entitySummary}

CAPTURAS NEXO RELACIONADAS:
${capturesText}

Genera una hipótesis de razonamiento cruzado en 1-2 oraciones. La hipótesis debe:
- Conectar concretamente qué relación existe entre la entidad y las capturas
- Ser específica y accionable (ej: "El usuario está investigando equipos Sony probablemente para el proyecto de campaña audiovisual")
- Estar en español, tono profesional

Responde SOLO con el texto de la hipótesis, sin comillas ni formato adicional.`;

  const result = await callGroq(prompt, { maxTokens: 150, temperature: 0.5 });
  return result?.trim() ?? null;
}

// ── Motor principal ───────────────────────────────────────────────────────────

/**
 * Ejecuta el análisis de razonamiento cruzado para un usuario.
 *
 * 1. Lee todos los nodos NEXO del usuario
 * 2. Separa TEC Bii nodes vs captured nodes
 * 3. Para cada par con similitud > threshold → candidato
 * 4. Agrupa candidatos por entidad TEC Bii
 * 5. Genera hipótesis con Gemini Flash por entidad
 * 6. Persiste en Firestore
 */
export async function runCrossDomainAnalysis(uid: string): Promise<CrossDomainResult> {
  const db    = getAdminDb();
  const now   = Date.now();
  const result: CrossDomainResult = {
    pairsDetected:     0,
    hypothesesCreated: 0,
    entitiesUpdated:   0,
    hypotheses:        [],
  };

  // 1. Leer todos los nodos NEXO con embedding
  const allSnap = await db
    .collection(nexoNodesCol(uid))
    .orderBy("lastReinforced", "desc")
    .limit(MAX_CAPTURED_NODES + MAX_TEC_BII_NODES)
    .get();

  if (allSnap.empty) return result;

  const allNodes = allSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as NexoNode);

  // 2. Separar TEC Bii vs capturados
  const tecBiiNodes   = allNodes.filter((n) => n.source === "tec_bii" && n.embedding).slice(0, MAX_TEC_BII_NODES);
  const capturedNodes = allNodes.filter((n) => n.source !== "tec_bii" && n.embedding).slice(0, MAX_CAPTURED_NODES);

  if (tecBiiNodes.length === 0 || capturedNodes.length === 0) return result;

  // 3. Calcular similitudes y detectar pares relevantes
  // Agrupar por entidad TEC Bii
  const entityCandidates = new Map<string, {
    entityId:    string;
    entityType:  TecBiiEntityType;
    entityTitle: string;
    entitySummary: string;
    captures:    Array<{ nodeId: string; title: string; summary: string; similarity: number }>;
  }>();

  for (const tecNode of tecBiiNodes) {
    const parsed = parseTecBiiNodeId(tecNode.id);
    if (!parsed) continue;

    const candidates: Array<{ nodeId: string; title: string; summary: string; similarity: number }> = [];

    for (const cap of capturedNodes) {
      if (!tecNode.embedding || !cap.embedding) continue;
      const sim = cosineSimilarity(tecNode.embedding, cap.embedding);
      if (sim >= CROSS_DOMAIN_THRESHOLD) {
        candidates.push({
          nodeId:     cap.id,
          title:      cap.title,
          summary:    cap.summary?.slice(0, 200) ?? "",
          similarity: sim,
        });
        result.pairsDetected++;
      }
    }

    if (candidates.length > 0) {
      // Ordenar por similitud desc, tomar los top
      candidates.sort((a, b) => b.similarity - a.similarity);
      entityCandidates.set(tecNode.id, {
        entityId:     parsed.id,
        entityType:   parsed.type,
        entityTitle:  tecNode.title,
        entitySummary: tecNode.summary ?? "",
        captures:     candidates.slice(0, MAX_HYPOTHESES_PER_ENTITY),
      });
    }
  }

  if (entityCandidates.size === 0) return result;

  // 4. Generar hipótesis por entidad y persistir
  for (const [tecNodeId, entry] of entityCandidates) {
    const hypothesisText = await generateHypothesis(
      entry.entityTitle,
      entry.entitySummary,
      entry.captures,
    );

    if (!hypothesisText) continue;

    const avgConfidence = entry.captures.reduce((s, c) => s + c.similarity, 0) / entry.captures.length;

    const hypothesis: Hypothesis = {
      id:          `xd-${now}-${entry.entityId.slice(-6)}`,
      text:        hypothesisText,
      confidence:  parseFloat(avgConfidence.toFixed(3)),
      sources:     [tecNodeId, ...entry.captures.map((c) => c.nodeId)],
      generatedAt: now,
    };

    // Persistir en el documento de la entidad TEC Bii
    try {
      const docRef = db
        .collection(tecBiiPath(uid, entry.entityType))
        .doc(entry.entityId);

      const docSnap = await docRef.get();
      if (!docSnap.exists) continue;

      const current = docSnap.data() as { hypotheses?: Hypothesis[]; linkedNexoNodes?: string[] };

      // Evitar duplicados: no agregar hipótesis si ya existe una con los mismos sources
      const existingHypotheses = current.hypotheses ?? [];
      const alreadyExists = existingHypotheses.some((h) =>
        h.sources.length === hypothesis.sources.length &&
        h.sources[0] === hypothesis.sources[0]
      );
      if (alreadyExists) continue;

      // Mantener máximo 5 hipótesis por entidad (FIFO)
      const updatedHypotheses = [...existingHypotheses, hypothesis].slice(-5);

      // Actualizar linkedNexoNodes
      const currentLinked   = new Set(current.linkedNexoNodes ?? []);
      entry.captures.forEach((c) => currentLinked.add(c.nodeId));

      await docRef.update({
        hypotheses:       updatedHypotheses,
        linkedNexoNodes:  Array.from(currentLinked),
        lastCognitiveSync: now,
      });

      result.hypothesesCreated++;
      result.entitiesUpdated++;
      result.hypotheses.push({
        entityTitle: entry.entityTitle,
        entityType:  entry.entityType,
        hypothesis,
      });
    } catch {
      // Entidad no encontrada o error de escritura — continuar
    }
  }

  return result;
}
