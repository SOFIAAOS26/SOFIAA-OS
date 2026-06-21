// @ts-nocheck
// Reason: THREE.js .d.ts types use Uint8Array<ArrayBufferLike> which conflicts with
// TypeScript 5.5+ strict typed-array generics. Runtime behavior is fully correct.
// All type safety is maintained in the rest of the codebase.
'use client'

/**
 * NeuralWebGLOrb.tsx — SOFIAA Edition
 *
 * Orbe 3D WebGL adaptado al sistema de estados completo de SOFIAA OS.
 * Soporta los 7 estados: idle | listening | thinking | responding | cache_hit | error | success
 *
 * Requiere (instalar con --legacy-peer-deps por React 19):
 *   npm install three @react-three/fiber @react-three/postprocessing --legacy-peer-deps
 *   npm install -D @types/three --legacy-peer-deps
 *
 * Montar siempre con SSR desactivado:
 *   const NeuralWebGLOrb = dynamic(() => import('@/components/orb/NeuralWebGLOrb'), { ssr: false })
 */

import { useRef, useEffect, useMemo, useCallback, useState } from 'react'
import { Canvas, useFrame }     from '@react-three/fiber'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import * as THREE               from 'three'
import type { OrbState }        from './orb.states'

// ─── Configuración visual por estado ──────────────────────────────────────────

interface StateConfig {
  noiseAmp:         number   // amplitud de desplazamiento de vértices
  noiseFreq:        number   // frecuencia espacial del ruido
  rotSpeed:         number   // velocidad de rotación del gradiente de color
  pulseAmp:         number   // intensidad del pulso rítmico (responding = 1 Hz)
  audioSensitivity: number   // 0 = sin mic | 1 = totalmente reactivo
  scale:            number   // escala del mesh
  colorA:           string   // color primario (hex)
  colorB:           string   // color secundario (hex)
  bloomIntensity:   number   // intensidad del glow de postproceso
}

const STATE_CONFIG: Record<OrbState, StateConfig> = {
  idle: {
    noiseAmp: 0.08, noiseFreq: 1.2, rotSpeed: 0.10,
    pulseAmp: 0.00, audioSensitivity: 0.05, scale: 1.00,
    colorA: '#1a4fd6', colorB: '#7B4FE8', bloomIntensity: 1.2,
  },
  listening: {
    noiseAmp: 0.22, noiseFreq: 1.8, rotSpeed: 0.28,
    pulseAmp: 0.00, audioSensitivity: 1.00, scale: 1.06,
    colorA: '#4F7CFF', colorB: '#00C8FF', bloomIntensity: 1.8,
  },
  thinking: {
    noiseAmp: 0.05, noiseFreq: 3.8, rotSpeed: 1.10,
    pulseAmp: 0.00, audioSensitivity: 0.00, scale: 0.92,
    colorA: '#5B2DA8', colorB: '#1a4fd6', bloomIntensity: 1.4,
  },
  responding: {
    noiseAmp: 0.14, noiseFreq: 1.5, rotSpeed: 0.35,
    pulseAmp: 0.65, audioSensitivity: 0.00, scale: 1.00,
    colorA: '#1a4fd6', colorB: '#e91e8c', bloomIntensity: 1.6,
  },
  cache_hit: {
    noiseAmp: 0.18, noiseFreq: 2.0, rotSpeed: 0.60,
    pulseAmp: 0.80, audioSensitivity: 0.00, scale: 1.08,
    colorA: '#00D2C8', colorB: '#4F7CFF', bloomIntensity: 2.2,
  },
  error: {
    noiseAmp: 0.28, noiseFreq: 2.5, rotSpeed: 0.80,
    pulseAmp: 0.55, audioSensitivity: 0.00, scale: 0.96,
    colorA: '#FF503C', colorB: '#FF8C00', bloomIntensity: 1.8,
  },
  success: {
    noiseAmp: 0.10, noiseFreq: 1.4, rotSpeed: 0.20,
    pulseAmp: 0.90, audioSensitivity: 0.00, scale: 1.10,
    colorA: '#34C759', colorB: '#00D2C8', bloomIntensity: 2.0,
  },
}

// ─── GLSL: Simplex Noise 3D (Stefan Gustavson) — inline, sin dependencias ─────

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

