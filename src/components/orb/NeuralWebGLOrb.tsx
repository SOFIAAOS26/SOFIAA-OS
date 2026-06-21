// @ts-nocheck
// Reason: THREE.js .d.ts types use Uint8Array<ArrayBufferLike> which conflicts with
// TypeScript 5.5+ strict typed-array generics. Runtime behavior is fully correct.
'use client'

/**
 * NeuralWebGLOrb.tsx — SOFIAA Edition v2
 *
 * Orbe cristalino 3D con efecto vidrio/plasma.
 * Superficie casi suave, borde Fresnel brillante, interior translúcido.
 * 7 estados: idle | listening | thinking | responding | cache_hit | error | success
 */

import { useRef, useEffect, useMemo, useCallback, useState } from 'react'
import { Canvas, useFrame }     from '@react-three/fiber'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import * as THREE               from 'three'
import type { OrbState }        from './orb.states'

// ─── Configuración visual por estado ──────────────────────────────────────────

interface StateConfig {
  noiseAmp:         number   // muy pequeño — solo respiración sutil
  noiseFreq:        number   // frecuencia espacial
  rotSpeed:         number   // velocidad de rotación del color interno
  pulseAmp:         number   // pulso rítmico
  audioSensitivity: number
  scale:            number
  colorCore:        string   // color del núcleo interior
  colorRim:         string   // color del borde Fresnel
  colorMid:         string   // color medio para gradiente
  bloomIntensity:   number
  rimPower:         number   // potencia del efecto Fresnel (mayor = borde más fino)
}

const STATE_CONFIG: Record<OrbState, StateConfig> = {
  idle: {
    noiseAmp: 0.018, noiseFreq: 1.4, rotSpeed: 0.06,
    pulseAmp: 0.12, audioSensitivity: 0.03, scale: 1.00, rimPower: 3.5,
    colorCore: '#0a0e2a', colorMid: '#1a3a8f', colorRim: '#6B9FFF',
    bloomIntensity: 0.9,
  },
  listening: {
    noiseAmp: 0.035, noiseFreq: 1.6, rotSpeed: 0.18,
    pulseAmp: 0.25, audioSensitivity: 1.00, scale: 1.05, rimPower: 2.8,
    colorCore: '#051820', colorMid: '#0066aa', colorRim: '#00D4FF',
    bloomIntensity: 1.6,
  },
  thinking: {
    noiseAmp: 0.012, noiseFreq: 4.5, rotSpeed: 0.90,
    pulseAmp: 0.08, audioSensitivity: 0.00, scale: 0.94, rimPower: 4.0,
    colorCore: '#100520', colorMid: '#3a1080', colorRim: '#9B6FFF',
    bloomIntensity: 1.1,
  },
  responding: {
    noiseAmp: 0.025, noiseFreq: 1.8, rotSpeed: 0.22,
    pulseAmp: 0.55, audioSensitivity: 0.00, scale: 1.00, rimPower: 3.0,
    colorCore: '#050a1a', colorMid: '#1a3fcc', colorRim: '#4F9FFF',
    bloomIntensity: 1.4,
  },
  cache_hit: {
    noiseAmp: 0.028, noiseFreq: 2.2, rotSpeed: 0.45,
    pulseAmp: 0.70, audioSensitivity: 0.00, scale: 1.07, rimPower: 2.5,
    colorCore: '#001a18', colorMid: '#007a75', colorRim: '#00FFE8',
    bloomIntensity: 2.0,
  },
  error: {
    noiseAmp: 0.042, noiseFreq: 2.8, rotSpeed: 0.65,
    pulseAmp: 0.60, audioSensitivity: 0.00, scale: 0.97, rimPower: 2.8,
    colorCore: '#1a0500', colorMid: '#8a1500', colorRim: '#FF5540',
    bloomIntensity: 1.7,
  },
  success: {
    noiseAmp: 0.020, noiseFreq: 1.5, rotSpeed: 0.15,
    pulseAmp: 0.80, audioSensitivity: 0.00, scale: 1.08, rimPower: 2.8,
    colorCore: '#001a08', colorMid: '#0a6630', colorRim: '#34FF80',
    bloomIntensity: 1.9,
  },
}

// ─── GLSL: Simplex Noise 3D (Stefan Gustavson) ────────────────────────────────

