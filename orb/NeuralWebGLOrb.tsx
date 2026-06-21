/**
 * NeuralWebGLOrb.tsx
 *
 * Orbe Neuronal 3D para SofiaA OS
 * Stack: React 19 · Next.js 16 · R3F · Three.js · @react-three/postprocessing
 *
 * Instalar antes de usar:
 *   npm install three @react-three/fiber @react-three/postprocessing
 *   npm install -D @types/three
 *   (añadir --legacy-peer-deps si hay conflicto con React 19)
 *
 * Montar en Next.js con SSR desactivado:
 *   const NeuralWebGLOrb = dynamic(() => import('@/components/NeuralWebGLOrb'), { ssr: false })
 */

'use client'

import { useRef, useEffect, useMemo, useCallback } from 'react'
import { Canvas, useFrame }                        from '@react-three/fiber'
import { EffectComposer, Bloom }                   from '@react-three/postprocessing'
import * as THREE                                  from 'three'

// ─── Tipos públicos ────────────────────────────────────────────────────────────

export type OrbStatus = 'idle' | 'listening' | 'thinking' | 'responding'

export interface NeuralWebGLOrbProps {
  /** Estado visual/comportamental del orbe */
  status?: OrbStatus
  /** Clase Tailwind para el contenedor (default: size-80 md:size-96) */
  className?: string
}

// ─── Configuración por estado ──────────────────────────────────────────────────

interface StateConfig {
  noiseAmp:         number   // amplitud de desplazamiento de ruido
  noiseFreq:        number   // frecuencia espacial del ruido
  rotSpeed:         number   // velocidad de rotación del gradiente
  pulseAmp:         number   // intensidad del pulso para 'responding'
  audioSensitivity: number   // 0 = ignorar mic | 1 = reactivo total
  scale:            number   // escala del mesh
}

const STATE_CONFIG: Record<OrbStatus, StateConfig> = {
  idle: {
    noiseAmp: 0.08, noiseFreq: 1.2, rotSpeed: 0.10,
    pulseAmp: 0.00, audioSensitivity: 0.05, scale: 1.00,
  },
  listening: {
    noiseAmp: 0.20, noiseFreq: 1.8, rotSpeed: 0.25,
    pulseAmp: 0.00, audioSensitivity: 1.00, scale: 1.05,
  },
  thinking: {
    noiseAmp: 0.05, noiseFreq: 3.5, rotSpeed: 0.90,
    pulseAmp: 0.00, audioSensitivity: 0.00, scale: 0.92,
  },
  responding: {
    noiseAmp: 0.14, noiseFreq: 1.5, rotSpeed: 0.35,
    pulseAmp: 0.65, audioSensitivity: 0.00, scale: 1.00,
  },
}

// ─── GLSL: Simplex Noise 3D (Stefan Gustavson) ────────────────────────────────
// Incluido inline para evitar dependencias externas y maximizar portabilidad.

