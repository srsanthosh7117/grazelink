import { useEffect, useMemo, useRef, useState } from 'react'
import Globe from 'react-globe.gl'
import * as THREE from 'three'
import type { Goat } from '../types'
import { pinColorFor } from '../statusMeta'
import { SHED } from '../data/mockData'
import Legend from './Legend'

interface Props {
  goats: Goat[]
  selectedGoat: Goat | null
  onSelect: (id: string) => void
}

// Loose ref type: react-globe.gl's GlobeMethods aren't exported from every
// version, so we type the handful of methods we actually call.
interface GlobeHandle {
  pointOfView: (pov: { lat?: number; lng?: number; altitude?: number }, ms?: number) => void
  controls: () => { autoRotate: boolean; autoRotateSpeed: number; enableZoom: boolean; minDistance: number }
}

export default function Globe3D({ goats, selectedGoat, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const globeRef = useRef<GlobeHandle | undefined>(undefined)
  const [size, setSize] = useState({ width: 600, height: 500 })

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) setSize({ width: entry.contentRect.width, height: entry.contentRect.height })
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Stylized night-pasture globe material rather than a satellite texture,
  // so the "world" reads as the herd's world, not literal earth imagery.
  const globeMaterial = useMemo(
    () => new THREE.MeshPhongMaterial({ color: new THREE.Color('#1B2317'), shininess: 3 }),
    [],
  )

  useEffect(() => {
    const globe = globeRef.current
    if (!globe) return
    globe.pointOfView({ lat: SHED.lat, lng: SHED.lng, altitude: 0.45 }, 0)
    const controls = globe.controls()
    if (controls) {
      controls.autoRotate = true
      controls.autoRotateSpeed = 0.35
      controls.enableZoom = true
      controls.minDistance = 120
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const globe = globeRef.current
    if (!globe || !selectedGoat) return
    const controls = globe.controls()
    if (controls) controls.autoRotate = false
    globe.pointOfView({ lat: selectedGoat.lat, lng: selectedGoat.lng, altitude: 0.22 }, 1200)
  }, [selectedGoat])

  const ringsData = useMemo(
    () => goats.filter((g) => g.mode === 'syncing').map((g) => ({ lat: g.lat, lng: g.lng })),
    [goats],
  )

  const pathsData = useMemo(
    () => (selectedGoat ? [selectedGoat.trail.map((p) => [p.lat, p.lng])] : []),
    [selectedGoat],
  )

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden">
      <Globe
        ref={globeRef as never}
        width={size.width}
        height={size.height}
        backgroundColor="rgba(0,0,0,0)"
        globeMaterial={globeMaterial}
        showAtmosphere
        atmosphereColor="#3C4633"
        atmosphereAltitude={0.18}
        pointsData={goats}
        pointLat="lat"
        pointLng="lng"
        pointColor={(d: object) => pinColorFor((d as Goat).mode, (d as Goat).batteryStatus)}
        pointAltitude={0.015}
        pointRadius={(d: object) => (selectedGoat?.id === (d as Goat).id ? 0.55 : 0.35)}
        pointLabel={(d: object) => `${(d as Goat).name} · ${(d as Goat).deviceId}`}
        onPointClick={(d: object) => onSelect((d as Goat).id)}
        ringsData={ringsData}
        ringLat="lat"
        ringLng="lng"
        ringColor={() => (t: number) => `rgba(95,168,211,${1 - t})`}
        ringMaxRadius={3}
        ringPropagationSpeed={2}
        ringRepeatPeriod={1300}
        pathsData={pathsData}
        pathPoints={(d: object) => d as [number, number][]}
        pathPointLat={(p: unknown) => (p as [number, number])[0]}
        pathPointLng={(p: unknown) => (p as [number, number])[1]}
        pathColor={() => ['rgba(232,178,60,0.08)', '#E8B23C']}
        pathDashLength={0.01}
        pathDashGap={0.004}
        pathDashAnimateTime={8000}
      />
      <Legend />
    </div>
  )
}