const SIMPLEX = /* glsl */`
vec3  _s289(vec3 x)  { return x - floor(x*(1./289.))*289.; }
vec4  _s289(vec4 x)  { return x - floor(x*(1./289.))*289.; }
vec4  _perm(vec4 x)  { return _s289(((x*34.)+1.)*x); }
float snoise(vec3 v) {
  const vec2 C = vec2(1./6., 1./3.);
  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g  = step(x0.yzx, x0.xyz);
  vec3 l  = 1. - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - .5;
  i = _s289(i);
  vec4 p = _perm(_perm(_perm(
    i.z+vec4(0.,i1.z,i2.z,1.))+
    i.y+vec4(0.,i1.y,i2.y,1.))+
    i.x+vec4(0.,i1.x,i2.x,1.));
  vec3  ns = .142857*vec3(.5,1.,-2.) - vec3(.5,.5,.5)*.142857;
  vec4  j  = p - 49.*floor(p*ns.z*ns.z);
  vec4  x_ = floor(j*ns.z);
  vec4  y_ = floor(j - 7.*x_);
  vec4  xs = x_*ns.x+ns.y; vec4 ys = y_*ns.x+ns.y;
  vec4  h  = 1.-abs(xs)-abs(ys);
  vec4  b0 = vec4(xs.xy,ys.xy);
  vec4  b1 = vec4(xs.zw,ys.zw);
  vec4  s0 = floor(b0)*2.+1.; vec4 s1 = floor(b1)*2.+1.;
  vec4  sh = -step(h,vec4(0.));
  vec4  a0 = b0.xzyw+s0.xzyw*sh.xxyy;
  vec4  a1 = b1.xzyw+s1.xzyw*sh.zzww;
  vec3  p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y);
  vec3  p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
  vec4  nm = max(.5-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);
  nm *= nm;
  vec4 nd = vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3));
  return 42.*dot(nm*nm,nd);
}
`

// ─── Vertex Shader ─────────────────────────────────────────────────────────────

const VERT = /* glsl */`
${SIMPLEX}

uniform float uTime;
uniform float uBass;
uniform float uNoiseAmp;
uniform float uNoiseFreq;

varying vec3  vNormal;
varying vec3  vPos;
varying float vDisp;

void main() {
  vNormal = normalize(normalMatrix * normal);

  // Deformación sutil: una sola octava suave
  float n = snoise(position * uNoiseFreq + vec3(uTime * 0.3, 0., 0.));
  float d = n * uNoiseAmp * (1. + uBass * 1.5);

  vec3 disp = position + normal * d;
  vPos  = disp;
  vDisp = d;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(disp, 1.);
}
`

// ─── Fragment Shader — efecto cristal/plasma ───────────────────────────────────

const FRAG = /* glsl */`
${SIMPLEX}

uniform float uTime;
uniform float uTreble;
uniform float uRotSpeed;
uniform float uPulseAmp;
uniform float uRimPower;
uniform vec3  uColorCore;
uniform vec3  uColorMid;
uniform vec3  uColorRim;

varying vec3  vNormal;
varying vec3  vPos;
varying float vDisp;

void main() {
  // — Fresnel: cuánto mira "hacia nosotros" vs "de lado"
  vec3  N       = normalize(vNormal);
  float NdotV   = abs(dot(N, vec3(0.,0.,1.)));
  float fresnel = pow(1. - NdotV, uRimPower);   // 0 = centro, 1 = borde

  // — Gradiente interior: núcleo oscuro → mid → borde brillante
  float t     = fresnel;
  vec3  inner = mix(uColorCore, uColorMid, smoothstep(0.,0.55,t));
  vec3  outer = mix(uColorMid,  uColorRim, smoothstep(0.45,1.,t));
  vec3  base  = mix(inner, outer, step(0.45, t));

  // — Rotación de color lenta (da sensación de plasma vivo)
  float rot    = uTime * uRotSpeed;
  float rotVal = vPos.x*cos(rot) - vPos.z*sin(rot);
  float tilt   = clamp(rotVal * 0.3 + 0.5, 0., 1.);
  vec3  tinted = mix(base, mix(uColorMid, uColorRim, tilt), 0.18);

  // — Venas de energía finas (solo visibles en el borde)
  float vein = snoise(vPos * 5.5 + uTime * (0.3 + uTreble));
  vein = smoothstep(0.55, 0.85, vein) * fresnel * 0.35;
  tinted += uColorRim * vein;

  // — Punto de luz especular (simula reflexión de luz)
  vec3  lightDir = normalize(vec3(0.6, 0.8, 1.0));
  float spec     = pow(max(dot(N, lightDir), 0.), 24.);
  tinted += vec3(1.) * spec * 0.25;

  // — Pulso rítmico en el borde
  float pulse = (sin(uTime * 6.283) * 0.5 + 0.5) * uPulseAmp;
  tinted += uColorRim * fresnel * pulse * 0.40;

  // — Alpha: casi transparente en el centro, opaco en el borde (efecto cristal)
  float alpha = 0.08 + fresnel * 0.88 + spec * 0.2 + abs(vDisp) * 0.8;

  gl_FragColor = vec4(tinted, clamp(alpha, 0.05, 1.0));
}
`