const SIMPLEX_3D_GLSL = /* glsl */`
vec3  _m289v3(vec3 x)  { return x - floor(x*(1.0/289.0))*289.0; }
vec4  _m289v4(vec4 x)  { return x - floor(x*(1.0/289.0))*289.0; }
vec4  _perm(vec4 x)    { return _m289v4(((x*34.0)+1.0)*x); }
vec4  _tiSqrt(vec4 r)  { return 1.79284291400159 - 0.85373472095314*r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);

  vec3 g  = step(x0.yzx, x0.xyz);
  vec3 l  = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);

  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;

  i = _m289v3(i);
  vec4 p = _perm(_perm(_perm(
    i.z + vec4(0.0, i1.z, i2.z, 1.0)) +
    i.y + vec4(0.0, i1.y, i2.y, 1.0)) +
    i.x + vec4(0.0, i1.x, i2.x, 1.0));

  float n_ = 0.142857142857;
  vec3  ns = n_ * D.wyz - D.xzx;
  vec4  j  = p - 49.0*floor(p*ns.z*ns.z);
  vec4  x_ = floor(j*ns.z);
  vec4  y_ = floor(j - 7.0*x_);
  vec4  x  = x_*ns.x + ns.yyyy;
  vec4  y  = y_*ns.x + ns.yyyy;
  vec4  h  = 1.0 - abs(x) - abs(y);
  vec4  b0 = vec4(x.xy, y.xy);
  vec4  b1 = vec4(x.zw, y.zw);
  vec4  s0 = floor(b0)*2.0 + 1.0;
  vec4  s1 = floor(b1)*2.0 + 1.0;
  vec4  sh = -step(h, vec4(0.0));
  vec4  a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4  a1 = b1.xzyw + s1.xzyw*sh.zzww;
  vec3  p0 = vec3(a0.xy, h.x);
  vec3  p1 = vec3(a0.zw, h.y);
  vec3  p2 = vec3(a1.xy, h.z);
  vec3  p3 = vec3(a1.zw, h.w);

  vec4 norm = _tiSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;

  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}
`

// ─── Vertex Shader ─────────────────────────────────────────────────────────────
// Desplaza vértices a lo largo de la normal usando dos octavas de ruido.
// uBass amplifica el desplazamiento global → el orbe "late" con la voz.

const VERTEX_SHADER = /* glsl */`
${SIMPLEX_3D_GLSL}

uniform float uTime;
uniform float uBass;
uniform float uNoiseAmp;
uniform float uNoiseFreq;

varying vec3  vNormal;
varying vec3  vWorldPos;
varying float vDisplacement;

void main() {
  vNormal = normalize(normalMatrix * normal);

  // Dos octavas asimétricas → respiración biológica, no mecánica
  float n1 = snoise(position * uNoiseFreq       + vec3(uTime * 0.40, 0.0,        0.0 ));
  float n2 = snoise(position * uNoiseFreq * 2.1 + vec3(0.0,          uTime*0.25, 3.71));
  float d  = (n1*0.65 + n2*0.35) * uNoiseAmp * (1.0 + uBass * 2.8);

  vec3 displaced = position + normal * d;
  vWorldPos      = displaced;
  vDisplacement  = d;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
}
`

// ─── Fragment Shader ───────────────────────────────────────────────────────────
// Gradiente bicolor rotatorio + filamentos de ruido + borde Fresnel + pulso.
// uTreble acelera las hebras → vibran con frecuencias agudas del micrófono.

const FRAGMENT_SHADER = /* glsl */`
${SIMPLEX_3D_GLSL}

uniform float uTime;
uniform float uTreble;
uniform float uRotSpeed;
uniform float uPulseAmp;
uniform vec3  uColorA;    // azul rey  (#1a4fd6)
uniform vec3  uColorB;    // magenta   (#e91e8c)

varying vec3  vNormal;
varying vec3  vWorldPos;
varying float vDisplacement;

void main() {
  // ── Gradiente bicolor con rotación ────────────────────────────────────────
  float a    = uTime * uRotSpeed;
  float rotX = vWorldPos.x * cos(a) - vWorldPos.z * sin(a);
  float t    = clamp(rotX * 0.55 + 0.5, 0.0, 1.0);
  vec3  base = mix(uColorA, uColorB, t);

  // ── Filamentos (ruido de alta frecuencia) ─────────────────────────────────
  float spd  = 0.45 + uTreble * 2.8;
  float f1   = snoise(vWorldPos * 4.2 + uTime *  spd);
  float f2   = snoise(vWorldPos * 8.0 - uTime * (spd * 0.55) + 5.3);
  float fil  = smoothstep(0.2, 0.78, f1*0.55 + f2*0.45);
  vec3  filC = mix(base, vec3(1.0, 0.94, 1.0), fil * 0.32);

  // ── Fresnel: borde luminoso traslúcido ────────────────────────────────────
  float fresnel = pow(1.0 - abs(dot(normalize(vNormal), vec3(0.0, 0.0, 1.0))), 2.5);
  vec3  midTone = mix(uColorA, uColorB, 0.5);

  // ── Pulso rítmico para estado 'responding' (1 Hz) ─────────────────────────
  // Simula la cadencia de habla sin necesitar el AudioNode del TTS.
  float pulse = (sin(uTime * 6.28318) * 0.5 + 0.5) * uPulseAmp;
  vec3  glow  = uColorB * pulse * 0.28;

  // ── Composición final ──────────────────────────────────────────────────────
  vec3  color = filC + midTone * fresnel * 0.50 + glow;
  float alpha = 0.70 + fresnel * 0.22 + abs(vDisplacement) * 1.4;

  gl_FragColor = vec4(color, clamp(alpha, 0.50, 1.0));
}
`

