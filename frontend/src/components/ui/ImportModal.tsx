import { useRef, useState } from 'react';
import { Upload, Download, Loader2, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { parseCSV, downloadCSV, toCSV } from '@/lib/csv';

interface Column { key: string; label: string; required?: boolean }

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  columns: Column[];
  onImport: (rows: Record<string, string>[]) => Promise<{ ok: number; failed: number }>;
}

type Step = 'upload' | 'preview' | 'result';

export default function ImportModal({ open, onClose, title, columns, onImport }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>('upload');
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [result, setResult] = useState<{ ok: number; failed: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleClose = () => {
    setStep('upload'); setRows([]); setResult(null); setError(null);
    onClose();
  };

  const downloadTemplate = () => {
    const template = toCSV([{}], columns);
    downloadCSV(template, `template_${title.toLowerCase().replace(/\s/g, '_')}.csv`);
  };

  const handleFile = (file: File) => {
    setError(null);
    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target?.result as string;
      const parsed = parseCSV(text);
      if (!parsed.length) { setError('Arquivo vazio ou formato inválido.'); return; }
      setRows(parsed);
      setStep('preview');
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const res = await onImport(rows);
      setResult(res);
      setStep('result');
    } catch (err: any) {
      setError(err?.message ?? 'Erro ao importar.');
    } finally {
      setLoading(false);
    }
  };

  const previewCols = columns.slice(0, 4);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(3px)' }}
      onClick={handleClose}>
      <div className="w-full max-w-lg animate-fade-up"
        style={{ background: 'var(--surface)', border: '1px solid var(--edge-strong)', borderRadius: 12, boxShadow: 'var(--shadow-xl)' }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4" style={{ borderBottom: '1px solid var(--edge)' }}>
          <h2 className="text-[15px] font-semibold" style={{ color: 'var(--ink-1)', letterSpacing: '-0.01em' }}>
            Importar {title}
          </h2>
          <button onClick={handleClose} className="p-1.5 rounded-md" style={{ color: 'var(--ink-3)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-hover)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <X className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>

        <div className="px-5 py-5 space-y-4">
          {/* Step: upload */}
          {step === 'upload' && (
            <>
              <button onClick={downloadTemplate}
                className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg w-full justify-center"
                style={{ background: 'var(--brand-50)', color: 'var(--brand-500)', border: '1px solid rgba(99,91,255,0.2)' }}>
                <Download className="w-3.5 h-3.5" strokeWidth={2} />
                Baixar template CSV
              </button>

              <div onDrop={handleDrop} onDragOver={e => e.preventDefault()}
                onClick={() => fileRef.current?.click()}
                className="flex flex-col items-center justify-center gap-3 rounded-xl cursor-pointer transition-colors py-10"
                style={{ border: '2px dashed var(--edge-strong)', background: 'var(--surface-hover)' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--brand-500)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--edge-strong)')}>
                <Upload className="w-7 h-7" style={{ color: 'var(--ink-3)' }} strokeWidth={1.5} />
                <div className="text-center">
                  <p className="text-sm font-medium" style={{ color: 'var(--ink-2)' }}>Arraste o CSV ou clique para selecionar</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--ink-3)' }}>Apenas arquivos .csv</p>
                </div>
                <input ref={fileRef} type="file" accept=".csv" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg"
                  style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}>
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {error}
                </div>
              )}

              <div>
                <p className="text-[11px] font-medium mb-1" style={{ color: 'var(--ink-3)' }}>Colunas esperadas:</p>
                <div className="flex flex-wrap gap-1">
                  {columns.map(c => (
                    <span key={c.key} className="text-[10px] px-2 py-0.5 rounded-full"
                      style={{ background: c.required ? 'var(--brand-50)' : 'var(--surface-hover)', color: c.required ? 'var(--brand-500)' : 'var(--ink-3)', border: '1px solid var(--edge)' }}>
                      {c.label}{c.required ? ' *' : ''}
                    </span>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Step: preview */}
          {step === 'preview' && (
            <>
              <p className="text-xs" style={{ color: 'var(--ink-3)' }}>
                {rows.length} linha{rows.length !== 1 ? 's' : ''} encontrada{rows.length !== 1 ? 's' : ''}. Pré-visualização:
              </p>
              <div className="overflow-x-auto rounded-lg" style={{ border: '1px solid var(--edge)' }}>
                <table className="w-full text-[11px]">
                  <thead>
                    <tr style={{ background: 'var(--surface-hover)', borderBottom: '1px solid var(--edge)' }}>
                      {previewCols.map(c => (
                        <th key={c.key} className="px-3 py-2 text-left font-medium" style={{ color: 'var(--ink-2)' }}>{c.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 5).map((row, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--edge)' }}>
                        {previewCols.map(c => (
                          <td key={c.key} className="px-3 py-2 truncate max-w-[120px]" style={{ color: 'var(--ink-1)' }}>
                            {row[c.label] || row[c.key] || '—'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {error && (
                <div className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg"
                  style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}>
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {error}
                </div>
              )}
              <div className="flex gap-2 pt-1">
                <button onClick={() => setStep('upload')} className="btn-ghost flex-1">Voltar</button>
                <button onClick={handleConfirm} disabled={loading} className="btn-primary flex-1">
                  {loading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Importando...</> : `Importar ${rows.length} registros`}
                </button>
              </div>
            </>
          )}

          {/* Step: result */}
          {step === 'result' && result && (
            <div className="text-center space-y-4 py-2">
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto"
                style={{ background: result.failed === 0 ? 'var(--success-bg)' : 'var(--warning-bg)' }}>
                <CheckCircle2 className="w-7 h-7" style={{ color: result.failed === 0 ? 'var(--success)' : 'var(--warning)' }} />
              </div>
              <div>
                <p className="font-semibold text-base" style={{ color: 'var(--ink-1)' }}>Importação concluída</p>
                <p className="text-sm mt-1" style={{ color: 'var(--ink-3)' }}>
                  <span style={{ color: 'var(--success)' }}>{result.ok} importados</span>
                  {result.failed > 0 && <> · <span style={{ color: 'var(--danger)' }}>{result.failed} com erro</span></>}
                </p>
              </div>
              <button onClick={handleClose} className="btn-primary mx-auto">Fechar</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