// ─── Hook: Web Audio Analyser ──────────────────────────────────────────────────

interface AudioSnapshot { bass: number; treble: number }

function useAudioAnalyser(active: boolean): () => AudioSnapshot {
  const analyserRef = useRef<AnalyserNode | null>(null)
  const dataRef     = useRef(new Float32Array(128))
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
        analyser.smoothingTimeConstant = 0.80
        ctx.createMediaStreamSource(stream).connect(analyser)
        analyserRef.current = analyser
        dataRef.current     = new Float32Array(analyser.frequencyBinCount)
        cleanupRef.current  = () => { stream.getTracks().forEach(t => t.stop()); ctx.close() }
      })
      .catch(() => {})

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
    let bassAcc = 0
    for (let i = 0; i < 8; i++)  bassAcc += Math.max(0, (bins[i] + 140) / 140)
    let trebAcc = 0
    for (let i = 60; i < len; i++) trebAcc += Math.max(0, (bins[i] + 140) / 140)
    return { bass: bassAcc / 8, treble: trebAcc / (len - 60) }
  }, [])
}

// ─── OrbMesh ───────────────────────────────────────────────────────────────────

interface OrbMeshProps {
  state:        OrbState
  getAudioData: () => AudioSnapshot
}

function OrbMesh({ state, getAudioData }: OrbMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null)

  const live = useRef({
    noiseAmp: STATE_CONFIG.idle.noiseAmp,
    noiseFreq: STATE_CONFIG.idle.noiseFreq,
    rotSpeed:  STATE_CONFIG.idle.rotSpeed,
    pulseAmp:  STATE_CONFIG.idle.pulseAmp,
    rimPower:  STATE_CONFIG.idle.rimPower,
    audioSens: STATE_CONFIG.idle.audioSensitivity,
    scale:     STATE_CONFIG.idle.scale,
  })

  const uniforms = useMemo<Record<string, THREE.IUniform>>(() => ({
    uTime:      { value: 0 },
    uBass:      { value: 0 },
    uTreble:    { value: 0 },
    uNoiseAmp:  { value: STATE_CONFIG.idle.noiseAmp },
    uNoiseFreq: { value: STATE_CONFIG.idle.noiseFreq },
    uRotSpeed:  { value: STATE_CONFIG.idle.rotSpeed },
    uPulseAmp:  { value: 0 },
    uRimPower:  { value: STATE_CONFIG.idle.rimPower },
    uColorCore: { value: new THREE.Color(STATE_CONFIG.idle.colorCore) },
    uColorMid:  { value: new THREE.Color(STATE_CONFIG.idle.colorMid)  },
    uColorRim:  { value: new THREE.Color(STATE_CONFIG.idle.colorRim)  },
  }), [])

  const tCore = useRef(new THREE.Color(STATE_CONFIG.idle.colorCore))
  const tMid  = useRef(new THREE.Color(STATE_CONFIG.idle.colorMid))
  const tRim  = useRef(new THREE.Color(STATE_CONFIG.idle.colorRim))

  useFrame(({ clock }) => {
    const cfg = STATE_CONFIG[state]
    const l   = live.current
    const L   = 0.030   // lerp suave ~0.65s a 60fps

    tCore.current.set(cfg.colorCore)
    tMid.current.set(cfg.colorMid)
    tRim.current.set(cfg.colorRim)

    l.noiseAmp += (cfg.noiseAmp         - l.noiseAmp) * L
    l.noiseFreq += (cfg.noiseFreq       - l.noiseFreq) * L
    l.rotSpeed  += (cfg.rotSpeed        - l.rotSpeed)  * L
    l.pulseAmp  += (cfg.pulseAmp        - l.pulseAmp)  * L
    l.rimPower  += (cfg.rimPower        - l.rimPower)  * L
    l.audioSens += (cfg.audioSensitivity - l.audioSens) * L
    l.scale     += (cfg.scale           - l.scale)     * L

    ;(uniforms.uColorCore.value as THREE.Color).lerp(tCore.current, L)
    ;(uniforms.uColorMid.value  as THREE.Color).lerp(tMid.current,  L)
    ;(uniforms.uColorRim.value  as THREE.Color).lerp(tRim.current,  L)

    const { bass, treble } = getAudioData()

    uniforms.uTime.value      = clock.getElapsedTime()
    uniforms.uBass.value      = bass   * l.audioSens
    uniforms.uTreble.value    = treble * Math.max(l.audioSens * 0.4, 0.08)
    uniforms.uNoiseAmp.value  = l.noiseAmp
    uniforms.uNoiseFreq.value = l.noiseFreq
    uniforms.uRotSpeed.value  = l.rotSpeed
    uniforms.uPulseAmp.value  = l.pulseAmp
    uniforms.uRimPower.value  = l.rimPower

    meshRef.current?.scale.setScalar(l.scale)
  })

  return (
    <mesh ref={meshRef}>
      {/* 80×80 → superficie más suave sin ser costoso */}
      <sphereGeometry args={[1, 80, 80]} />
      <shaderMaterial
        vertexShader={VERT}
        fragmentShader={FRAG}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        side={THREE.FrontSide}
      />
    </mesh>
  )
}

