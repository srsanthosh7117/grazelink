const ITEMS = [
  { hex: '#5FA8D3', label: 'Syncing / synced (Wi-Fi)' },
  { hex: '#E8B23C', label: 'Grazing mode' },
  { hex: '#D1553D', label: 'Battery low or critical' },
  { hex: '#5C6152', label: 'Offline' },
]

export default function Legend() {
  return (
    <div className="absolute bottom-4 left-4 rounded-lg border border-pasture-700 bg-pasture-900/80 px-3 py-2 backdrop-blur">
      <p className="mb-1.5 text-[10px] uppercase tracking-wide text-bone-500">
        Pin color &middot; matches collar LED
      </p>
      <ul className="space-y-1">
        {ITEMS.map((item) => (
          <li key={item.label} className="flex items-center gap-2 text-[11px] text-bone-300">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: item.hex }}
            />
            {item.label}
          </li>
        ))}
      </ul>
    </div>
  )
}
