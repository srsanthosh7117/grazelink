import { useMemo, useState } from 'react';
import { FiFileText, FiDownload, FiTable } from 'react-icons/fi';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import EmptyState from '@/components/Dashboard/EmptyState';
import { useAllLivestock } from '@/hooks/useAllLivestock';
import { Livestock } from '@/types/livestock';

type Range = 'Daily' | 'Weekly' | 'Monthly' | 'Custom';

const COLUMNS: { key: keyof Livestock; label: string }[] = [
  { key: 'livestockId', label: 'Livestock ID' },
  { key: 'collarId', label: 'Collar ID' },
  { key: 'name', label: 'Name' },
  { key: 'breed', label: 'Breed' },
  { key: 'gender', label: 'Gender' },
  { key: 'age', label: 'Age (mo)' },
  { key: 'weight', label: 'Weight (kg)' },
  { key: 'healthStatus', label: 'Health' },
  { key: 'vaccinationStatus', label: 'Vaccination' },
  { key: 'shedName', label: 'Shed' },
  { key: 'owner', label: 'Owner' },
  { key: 'status', label: 'Status' },
  { key: 'battery', label: 'Battery (%)' },
  { key: 'temperature', label: 'Temp (°C)' },
  { key: 'lastSeen', label: 'Last Sync' },
];

function toTimestamp(livestock: Livestock): number | null {
  const ts = livestock.createdAt as { seconds?: number } | undefined;
  if (ts && typeof ts.seconds === 'number') return ts.seconds * 1000;
  return null;
}

function filterByRange(livestock: Livestock[], range: Range, customFrom: string, customTo: string) {
  if (range === 'Custom') {
    if (!customFrom || !customTo) return livestock;
    const from = new Date(customFrom).getTime();
    const to = new Date(customTo).getTime() + 24 * 60 * 60 * 1000 - 1;
    return livestock.filter((g) => {
      const t = toTimestamp(g);
      return t === null ? true : t >= from && t <= to;
    });
  }

  const days = range === 'Daily' ? 1 : range === 'Weekly' ? 7 : 30;
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return livestock.filter((g) => {
    const t = toTimestamp(g);
    return t === null ? true : t >= cutoff;
  });
}

function rowsFor(livestock: Livestock[]) {
  return livestock.map((g) =>
    COLUMNS.map(({ key }) => {
      const v = g[key];
      return v === undefined || v === null ? '' : String(v);
    })
  );
}