const FRAGMENT_SHADER = /* glsl */`
${SIMPLEX_3D_GLSL}

uniform float uTime;
uniform float uTreble;
uniform float uRotSpeed;
uniform float uPulseAmp;
uniform vec3  uColorA;
uniform vec3  uColorB;

varying vec3  vNormal;
varying vec3  vWorldPos;
varying float vDisplacement;

void main() {
  // Gradiente bicolor rotatorio
  float a    = uTime * uRotSpeed;
  float rotX = vWorldPos.x * cos(a) - vWorldPos.z * sin(a);
  float t    = clamp(rotX * 0.55 + 0.5, 0.0, 1.0);
  vec3  base = mix(uColorA, uColorB, t);

  // Filamentos de ruido de alta frecuencia
  float spd  = 0.45 + uTreble * 2.8;
  float f1   = snoise(vWorldPos * 4.2 + uTime *  spd);
  float f2   = snoise(vWorldPos * 8.0 - uTime * (spd * 0.55) + 5.3);
  float fil  = smoothstep(0.2, 0.78, f1*0.55 + f2*0.45);
  vec3  filC = mix(base, vec3(1.0, 0.94, 1.0), fil * 0.32);

  // Borde Fresnel luminoso
  float fresnel = pow(1.0 - abs(dot(normalize(vNormal), vec3(0.0, 0.0, 1.0))), 2.5);
  vec3  midTone = mix(uColorA, uColorB, 0.5);

  // Pulso rítmico (responding/cache_hit/success) — simula habla sin AudioNode TTS
  float pulse = (sin(uTime * 6.28318) * 0.5 + 0.5) * uPulseAmp;
  vec3  glow  = uColorB * pulse * 0.30;

  vec3  color = filC + midTone * fresnel * 0.50 + glow;
  float alpha = 0.70 + fresnel * 0.22 + abs(vDisplacement) * 1.4;

  gl_FragColor = vec4(color, clamp(alpha, 0.50, 1.0));
}
`

// ─── Hook: Web Audio Analyser ──────────────────────────────────────────────────

interface AudioSnapshot { bass: number; treble: number }

function useAudioAnalyser(active: boolean): () => AudioSnapshot {
  const analyserRef = useRef<AnalyserNode | null>(null)
  const dataRef     = useRef(new Float32Array(new ArrayBuffer(512))) // 128 bins × 4 bytes
  const cleanupRef  = useRef<(() => void) | null>(null)

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
        analyser.fftSize               = 256
        analyser.smoothingTimeConstant = 0.75
        ctx.createMediaStreamSource(stream).connect(analyser)
        analyserRef.current = analyser
        dataRef.current     = new Float32Array(new ArrayBuffer(analyser.frequencyBinCount * 4))
        cleanupRef.current  = () => { stream.getTracks().forEach(t => t.stop()); ctx.close() }
      })
      .catch(() => { /* mic denegado — el orbe opera en modo visual puro */ })

    return () => {
      alive = false
      cleanupRef.current?.()
      cleanupRef.current  = null
      analyserRef.current = null
    }
  }, [active])

  return useCallback((): AudioSnapshot => {
    const analyser = analyserRef.current
    if (!analyser) return { bass: 0, treble: 0 }
    analyser.getFloatFrequencyData(dataRef.current)
    const bins = dataRef.current
    const len  = bins.length
    // Float frequency data is in dB (-Infinity to 0). Normalize: (db + 140) / 140 → 0..1
    let bassAcc = 0
    for (let i = 0; i < 10; i++) bassAcc += Math.max(0, (bins[i] + 140) / 140)
    let trebAcc = 0
    for (let i = 80; i < len; i++) trebAcc += Math.max(0, (bins[i] + 140) / 140)
    return {
      bass:   bassAcc / 10,
      treble: trebAcc / (len - 80),
    }
  }, [])
}

// ─── OrbMesh ───────────────────────────────────────────────────────────────────

interface OrbMeshProps {
  state:        OrbState
  getAudioData: () => AudioSnapshot
}