// ─── BackGlow: halo difuso detrás del orbe ─────────────────────────────────────

function BackGlow({ state }: { state: OrbState }) {
  const matRef = useRef<THREE.MeshBasicMaterial>(null)
  const tColor = useRef(new THREE.Color(STATE_CONFIG.idle.colorRim))

  useFrame(() => {
    tColor.current.set(STATE_CONFIG[state].colorRim)
    if (matRef.current) {
      matRef.current.color.lerp(tColor.current, 0.04)
      matRef.current.opacity =
        0.06 + STATE_CONFIG[state].bloomIntensity * 0.025
    }
  })

  return (
    <mesh position={[0, 0, -0.15]} scale={[1.45, 1.45, 1]}>
      <circleGeometry args={[1, 64]} />
      <meshBasicMaterial
        ref={matRef}
        color={STATE_CONFIG.idle.colorRim}
        transparent
        opacity={0.08}
        depthWrite={false}
      />
    </mesh>
  )
}

// ─── Scene ─────────────────────────────────────────────────────────────────────

function Scene({ state }: { state: OrbState }) {
  const getAudioData = useAudioAnalyser(state === 'listening')
  const bloomIntensity = STATE_CONFIG[state]?.bloomIntensity ?? 1.2

  return (
    <>
      <BackGlow state={state} />
      <OrbMesh state={state} getAudioData={getAudioData} />
      <EffectComposer>
        <Bloom
          luminanceThreshold={0.15}
          luminanceSmoothing={0.95}
          intensity={bloomIntensity}
          mipmapBlur
        />
      </EffectComposer>
    </>
  )
}

// ─── Fallback SVG ──────────────────────────────────────────────────────────────

function OrbFallback() {
  return (
    <div style={{
      width: '100%', height: '100%', borderRadius: '50%',
      background: 'radial-gradient(circle at 38% 33%, rgba(107,159,255,0.15) 0%, rgba(79,124,255,0.4) 40%, rgba(26,79,214,0.7) 70%, rgba(10,14,42,0.9) 100%)',
      boxShadow: '0 0 50px rgba(79,124,255,0.35), inset 0 0 30px rgba(10,14,42,0.8)',
      animation: 'orbCacheHit 3s ease-in-out infinite',
    }} />
  )
}

// ─── Componente público ────────────────────────────────────────────────────────

export interface NeuralWebGLOrbProps {
  state: OrbState
}

export default function NeuralWebGLOrb({ state }: NeuralWebGLOrbProps) {
  const [webglOk, setWebglOk] = useState<boolean | null>(null)

  useEffect(() => {
    try {
      const canvas = document.createElement('canvas')
      const ctx    = canvas.getContext('webgl2') ?? canvas.getContext('webgl')
      setWebglOk(!!ctx)
    } catch { setWebglOk(false) }
  }, [])

  if (webglOk === null) return null
  if (!webglOk) return (
    <div style={{ width: 'clamp(150px, 38vw, 260px)', height: 'clamp(150px, 38vw, 260px)' }}>
      <OrbFallback />
    </div>
  )

  return (
    <div style={{ width: 'clamp(150px, 38vw, 260px)', height: 'clamp(150px, 38vw, 260px)' }}>
      <Canvas
        camera={{ position: [0, 0, 2.8], fov: 45 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        dpr={[1, 1.5]}
        style={{ background: 'transparent' }}
      >
        <Scene state={state} />
      </Canvas>
    </div>
  )
}