// ─── Hook: Web Audio Analyser ──────────────────────────────────────────────────

interface AudioSnapshot {
  bass:   number   // 0-1, energía de 0-375 Hz
  treble: number   // 0-1, energía de 3-6 kHz
}

/**
 * Solicita acceso al micrófono, configura un AnalyserNode con FFT 256
 * y devuelve una función estable `getSnapshot()` para leer datos cada frame.
 * Si el mic es denegado, falla silenciosamente: el orbe funciona sin audio.
 */
function useAudioAnalyser(active: boolean): () => AudioSnapshot {
  const analyserRef  = useRef<AnalyserNode | null>(null)
  const dataRef      = useRef<Uint8Array>(new Uint8Array(128))
  const cleanupRef   = useRef<(() => void) | null>(null)

  useEffect(() => {
    if (!active) {
      cleanupRef.current?.()
      cleanupRef.current  = null
      analyserRef.current = null
      return
    }

    let alive = true

    navigator.mediaDevices
      .getUserMedia({ audio: true, video: false })
      .then(stream => {
        if (!alive) { stream.getTracks().forEach(t => t.stop()); return }

        const ctx      = new AudioContext()
        const analyser = ctx.createAnalyser()
        analyser.fftSize               = 256   // 128 bins — seguro en móvil
        analyser.smoothingTimeConstant = 0.75  // suaviza picos abruptos

        ctx.createMediaStreamSource(stream).connect(analyser)
        analyserRef.current = analyser
        dataRef.current     = new Uint8Array(analyser.frequencyBinCount)

        cleanupRef.current = () => {
          stream.getTracks().forEach(t => t.stop())
          ctx.close()
        }
      })
      .catch(() => { /* mic denegado — el orbe opera en modo visual puro */ })

    return () => {
      alive = false
      cleanupRef.current?.()
      cleanupRef.current  = null
      analyserRef.current = null
    }
  }, [active])

  // Callback estable que se llama cada frame desde useFrame
  return useCallback((): AudioSnapshot => {
    const analyser = analyserRef.current
    if (!analyser) return { bass: 0, treble: 0 }

    analyser.getByteFrequencyData(dataRef.current)
    const bins = dataRef.current
    const len  = bins.length  // 128

    // Bass: bins 0-9 → ~0-375 Hz
    let bassAcc = 0
    for (let i = 0; i < 10; i++) bassAcc += bins[i]

    // Treble: bins 80-127 → ~3-6 kHz
    let trebAcc = 0
    for (let i = 80; i < len; i++) trebAcc += bins[i]

    return {
      bass:   bassAcc / (10         * 255),
      treble: trebAcc / ((len - 80) * 255),
    }
  }, [])
}

// ─── Orb Mesh (debe vivir dentro de <Canvas> para acceder a useFrame) ─────────

interface OrbMeshProps {
  status:       OrbStatus
  getAudioData: () => AudioSnapshot
}