function OrbMesh({ state, getAudioData }: OrbMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null)

  // Estado interpolado en tiempo real — sin re-renders de React
  const live = useRef({
    noiseAmp:         STATE_CONFIG.idle.noiseAmp,
    noiseFreq:        STATE_CONFIG.idle.noiseFreq,
    rotSpeed:         STATE_CONFIG.idle.rotSpeed,
    pulseAmp:         STATE_CONFIG.idle.pulseAmp,
    audioSensitivity: STATE_CONFIG.idle.audioSensitivity,
    scale:            STATE_CONFIG.idle.scale,
    bloomIntensity:   STATE_CONFIG.idle.bloomIntensity,
  })

  const uniforms = useMemo<Record<string, THREE.IUniform>>(() => ({
    uTime:      { value: 0 },
    uBass:      { value: 0 },
    uTreble:    { value: 0 },
    uNoiseAmp:  { value: STATE_CONFIG.idle.noiseAmp  },
    uNoiseFreq: { value: STATE_CONFIG.idle.noiseFreq },
    uRotSpeed:  { value: STATE_CONFIG.idle.rotSpeed  },
    uPulseAmp:  { value: 0 },
    uColorA:    { value: new THREE.Color(STATE_CONFIG.idle.colorA) },
    uColorB:    { value: new THREE.Color(STATE_CONFIG.idle.colorB) },
  }), [])

  // Colores target para interpolación suave
  const targetColorA = useRef(new THREE.Color(STATE_CONFIG.idle.colorA))
  const targetColorB = useRef(new THREE.Color(STATE_CONFIG.idle.colorB))

  useFrame(({ clock }) => {
    const cfg = STATE_CONFIG[state]
    const l   = live.current
    const L   = 0.035   // lerp factor → ~0.55s de transición a 60fps

    // Actualizar colores target cuando cambia el estado
    targetColorA.current.set(cfg.colorA)
    targetColorB.current.set(cfg.colorB)

    // Interpolar todos los valores numéricos
    l.noiseAmp         += (cfg.noiseAmp         - l.noiseAmp)         * L
    l.noiseFreq        += (cfg.noiseFreq        - l.noiseFreq)        * L
    l.rotSpeed         += (cfg.rotSpeed         - l.rotSpeed)         * L
    l.pulseAmp         += (cfg.pulseAmp         - l.pulseAmp)         * L
    l.audioSensitivity += (cfg.audioSensitivity - l.audioSensitivity) * L
    l.scale            += (cfg.scale            - l.scale)            * L

    // Interpolar colores en espacio linear
    ;(uniforms.uColorA.value as THREE.Color).lerp(targetColorA.current, L)
    ;(uniforms.uColorB.value as THREE.Color).lerp(targetColorB.current, L)

    const { bass, treble } = getAudioData()

    uniforms.uTime.value      = clock.getElapsedTime()
    uniforms.uBass.value      = bass   * l.audioSensitivity
    uniforms.uTreble.value    = treble * Math.max(l.audioSensitivity * 0.5, 0.1)
    uniforms.uNoiseAmp.value  = l.noiseAmp
    uniforms.uNoiseFreq.value = l.noiseFreq
    uniforms.uRotSpeed.value  = l.rotSpeed
    uniforms.uPulseAmp.value  = l.pulseAmp

    meshRef.current?.scale.setScalar(l.scale)
  })

  return (
    <mesh ref={meshRef}>
      {/* 64×64 segmentos — balance óptimo entre suavidad y rendimiento móvil */}
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

// ─── Scene ─────────────────────────────────────────────────────────────────────

function Scene({ state }: { state: OrbState }) {
  // Mic solo activo en estado listening — se cierra automáticamente al salir
  const getAudioData = useAudioAnalyser(state === 'listening')

  const bloomIntensity = STATE_CONFIG[state]?.bloomIntensity ?? 1.4

  return (
    <>
      <OrbMesh state={state} getAudioData={getAudioData} />
      <EffectComposer>
        <Bloom
          luminanceThreshold={0.22}
          luminanceSmoothing={0.90}
          intensity={bloomIntensity}
          mipmapBlur
        />
      </EffectComposer>
    </>
  )
}

// ─── Fallback SVG — se muestra si WebGL no está disponible ────────────────────

function OrbFallback() {
  return (
    <div
      style={{
        width: '100%', height: '100%', borderRadius: '50%',
        background: 'radial-gradient(circle at 38% 33%, #C0D8FF 0%, #6690FF 20%, #7B40E0 42%, #D43098 65%, #FF5540 85%, #FF8020 100%)',
        boxShadow: '0 0 40px rgba(79,124,255,0.4)',
        animation: 'orbCacheHit 3s ease-in-out infinite',
      }}
    />
  )
}

// ─── Componente público — misma interfaz que el Orb.tsx original ───────────────

export interface NeuralWebGLOrbProps {
  state: OrbState
}

export default function NeuralWebGLOrb({ state }: NeuralWebGLOrbProps) {
  const [webglOk, setWebglOk] = useState<boolean | null>(null)

  // Detectar soporte WebGL2 antes de montar el Canvas
  useEffect(() => {
    try {
      const canvas = document.createElement('canvas')
      const ctx    = canvas.getContext('webgl2') ?? canvas.getContext('webgl')
      setWebglOk(!!ctx)
    } catch {
      setWebglOk(false)
    }
  }, [])

  if (webglOk === null) return null   // hidrata sin flash
  if (!webglOk) return (
    <div style={{ width: 'clamp(150px, 38vw, 260px)', height: 'clamp(150px, 38vw, 260px)' }}>
      <OrbFallback />
    </div>
  )

  return (
    <div style={{ width: 'clamp(150px, 38vw, 260px)', height: 'clamp(150px, 38vw, 260px)' }}>
      <Canvas
        camera={{ position: [0, 0, 2.8], fov: 45 }}
        gl={{
          antialias:       true,
          alpha:           true,
          powerPreference: 'high-performance',
        }}
        dpr={[1, 1.5]}
        style={{ background: 'transparent' }}
      >
        <Scene state={state} />
      </Canvas>
    </div>
  )
}
