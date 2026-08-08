import { PawPrint, Wifi } from 'lucide-react'
import { SHED } from '../data/mockData'

export default function Header({ wifiConnected }: { wifiConnected: boolean }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-pasture-700 px-6 py-4">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-signal-yellow/10 text-signal-yellow">
          <PawPrint size={18} strokeWidth={2.2} />
        </div>
        <div>
          <h1 className="font-display text-lg font-semibold leading-none tracking-tight">
            AaduTrack
          </h1>
          <p className="mt-1 text-xs text-bone-500">{SHED.name}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-full border border-pasture-700 bg-pasture-900 px-3 py-1.5 font-mono text-xs">
        <Wifi
          size={14}
          className={wifiConnected ? 'text-signal-blue' : 'text-bone-500'}
          strokeWidth={2.2}
        />
        <span className={wifiConnected ? 'text-signal-blue' : 'text-bone-500'}>
          {wifiConnected ? 'Shed Wi-Fi connected' : 'Shed Wi-Fi out of range'}
        </span>
      </div>
    </header>
  )
}
