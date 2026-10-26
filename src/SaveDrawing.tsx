import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, Download, Heart, X } from 'lucide-react';
import { downloadDrawing, localDateStamp, makeKeepsake } from './drawingExport';
import './SaveDrawing.css';

export function SaveDrawing({ artwork, names: initialNames, theme, onClose }: {
  artwork: HTMLCanvasElement;
  names: string;
  theme: 'rose' | 'sage';
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const preview = useRef<HTMLCanvasElement>(null);
  const headingId = useId();
  const [format, setFormat] = useState<'drawing' | 'keepsake'>('keepsake');
  const [names, setNames] = useState(initialNames);
  const [withDate, setWithDate] = useState(true);
  const [date] = useState(() => new Date());
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const savingRef = useRef(false);
  const dateLabel = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
  const output = useMemo(() => format === 'drawing' ? artwork : makeKeepsake(artwork, {
    names, date: withDate ? dateLabel : '', theme,
  }), [artwork, format, names, withDate, dateLabel, theme]);

  useEffect(() => {
    const element = dialog.current!;
    element.showModal();
    return () => element.close();
  }, []);

  useEffect(() => {
    const element = preview.current;
    if (!element) return;
    element.width = output.width;
    element.height = output.height;
    element.getContext('2d')?.drawImage(output, 0, 0);
    setSaved(false);
  }, [output]);

  function close() {
    dialog.current?.close();
    onClose();
  }

  async function download() {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setError('');
    try {
      await downloadDrawing(output, `our-${format === 'keepsake' ? 'keepsake' : 'doodle'}-${localDateStamp(date)}.png`);
      setSaved(true);
    } catch {
      setError('The PNG could not be prepared. Please try again.');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  return (
    <dialog className="save-dialog" ref={dialog} aria-labelledby={headingId}
      onCancel={(event) => { event.preventDefault(); close(); }}
      onClick={(event) => { if (event.target === event.currentTarget) close(); }}>
      <div className="save-dialog-inner">
        <header className="save-heading">
          <div><span className="save-eyebrow"><Heart size={12} /> MADE BY US</span><h2 id={headingId}>Keep this little moment.</h2></div>
          <button type="button" className="icon-action" aria-label="Close save preview" onClick={close}><X size={20} /></button>
        </header>
        <div className="save-body">
          <div className="save-preview"><canvas ref={preview} role="img" aria-label={`${format === 'keepsake' ? 'Framed keepsake' : 'Drawing'} download preview`} /></div>
          <div className="save-options">
            <div className="save-format" role="group" aria-label="Download style">
              <button type="button" aria-pressed={format === 'drawing'} onClick={() => setFormat('drawing')}>Drawing only</button>
              <button type="button" aria-pressed={format === 'keepsake'} onClick={() => setFormat('keepsake')}>Keepsake <Heart size={13} /></button>
            </div>
            {format === 'keepsake' ? <div className="save-caption-fields">
              <label className="save-names">Names <span>(optional)</span>
                <input value={names} maxLength={64} onChange={(event) => setNames(event.target.value)} placeholder="Your names, together" autoComplete="off" />
              </label>
              <label className="save-date"><input type="checkbox" checked={withDate} onChange={(event) => setWithDate(event.target.checked)} /> Add today's date <span>{dateLabel}</span></label>
            </div> : <p className="save-description">Just your drawing, ready to keep.</p>}
            <div className="save-download-area">
              {error && <p className="save-error" role="alert">{error}</p>}
              <button type="button" className="save-download" onClick={download} disabled={saving}>
                {saved ? <Check size={18} /> : <Download size={18} />}{saving ? 'Preparing PNG…' : 'Download PNG'}
              </button>
              <p className="save-confirmation" role="status">{saved ? 'Your PNG is ready. Check your downloads ♡' : 'A little snapshot of this moment.'}</p>
            </div>
          </div>
        </div>
      </div>
    </dialog>
  );
}
