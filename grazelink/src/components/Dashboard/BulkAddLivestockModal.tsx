import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiUpload, FiLayers } from 'react-icons/fi';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/context/ToastContext';
import {
  bulkImportLivestock,
  generateLivestockRows,
  getNextLivestockStart,
  parseLivestockCsv,
  ImportRow,
} from '@/services/bulkImport';

interface BulkAddLivestockModalProps {
  open: boolean;
  onClose: () => void;
}

const QUICK_COUNTS = [100, 500, 1000, 5000, 50000];

export default function BulkAddLivestockModal({ open, onClose }: BulkAddLivestockModalProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [count, setCount] = useState<number>(500);
  const [sheds, setSheds] = useState('Shed A, Shed B, Shed C, Shed D');
  const [csvName, setCsvName] = useState<string | null>(null);
  const [csvRows, setCsvRows] = useState<ImportRow[] | null>(null);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState('');

  const effectiveTotal = csvRows ? csvRows.length : count;

  useEffect(() => {
    if (open) {
      setCount(500);
      setSheds('Shed A, Shed B, Shed C, Shed D');
      setCsvName(null);
      setCsvRows(null);
      setRunning(false);
      setProgress(null);
      setError('');
      if (fileRef.current) fileRef.current.value = '';
    }
  }, [open]);

  const close = () => {
    if (running) return;
    onClose();
  };

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const rows = parseLivestockCsv(String(reader.result ?? ''));
        if (rows.length === 0) throw new Error('CSV has no data rows.');
        setCsvRows(rows);
        setCsvName(file.name);
        setError('');
      } catch (err) {
        setCsvRows(null);
        setCsvName(null);
        setError(err instanceof Error ? err.message : 'Could not read CSV file.');
      }
    };
    reader.readAsText(file);
  };

  const runImport = async () => {
    if (!user) return;
    const desired = csvRows ? csvRows.length : count;
    if (!Number.isInteger(desired) || desired < 1 || desired > 50000) {
      setError('Enter a whole number between 1 and 50,000.');
      return;
    }
    setRunning(true);
    setError('');
    setProgress({ done: 0, total: desired });
    try {
      const shedsList = sheds.split(',').map((s) => s.trim()).filter(Boolean);
      const opts = {
        farmName: user.displayName ? `${user.displayName}'s Farm` : 'Red valley Farm',
        owner: user.displayName || user.email || 'Farm Owner',
        sheds: shedsList,
      };

      let rows: ImportRow[];
      if (csvRows) {
        rows = csvRows.map((row, index) => ({
          ...row,
          farmName: row.farmName ?? opts.farmName,
          owner: row.owner ?? opts.owner,
          shedName: row.shedName ?? (shedsList.length ? shedsList[0] : undefined),
          livestockId: row.livestockId ?? `GT-${String(index + 1).padStart(5, '0')}`,
          collarId: row.collarId ?? `CL-${String(index + 1).padStart(5, '0')}`,
        }));
      } else {
        const start = await getNextLivestockStart(user.uid);
        rows = generateLivestockRows(desired, start, opts);
      }

      const written = await bulkImportLivestock(user.uid, rows, opts, (done, total) =>
        setProgress({ done, total }),
      );
      showToast('success', `${written.toLocaleString()} livestock added successfully.`);
      close();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not complete the bulk import.';
      setError(message);
      showToast('error', message);
    } finally {
      setRunning(false);
    }
  };

  const pct = progress ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={close}
        >
          <motion.div
            className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-card dark:bg-dark-card dark:text-white dark:shadow-dark-card md:p-8"
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-black/5 pb-4 dark:border-white/5">
              <div>
                <h2 className="text-xl font-bold text-ink dark:text-white">Bulk Add Livestock</h2>
                <p className="text-xs text-muted dark:text-dark-muted">
                  Generate a whole herd at once, or import from a CSV file.
                </p>
              </div>
              <button
                onClick={close}
                disabled={running}
                aria-label="Close"
                className="rounded-xl p-2 text-muted hover:bg-surface-light dark:text-dark-muted dark:hover:bg-dark-surface disabled:opacity-40"
              >
                <FiX className="text-xl" />
              </button>
            </div>

            <div className="mt-6 space-y-5">
              <div>
                <label className="text-xs font-semibold text-muted dark:text-dark-muted">
                  Number of livestock to add
                </label>
                <input
                  type="number"
                  min={1}
                  max={50000}
                  step={1}
                  disabled={running || Boolean(csvRows)}
                  value={csvRows ? csvRows.length : count}
                  onChange={(e) => setCount(Math.max(1, Number(e.target.value) || 0))}
                  className="mt-1 w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm text-ink outline-none transition-colors focus:border-primary disabled:opacity-50 dark:border-white/10 dark:bg-dark-surface dark:text-white"
                />
                <div className="mt-2 flex flex-wrap gap-2">
                  {QUICK_COUNTS.map((n) => (
                    <button
                      key={n}
                      type="button"
                      disabled={running || Boolean(csvRows)}
                      onClick={() => setCount(n)}
                      className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                        count === n && !csvRows
                          ? 'bg-primary text-white'
                          : 'border border-black/10 text-muted hover:text-ink dark:border-white/10 dark:text-dark-muted dark:hover:text-white'
                      }`}
                    >
                      {n.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted dark:text-dark-muted">
                  Shed names (comma separated)
                </label>
                <input
                  type="text"
                  disabled={running}
                  value={sheds}
                  onChange={(e) => setSheds(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm text-ink outline-none transition-colors focus:border-primary disabled:opacity-50 dark:border-white/10 dark:bg-dark-surface dark:text-white"
                  placeholder="Shed A, Shed B"
                />
              </div>

              <div>
                <span className="text-xs font-semibold text-muted dark:text-dark-muted">
                  Or import from a CSV file (optional)
                </span>
                <button
                  type="button"
                  disabled={running}
                  onClick={() => fileRef.current?.click()}
                  className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-black/15 px-4 py-3 text-sm font-semibold text-muted transition-colors hover:border-primary hover:text-primary disabled:opacity-50 dark:border-white/15 dark:text-dark-muted"
                >
                  <FiUpload /> {csvName ?? 'Choose CSV file...'}
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,text/csv"
                  hidden
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFile(file);
                  }}
                />
                {csvRows && (
                  <p className="mt-1 text-xs text-primary">
                    {csvRows.length.toLocaleString()} rows loaded from {csvName}. CSV rows override the count above.
                  </p>
                )}
              </div>

              <p className="rounded-2xl bg-amber-50 px-4 py-3 text-xs text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                Large imports count against Firestore write quota. The free Spark plan allows 20,000
                writes/day; enable Blaze billing for 50,000+ livestock.
              </p>

              {running && progress && (
                <div>
                  <div className="mb-1 flex items-center justify-between text-xs font-semibold text-muted dark:text-dark-muted">
                    <span>Importing...</span>
                    <span>
                      {progress.done.toLocaleString()} / {progress.total.toLocaleString()} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )}

              {error && <p className="text-sm text-rose-500">{error}</p>}

              <div className="mt-4 flex gap-3 border-t border-black/5 pt-4 dark:border-white/5">
                <button
                  onClick={runImport}
                  disabled={running || effectiveTotal < 1}
                  className="flex items-center gap-2 rounded-full bg-primary px-8 py-3 text-sm font-semibold text-white shadow-card transition-all hover:scale-[1.02] hover:bg-primary-dark disabled:opacity-60"
                >
                  <FiLayers /> {running ? 'Adding...' : `Add ${effectiveTotal.toLocaleString()} Livestock`}
                </button>
                <button
                  onClick={close}
                  disabled={running}
                  className="rounded-full border border-black/10 px-6 py-3 text-sm font-semibold text-ink transition-colors hover:border-primary hover:text-primary disabled:opacity-40 dark:border-white/10 dark:text-gray-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