function OrbMesh({ status, getAudioData }: OrbMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null)

  // Estado vivo (mutable) que se interpola cada frame — sin re-renders de React
  const live = useRef<StateConfig>({ ...STATE_CONFIG.idle })

  const uniforms = useMemo<Record<string, THREE.IUniform>>(() => ({
    uTime:      { value: 0 },
    uBass:      { value: 0 },
    uTreble:    { value: 0 },
    uNoiseAmp:  { value: STATE_CONFIG.idle.noiseAmp  },
    uNoiseFreq: { value: STATE_CONFIG.idle.noiseFreq },
    uRotSpeed:  { value: STATE_CONFIG.idle.rotSpeed  },
    uPulseAmp:  { value: 0 },
    uColorA:    { value: new THREE.Color('#1a4fd6') },  // azul rey
    uColorB:    { value: new THREE.Color('#e91e8c') },  // magenta eléctrico
  }), [])

  useFrame(({ clock }) => {
    const cfg = STATE_CONFIG[status]
    const l   = live.current
    const L   = 0.035   // factor de lerp → ~0.55 s de transición a 60 fps

    // Interpolar suavemente hacia los valores del estado activo
    l.noiseAmp         += (cfg.noiseAmp         - l.noiseAmp)         * L
    l.noiseFreq        += (cfg.noiseFreq        - l.noiseFreq)        * L
    l.rotSpeed         += (cfg.rotSpeed         - l.rotSpeed)         * L
    l.pulseAmp         += (cfg.pulseAmp         - l.pulseAmp)         * L
    l.audioSensitivity += (cfg.audioSensitivity - l.audioSensitivity) * L
    l.scale            += (cfg.scale            - l.scale)            * L

    const { bass, treble } = getAudioData()

    uniforms.uTime.value      = clock.getElapsedTime()
    uniforms.uBass.value      = bass   * l.audioSensitivity
    uniforms.uTreble.value    = treble * Math.max(l.audioSensitivity * 0.5, 0.1)
    uniforms.uNoiseAmp.value  = l.noiseAmp
    uniforms.uNoiseFreq.value = l.noiseFreq
    uniforms.uRotSpeed.value  = l.rotSpeed
    uniforms.uPulseAmp.value  = l.pulseAmp

    // Escala del mesh (thinking = ligeramente contraído)
    meshRef.current?.scale.setScalar(l.scale)
  })

  return (
    <mesh ref={meshRef}>
      {/* 64×64 segmentos: balance óptimo entre suavidad y rendimiento móvil */}
      <sphereGeometry args={[1, 64, 64]} />
      <shaderMaterial
        vertexShader={VERTEX_SHADER}
        fragmentShader={FRAGMENT_SHADER}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        side={THREE.FrontSide}
      />
    </mesh>
  )
}

// ─── Scene (wrapper dentro de Canvas) ─────────────────────────────────────────

function Scene({ status }: { status: OrbStatus }) {
  // El mic solo se activa en estado 'listening'
  const getAudioData = useAudioAnalyser(status === 'listening')

  return (
    <>
      <OrbMesh status={status} getAudioData={getAudioData} />
      <EffectComposer>
        <Bloom
          luminanceThreshold={0.25}
          luminanceSmoothing={0.90}
          intensity={1.6}
          mipmapBlur
        />
      </EffectComposer>
    </>
  )
}

// ─── Componente público ────────────────────────────────────────────────────────

export default function NeuralWebGLOrb({
  status    = 'idle',
  className = 'size-80 md:size-96',
}: NeuralWebGLOrbProps) {
  return (
    <div className={className}>
      <Canvas
        camera={{ position: [0, 0, 2.8], fov: 45 }}
        gl={{
          antialias:       true,
          alpha:           true,
          powerPreference: 'high-performance',
        }}
        dpr={[1, 1.5]}             // cap pixel ratio → FPS estables en móvil
        style={{ background: 'transparent' }}
      >
        <Scene status={status} />
      </Canvas>
    </div>
  )
}