export default function Reports() {
  const { livestock, loading } = useAllLivestock();
  const [range, setRange] = useState<Range>('Daily');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const filtered = useMemo(
    () => filterByRange(livestock, range, customFrom, customTo),
    [livestock, range, customFrom, customTo]
  );

  const headers = COLUMNS.map((c) => c.label);

  const handleExport = (format: 'Excel' | 'CSV' | 'PDF') => {
    const rows = rowsFor(filtered);
    const filenameBase = `grazelink-${range.toLowerCase()}-report-${new Date().toISOString().slice(0, 10)}`;

    if (format === 'Excel') {
      const sheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, sheet, 'Livestock Report');
      XLSX.writeFile(workbook, `${filenameBase}.xlsx`);
    }

    if (format === 'CSV') {
      const sheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      const csv = XLSX.utils.sheet_to_csv(sheet);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filenameBase}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }

    if (format === 'PDF') {
      const doc = new jsPDF({ orientation: 'landscape' });
      doc.setFontSize(14);
      doc.text('GrazeLink Livestock & Telemetry Report', 14, 16);
      doc.setFontSize(9);
      doc.text(`Time Range: ${range}  ·  Generated: ${new Date().toLocaleString()}`, 14, 22);
      autoTable(doc, {
        head: [headers],
        body: rows,
        startY: 26,
        styles: { fontSize: 7, cellPadding: 2 },
        headStyles: { fillColor: [34, 197, 94] },
      });
      doc.save(`${filenameBase}.pdf`);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink dark:text-white md:text-3xl">
          Reports &amp; Data Export
        </h1>
        <p className="mt-1 text-sm text-muted dark:text-dark-muted">
          Generate, preview, and export authenticated livestock telemetry records.
        </p>
      </div>

      {/* Date Filter & Export Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-black/5 bg-white p-6 shadow-soft dark:border-white/5 dark:bg-dark-card dark:shadow-dark-card">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-1.5 rounded-full bg-surface-light p-1.5 dark:bg-dark-surface">
            {(['Daily', 'Weekly', 'Monthly', 'Custom'] as Range[]).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`rounded-full px-5 py-2 text-xs font-semibold transition-all ${
                  range === r
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-muted hover:text-ink dark:text-dark-muted dark:hover:text-white'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          {range === 'Custom' && (
            <div className="flex items-center gap-2 rounded-2xl bg-surface-light px-4 py-2 text-xs dark:bg-dark-surface">
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="bg-transparent outline-none text-ink dark:text-white"
              />
              <span className="text-muted dark:text-dark-muted">to</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="bg-transparent outline-none text-ink dark:text-white"
              />
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {(['Excel', 'CSV', 'PDF'] as const).map((format) => (
            <button
              key={format}
              onClick={() => handleExport(format)}
              disabled={filtered.length === 0}
              className="flex items-center gap-2 rounded-full border border-black/10 bg-white px-5 py-2.5 text-xs font-bold text-ink transition-all hover:border-primary hover:text-primary disabled:opacity-40 dark:border-white/10 dark:bg-dark-surface dark:text-white dark:hover:border-primary dark:hover:text-primary-light"
            >
              <FiDownload /> Export {format}
            </button>
          ))}
        </div>
      </div>

      {/* Table Preview */}
      <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-soft dark:border-white/5 dark:bg-dark-card dark:shadow-dark-card">
        <h2 className="font-bold text-ink dark:text-white flex items-center gap-2 mb-4">
          <FiTable className="text-primary" /> Report Preview ({filtered.length} Records)
        </h2>

        {loading ? (
          <div className="h-40 animate-pulse rounded-2xl bg-black/5 dark:bg-white/5" />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={FiFileText}
            title="No Records Found"
            description="No livestock telemetry records matched the selected range."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-black/10 dark:border-white/10 text-muted dark:text-dark-muted font-bold">
                  {COLUMNS.map((col) => (
                    <th key={col.key} className="pb-3 pr-4">
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 dark:divide-white/5">
                {filtered.map((g) => (
                  <tr key={g.id} className="hover:bg-surface-light/50 dark:hover:bg-dark-surface/50">
                    <td className="py-3 pr-4 font-bold text-ink dark:text-white">{g.livestockId}</td>
                    <td className="py-3 pr-4 text-muted dark:text-dark-muted">{g.collarId}</td>
                    <td className="py-3 pr-4 font-semibold text-ink dark:text-gray-200">{g.name || '—'}</td>
                    <td className="py-3 pr-4">{g.breed}</td>
                    <td className="py-3 pr-4">{g.gender}</td>
                    <td className="py-3 pr-4">{g.age} mo</td>
                    <td className="py-3 pr-4">{g.weight} kg</td>
                    <td className="py-3 pr-4 font-medium text-emerald-600 dark:text-emerald-400">{g.healthStatus}</td>
                    <td className="py-3 pr-4">{g.vaccinationStatus}</td>
                    <td className="py-3 pr-4">{g.shedName}</td>
                    <td className="py-3 pr-4">{g.owner || '—'}</td>
                    <td className="py-3 pr-4">{g.status ?? 'Offline'}</td>
                    <td className="py-3 pr-4">{g.battery != null ? `${g.battery}%` : '—'}</td>
                    <td className="py-3 pr-4">{g.temperature != null ? `${g.temperature}°C` : '—'}</td>
                    <td className="py-3 pr-4 text-muted dark:text-dark-muted">{g.lastSeen || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
