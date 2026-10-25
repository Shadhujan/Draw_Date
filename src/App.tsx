import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft, ArrowUpRight, Check, ChevronDown, ChevronLeft, ChevronRight, Copy, Download, Eraser, Eye,
  EyeOff, Heart, Lasso, Leaf, Link2, Paintbrush, PaintBucket, Palette, Pipette, RotateCcw, Sparkles, Trash2, UsersRound, X,
} from 'lucide-react';
import { HeroStage } from './hero/HeroStage';
import { createRoomId, isRoomId } from './board';
import { DrawingCanvas, type CanvasHandle } from './Canvas';
import { brushChoices, paintStroke } from './brushes';
import { getHexChannels, setHexChannel } from './colorPaint';
import { lessonSteps, traceCoverage } from './guidedLesson';
import { makeSmartFill } from './smartFill';
import { makeLassoPaint } from './lassoPaint';
import { GuideArt, templates } from './templates';
import type { BlendMode, BrushStyle, CanvasMode, PaintGradient, Point, Stroke, TemplateId } from './types';
import { useRoom } from './useRoom';

type Theme = 'rose' | 'sage';
const themeStorageKey = 'draw-date-theme';

const colors = [
  { name: 'Rose', value: '#DB84A2' },
  { name: 'Lilac', value: '#9E88D0' },
  { name: 'Sky', value: '#6B9FCD' },
  { name: 'Sage', value: '#7EA78A' },
  { name: 'Honey', value: '#DAAA65' },
  { name: 'Cocoa', value: '#745B56' },
];

function initialTheme(): Theme {
  try { return localStorage.getItem(themeStorageKey) === 'sage' ? 'sage' : 'rose'; }
  catch { return 'rose'; }
}

function roomUrl(room: string) {
  const url = new URL(window.location.origin + window.location.pathname);
  url.searchParams.set('room', room);
  return url.toString();
}

function Emblem() {
  return (
    <span className="emblem" aria-hidden="true">
      <Heart size={20} fill="currentColor" strokeWidth={1.7} />
      <span className="emblem-stroke" />
    </span>
  );
}

function ThemeSwitch({ theme, onChange }: { theme: Theme; onChange: (theme: Theme) => void }) {
  return (
    <div className="theme-switch" role="group" aria-label="Choose your color theme">
      <button type="button" aria-label="Pink romance theme" aria-pressed={theme === 'rose'}
        title="Pink romance" className={theme === 'rose' ? 'active' : ''}
        onClick={() => onChange('rose')}>
        <Heart size={15} fill={theme === 'rose' ? 'currentColor' : 'none'} /> <span>Pink</span>
      </button>
      <button type="button" aria-label="Sage green theme" aria-pressed={theme === 'sage'}
        title="Sage green" className={theme === 'sage' ? 'active' : ''}
        onClick={() => onChange('sage')}>
        <Leaf size={15} /> <span>Sage</span>
      </button>
    </div>
  );
}

function Avatar({ name, alt = false }: { name: string; alt?: boolean }) {
  return <span className={`avatar ${alt ? 'avatar-alt' : ''}`} title={name}>{name.trim().slice(0, 1).toUpperCase() || '?'}</span>;
}

function BrushPreview({ brush, color, gradient, blend }: {
  brush: BrushStyle; color: string; gradient?: PaintGradient; blend: BlendMode;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = ref.current?.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, 180, 64);
    ctx.setTransform(2, 0, 0, 2, 0, 0);
    const stroke: Stroke = {
      id: `sample-${brush}`, by: 'preview', tool: 'pen', brush, color,
      size: brush === 'airbrush' ? 11 : 8, opacity: 1, gradient, blend,
      points: [
        { x: 7, y: 24, p: 0.35 }, { x: 21, y: 20, p: 0.55 },
        { x: 35, y: 12, p: 0.95 }, { x: 52, y: 13, p: 0.9 },
        { x: 71, y: 22, p: 0.45 }, { x: 83, y: 18, p: 0.65 },
      ],
    };
    paintStroke(ctx, stroke);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }, [brush, color, gradient?.to, gradient?.angle, blend]);
  return <canvas ref={ref} className="brush-preview" width={180} height={64} aria-hidden="true" />;
}

function Welcome({ room, theme, onThemeChange, onStart }: {
  room: string | null;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  onStart: (name: string, id: string) => void;
}) {
  const [name, setName] = useState(() => {
    try { return localStorage.getItem('doodle-date-name') || ''; }
    catch { return ''; }
  });
  const [error, setError] = useState('');

  function enter() {
    const cleaned = name.trim().replace(/\s+/g, ' ').slice(0, 24);
    if (!cleaned) { setError('Add a little nickname before we begin.'); return; }
    try { localStorage.setItem('doodle-date-name', cleaned); } catch { /* Nickname saving is optional. */ }
    onStart(cleaned, room && isRoomId(room) ? room : createRoomId());
  }

  return (
    <div className="welcome-screen">
      <div className="ambient-orb orb-one" aria-hidden="true" />
      <div className="ambient-orb orb-two" aria-hidden="true" />
      <header className="welcome-nav">
        <div className="brand-lockup"><Emblem /><span>draw date<small>just us & a canvas</small></span></div>
        <div className="nav-actions"><span className="top-caption">A tiny world, just for two ♡</span><ThemeSwitch theme={theme} onChange={onThemeChange} /></div>
      </header>
      <main className="welcome-main">
        <section className="welcome-copy">
          <div className="eyebrow"><Sparkles size={15} /> FOR THE LITTLE MOMENTS TOGETHER</div>
          <h1>Draw together.<br /><em>Stay a little closer.</em></h1>
          <p>A cozy little art studio for you and your favorite person. Make a mess, make a memory, make something yours.</p>
          <div className="welcome-form">
            <label htmlFor="name">Your little nickname</label>
            <input id="name" autoComplete="nickname" maxLength={24} value={name}
              placeholder="What should we call you?" onChange={(event) => { setName(event.target.value); setError(''); }}
              onKeyDown={(event) => { if (event.key === 'Enter') enter(); }} />
            {error && <span className="form-error" role="alert">{error}</span>}
            <button className="primary-btn" onClick={enter}>
              {room ? 'Join the drawing date' : 'Start drawing together'}
              <span className="button-icon"><ArrowUpRight size={19} /></span>
            </button>
            <span className="form-note">No account form needed. Your room link is just for the two of you.</span>
          </div>
          <div className="welcome-whisper"><Heart size={14} fill="currentColor" /> The sweetest things are made together.</div>
        </section>
        <HeroStage theme={theme} />
      </main>
      <footer className="welcome-footer"><span>Made for slow evenings, soft smiles, and messy doodles.</span><span>♡</span></footer>
    </div>
  );
}

function Studio({ roomId, name, theme, onThemeChange, onExit }: {
  roomId: string;
  name: string;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  onExit: () => void;
}) {
  const room = useRoom(roomId, name);
  const [tool, setTool] = useState<CanvasMode>('pen');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [brush, setBrush] = useState<BrushStyle>('ink');
  const [opacity, setOpacity] = useState(100);
  const [color, setColor] = useState(colors[0].value);
  const [colorLabOpen, setColorLabOpen] = useState(false);
  const [paintMode, setPaintMode] = useState<'solid' | 'gradient'>('solid');
  const [secondColor, setSecondColor] = useState('#A5C9A8');
  const [gradientAngle, setGradientAngle] = useState(0);
  const [blendMode, setBlendMode] = useState<BlendMode>('normal');
  const [size, setSize] = useState(12);
  const [guideVisible, setGuideVisible] = useState(true);
  const [fillMessage, setFillMessage] = useState('Tap inside a closed shape to fill it.');
  const [fillBusy, setFillBusy] = useState(false);
  const filling = useRef(false);
  const [traceProgress, setTraceProgress] = useState(0);
  const [copyState, setCopyState] = useState(false);
  const canvas = useRef<CanvasHandle>(null);
  const full = room.connection === 'full';
  const onlinePartner = useMemo(() => room.members.find((member) => member.id !== room.myId), [room.members, room.myId]);
  const visibleSelected = useMemo(() => {
    const visible = new Set(room.board.strokes.filter((stroke) => !stroke.hidden).map((stroke) => stroke.id));
    return selectedIds.filter((id) => visible.has(id));
  }, [selectedIds, room.board.strokes]);
  useEffect(() => {
    if (visibleSelected.length !== selectedIds.length) setSelectedIds(visibleSelected);
  }, [selectedIds, visibleSelected]);
  const canDraw = !full && room.connection !== 'error' && room.connection !== 'expired';
  const gradient = paintMode === 'gradient' ? { to: secondColor, angle: gradientAngle } : undefined;
  const colorPreview = gradient
    ? `linear-gradient(${90 + gradientAngle}deg, ${color}, ${secondColor})` : color;
  const rgb = getHexChannels(color);
  const guided = lessonSteps[room.board.template];
  const step = Math.min(guided.length - 1, room.board.lessonStep ?? 0);
  const currentLesson = guided[Math.max(0, step)];

  useEffect(() => {
    if (!guideVisible || !guided.length) { setTraceProgress(0); return; }
    const frame = requestAnimationFrame(() => {
      const svg = document.querySelector<SVGSVGElement>('.canvas-shell .guide-layer');
      setTraceProgress(traceCoverage(svg, step, room.board.strokes));
    });
    return () => cancelAnimationFrame(frame);
  }, [guideVisible, step, guided.length, room.board.strokes, room.board.template]);

  async function fillAt(at: Point) {
    if (!canDraw || filling.current) return;
    filling.current = true;
    setFillBusy(true);
    setFillMessage('Finding the little space…');
    const revision = room.board.revision;
    try {
      const guide = guideVisible ? document.querySelector<SVGSVGElement>('.canvas-shell .guide-layer') : null;
      const result = await makeSmartFill(room.board.strokes, guide, at, {
        id: crypto.randomUUID(), by: room.myId, color, opacity: opacity / 100,
        ...(gradient ? { gradient } : {}), blend: blendMode,
      });
      if (result.ok) {
        setFillMessage(room.addFill(result.stroke, revision)
          ? 'A little splash of color ♡' : 'The page changed. Tap again to fill.');
      } else {
        setFillMessage(result.reason === 'unavailable'
          ? 'Color fill is unavailable on this device.'
          : 'This area is open. Draw a closed outline first ♡');
      }
    } finally {
      filling.current = false;
      setFillBusy(false);
    }
  }

  function fillLasso(outline: Point[]) {
    if (!canDraw) return;
    const stroke = makeLassoPaint(outline, {
      id: crypto.randomUUID(), by: room.myId, color, opacity: opacity / 100,
      ...(gradient ? { gradient } : {}), blend: blendMode,
    });
    if (stroke) room.addFill(stroke, room.board.revision);
  }

  function chooseTool(next: CanvasMode) {
    setTool(next);
    if (next !== 'lasso') setSelectedIds([]);
  }

  function removeSelected() {
    if (!canDraw || !visibleSelected.length) return;
    room.deleteSelection(visibleSelected);
    setSelectedIds([]);
  }

  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(roomUrl(roomId));
      setCopyState(true);
      window.setTimeout(() => setCopyState(false), 2000);
    } catch {
      window.prompt('Copy your room link:', roomUrl(roomId));
    }
  }

  function reset(template: TemplateId) {
    if (template === room.board.template && room.board.strokes.length === 0 && (room.board.lessonStep ?? 0) === 0) return;
    if (room.board.strokes.length && !window.confirm('Start a fresh page for both of you? Save this one first if you want to keep it.')) return;
    setSelectedIds([]);
    room.changeTemplate(template);
  }

  return (
    <div className="studio-screen">
      <header className="studio-header">
        <div className="studio-brand"><Emblem /><div><strong>draw date</strong><span>your little art studio</span></div></div>
        <div className="studio-header-actions">
          <ThemeSwitch theme={theme} onChange={onThemeChange} />
          <button className="leave-button" aria-label="Leave drawing studio" onClick={onExit}><ArrowLeft size={17} /><span>Leave</span></button>
        </div>
      </header>

      <main className="studio-layout">
        <section className="studio-main">
          <div className="studio-heading">
            <div>
              <div className="eyebrow compact"><Heart size={12} fill="currentColor" /> OUR LITTLE ART DATE</div>
              <h1>Today's little <em>masterpiece.</em></h1>
              <p>One canvas. Two hearts. No perfect lines needed.</p>
            </div>
            <button className="invite-btn" onClick={copyInvite} aria-label={copyState ? 'Room link copied' : 'Copy invitation link'}>
              <Link2 size={16} /> <span>{copyState ? 'Link copied' : 'Invite your person'}</span>{copyState ? <Check size={15} /> : <ArrowUpRight size={15} />}
            </button>
          </div>

          <div className="paper-frame">
            <div className="paper-header">
              <div className="paper-header-title"><span className="paper-flower">✿</span><span>OUR CANVAS</span></div>
              <button className={`guide-chip ${guideVisible ? 'active' : ''}`} aria-pressed={guideVisible} onClick={() => setGuideVisible((value) => !value)}>
                {guideVisible ? <Eye size={14} /> : <EyeOff size={14} />} <span>{guideVisible ? 'Hints on' : 'Hints off'}</span>
              </button>
            </div>
            <div className={`canvas-shell ${!canDraw ? 'canvas-locked' : ''}`}>
              {guideVisible && <GuideArt template={room.board.template} className="guide-layer" step={step} />}
              <DrawingCanvas key={room.board.revision} ref={canvas} strokes={room.board.strokes}
                remoteDrafts={room.remoteDrafts} draftVersion={room.draftVersion} myId={room.myId}
                mode={tool} selectedIds={visibleSelected} onSelectionChange={setSelectedIds}
                onMoveSelection={room.moveSelection} onDeleteSelection={removeSelected}
                brush={brush} opacity={opacity / 100} color={color} size={size} disabled={!canDraw}
                gradientTo={gradient?.to ?? null} gradientAngle={gradientAngle} blend={blendMode}
                onPickColor={(sampled) => { setColor(sampled); setTool('pen'); }} onFill={fillAt} onLassoPaint={fillLasso}
                onStart={room.begin} onPoints={room.points} onEnd={room.end} onCursor={room.sendCursor} />
              {room.cursors.filter((cursor) => cursor.by !== room.myId).map((cursor) => (
                <div className="remote-cursor" key={cursor.by} style={{ left: `${cursor.x / 10}%`, top: `${cursor.y / 7}%` }}>
                  <Paintbrush size={15} fill="#e7cde0" color="#856bc2" /><span>{cursor.name}</span>
                </div>
              ))}
              {room.reactions.map((reaction, i) => (
                <span key={reaction.id} className="floating-reaction" style={{ right: `${24 + i * 16}%` }}><b>{reaction.value}</b><small>{reaction.name}</small></span>
              ))}
              {full && <div className="full-overlay"><UsersRound size={27} /><strong>This studio is for two.</strong><span>Both places are taken right now.</span></div>}
              {(room.connection === 'error' || room.connection === 'expired') && <div className="full-overlay"><strong>{room.connection === 'expired' ? 'This invitation has expired' : 'Connection unavailable'}</strong><span>{room.connection === 'expired' ? 'Start a new drawing date from the home screen.' : 'Check your Supabase configuration and connection. Your local drawing is saved.'}</span></div>}
            </div>
            {guideVisible && currentLesson && <div className="lesson-stepper" aria-label="Guided drawing steps">
              <button className="lesson-nav" type="button" title="Previous drawing step"
                aria-label="Previous drawing step" disabled={step <= 0 || !canDraw}
                onClick={() => room.setLessonStep(step - 1)}><ChevronLeft size={18} /></button>
              <div className="lesson-step-copy">
                <div className="lesson-step-line"><span className="lesson-counter">STEP {step + 1} / {guided.length}</span><strong>{currentLesson.title}</strong><span className="lesson-coverage">{traceProgress}% traced</span></div>
                <p>{currentLesson.hint}</p>
                <div className="lesson-track" role="progressbar" aria-label="Reference-line tracing coverage"
                  aria-valuemin={0} aria-valuemax={100} aria-valuenow={traceProgress}>
                  <span style={{ width: `${traceProgress}%` }} />
                </div>
              </div>
              <button className="lesson-nav next" type="button" title="Next drawing step"
                aria-label="Next drawing step" disabled={step >= guided.length - 1 || !canDraw}
                onClick={() => room.setLessonStep(step + 1)}><ChevronRight size={18} /></button>
            </div>}
            <div className="canvas-footer"><span>{tool === 'lasso-paint' ? 'Trace a shape to paint it instantly ♡' : tool === 'lasso' ? 'Circle ink to move or duplicate it ♡' : tool === 'picker' ? 'Tap a color on the canvas to pick it ✿' : tool === 'fill' ? fillMessage : 'Little strokes, big feelings ♡'}</span><span>{room.board.strokes.filter((stroke) => !stroke.hidden).length} strokes</span></div>
          </div>

          <div className="tools-bar" role="toolbar" aria-label="Drawing tools">
            <div className="tools-top-row">
              <div className="tool-mode" aria-label="Brush, eraser, fill, lasso draw and selection">
                <button className={`tool-btn ${tool === 'pen' ? 'selected' : ''}`} title="Brush" aria-label="Brush" aria-pressed={tool === 'pen'} onClick={() => chooseTool('pen')}><Paintbrush size={18} /><span>Brush</span></button>
                <button className={`tool-btn ${tool === 'eraser' ? 'selected' : ''}`} title="Eraser" aria-label="Eraser" aria-pressed={tool === 'eraser'} onClick={() => chooseTool('eraser')}><Eraser size={18} /><span>Eraser</span></button>
                <button className={`tool-btn ${tool === 'fill' ? 'selected' : ''}`} title="Smart fill inside closed shapes" aria-label="Smart fill" aria-pressed={tool === 'fill'} disabled={fillBusy} onClick={() => chooseTool('fill')}><PaintBucket size={18} /><span>Fill</span></button>
                <button className={`tool-btn ${tool === 'lasso-paint' ? 'selected' : ''}`} title="Draw a filled shape with a freehand lasso" aria-label="Lasso draw" aria-pressed={tool === 'lasso-paint'} onClick={() => chooseTool('lasso-paint')}><Lasso size={18} /><span>Lasso draw</span></button>
                <button className={`tool-btn ${tool === 'lasso' ? 'selected' : ''}`} title="Select and move artwork" aria-label="Select artwork" aria-pressed={tool === 'lasso'} onClick={() => chooseTool('lasso')}><Lasso size={18} /><span>Select</span></button>
              </div>
              <label className="size-slider"><span>Size</span><input aria-label="Brush size" type="range" min={2} max={34} step={1} value={size} disabled={tool === 'lasso' || tool === 'lasso-paint' || tool === 'fill'} onChange={(event) => setSize(Number(event.target.value))} /><span className="size-value">{size}</span></label>
              <div className="tool-actions">
                <button className="icon-action" aria-label="Undo last action" title="Undo last action" disabled={!room.canUndo || !canDraw} onClick={room.undo}><RotateCcw size={18} /></button>
                <button className="icon-action save-action" aria-label="Download drawing as PNG" title="Download drawing as PNG" onClick={() => canvas.current?.save(guideVisible ? document.querySelector<SVGSVGElement>('.guide-layer') : null)}><Download size={18} /></button>
              </div>
            </div>
            {tool === 'lasso' ? (
              <div className="selection-shelf" role="group" aria-label="Lasso selection actions">
                <span className="selection-symbol" aria-hidden="true"><Lasso size={20} /></span>
                <div className="selection-copy">
                  <strong>{visibleSelected.length ? `${visibleSelected.length} ${visibleSelected.length === 1 ? 'stroke' : 'strokes'} selected` : 'Circle a little doodle'}</strong>
                  <span>{visibleSelected.length ? 'Drag the dotted outline to move it.' : 'Draw a loop around your brush strokes.'}</span>
                </div>
                {visibleSelected.length > 0 && <div className="selection-actions">
                  <button type="button" disabled={!canDraw} onClick={() => {
                    const copies = room.duplicateSelection(visibleSelected);
                    if (copies.length) setSelectedIds(copies);
                  }}><Copy size={15} /> <span>Duplicate</span></button>
                  <button type="button" disabled={!canDraw} className="selection-delete" onClick={removeSelected}><Trash2 size={15} /> <span>Delete</span></button>
                  <button type="button" onClick={() => setSelectedIds([])}><X size={15} /> <span>Clear</span></button>
                </div>}
              </div>
            ) : <>
            <div className="brush-collection">
              <div className="brush-collection-heading">
                <span className="brush-collection-title">BRUSH LIBRARY <span aria-hidden="true">✳</span></span>
                <label className="opacity-control">
                  <span>Opacity</span>
                  <input aria-label="Brush opacity" type="range" min={10} max={100} step={5}
                    value={opacity} disabled={tool === 'eraser'} onChange={(event) => setOpacity(Number(event.target.value))} />
                  <output>{opacity}%</output>
                </label>
              </div>
              <div className="brush-choices" role="group" aria-label="Brush styles">
                {brushChoices.map((choice) => (
                  <button type="button" key={choice.id}
                    className={`brush-option ${brush === choice.id && tool === 'pen' ? 'active' : ''}`}
                    title={choice.description} aria-label={`${choice.name} brush: ${choice.description}`}
                    aria-pressed={brush === choice.id && tool === 'pen'}
                    onClick={() => { setBrush(choice.id); chooseTool('pen'); }}>
                    <BrushPreview brush={choice.id} color={color} gradient={gradient} blend={blendMode} />
                    <span>{choice.name}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="tools-bottom-row">
              <span className="palette-label">COLORS</span>
              <div className="swatches" aria-label="Drawing colors">
                {colors.map((option) => <button key={option.value} title={option.name} aria-label={option.name}
                  aria-pressed={color === option.value && tool === 'pen'}
                  className={`swatch ${color.toLowerCase() === option.value.toLowerCase() && tool === 'pen' ? 'active' : ''}`}
                  style={{ backgroundColor: option.value }}
                  onClick={() => { setColor(option.value); if (tool === 'eraser' || tool === 'picker') chooseTool('pen'); }} />)}
                <label className="custom-color" title="Choose your own ink color">
                  <input type="color" value={color} aria-label="Choose a custom ink color" onChange={(event) => { setColor(event.target.value); if (tool === 'eraser' || tool === 'picker') chooseTool('pen'); }} />
                  <span aria-hidden="true">+</span>
                </label>
              </div>
              <button type="button" className={`palette-picker ${tool === 'picker' ? 'active' : ''}`}
                title="Sample a color from your drawing" aria-label="Pick color from canvas"
                aria-pressed={tool === 'picker'} onClick={() => chooseTool('picker')}>
                <Pipette size={16} />
              </button>
              <button type="button" className={`color-lab-toggle ${colorLabOpen ? 'open' : ''}`}
                aria-expanded={colorLabOpen} aria-controls="color-atelier"
                onClick={() => setColorLabOpen((open) => !open)}>
                <span className="color-lab-dot" style={{ background: colorPreview }} />
                <Palette size={15} /><span>Mix & shade</span><ChevronDown size={14} />
              </button>
            </div>
            {colorLabOpen && <section id="color-atelier" className="color-atelier" aria-label="Color and shading controls">
              <div className="color-atelier-heading"><div><span>THE COLOR ATELIER</span><strong>A little magic for your ink ✿</strong></div>
                <span className="color-sample" aria-label="Current ink preview" style={{ background: colorPreview }} />
              </div>
              <div className="atelier-grid">
                <div className="atelier-group">
                  <span className="atelier-label">Paint</span>
                  <div className="paint-modes" role="group" aria-label="Paint style">
                    <button type="button" className={paintMode === 'solid' ? 'active' : ''} aria-pressed={paintMode === 'solid'} onClick={() => setPaintMode('solid')}>Solid</button>
                    <button type="button" className={paintMode === 'gradient' ? 'active' : ''} aria-pressed={paintMode === 'gradient'} onClick={() => setPaintMode('gradient')}>Gradient</button>
                  </div>
                  <div className="atelier-color-fields">
                    <label><span>{paintMode === 'solid' ? 'Ink' : 'From'}</span><input type="color" aria-label="Ink color" value={color} onChange={(event) => setColor(event.target.value)} /></label>
                    {paintMode === 'gradient' && <label><span>To</span><input type="color" aria-label="Gradient end color" value={secondColor} onChange={(event) => setSecondColor(event.target.value)} /></label>}
                  </div>
                  <div className="atelier-rgb" role="group" aria-label="RGB color sliders">
                    {(['Red', 'Green', 'Blue'] as const).map((channel, index) => <label key={channel}>
                      <span>{channel}</span><input type="range" aria-label={`${channel} channel`} min={0} max={255} step={1}
                        value={rgb[index]} onChange={(event) => setColor(setHexChannel(color, index, Number(event.target.value)))} />
                      <output>{rgb[index]}</output>
                    </label>)}
                  </div>
                  {paintMode === 'gradient' && <>
                    <label className="atelier-angle"><span>Direction <output>{gradientAngle}°</output></span>
                      <input type="range" aria-label="Gradient direction" min={0} max={360} step={15}
                        value={gradientAngle} onChange={(event) => setGradientAngle(Number(event.target.value))} /></label>
                    <div className="atelier-presets" role="group" aria-label="Romantic gradient presets">
                      <button type="button" onClick={() => { setColor('#F4A6BE'); setSecondColor('#A5C9A8'); }}>Blush + sage</button>
                      <button type="button" onClick={() => { setColor('#F9BC82'); setSecondColor('#D88BAC'); }}>Peach + rose</button>
                      <button type="button" onClick={() => { setColor('#A99DD8'); setSecondColor('#77AACD'); }}>Dreamy sky</button>
                    </div>
                  </>}
                </div>
                <div className="atelier-group">
                  <span className="atelier-label">Layer colors</span>
                  <div className="paint-modes blend-modes" role="group" aria-label="Brush blending mode">
                    {(['normal', 'multiply', 'screen'] as const).map((mode) => <button key={mode} type="button"
                      className={blendMode === mode ? 'active' : ''} aria-pressed={blendMode === mode}
                      onClick={() => setBlendMode(mode)}>{mode === 'normal' ? 'Normal' : mode === 'multiply' ? 'Shade' : 'Glow'}</button>)}
                  </div>
                  <p className="atelier-hint">{blendMode === 'multiply'
                    ? 'Shade: layer soft ink over your colors to deepen them.'
                    : blendMode === 'screen' ? 'Glow: gently brighten ink where strokes overlap.'
                    : 'Normal: paint with your original colors.'}</p>
                </div>
              </div>
            </section>}
            </>}
          </div>
          <p className="studio-footer-tip">{tool === 'lasso-paint' ? 'Lasso Draw turns the shape you trace into a color-filled vector, with gradients and undo.' : tool === 'fill' ? 'Smart Fill colors enclosed shapes, including guide outlines. It saves as movable vector artwork for both of you.' : tool === 'lasso'
            ? 'Lasso selects complete brush strokes. Move, duplicate or delete them together — your person sees each edit.'
            : tool === 'picker' ? 'Tap on a finished mark to pick its visible color; then keep drawing.'
            : 'Blend and gradient settings apply to new strokes and sync with your person.'}</p>
        </section>

        <aside className="studio-sidebar" aria-label="Your drawing date">
          <section className="side-card prompt-card">
            <div className="side-heading"><div><span className="side-eyebrow">LET'S MAKE SOMETHING</span><h2>Pick a little doodle</h2></div><Sparkles size={18} /></div>
            <div className="template-list">
              {templates.map((template) => (
                <button key={template.id} className={`template-option ${template.id === room.board.template ? 'active' : ''}`}
                  aria-pressed={template.id === room.board.template} onClick={() => reset(template.id)} disabled={full}>
                  <span className="template-preview">{template.id === 'blank' ? <span className="blank-spark">✧</span> : <GuideArt template={template.id} />}</span>
                  <span className="template-label"><strong>{template.name}</strong><small>{template.subtitle}</small></span>
                  {template.id === room.board.template ? <Check size={16} /> : <ChevronRight size={16} />}
                </button>
              ))}
            </div>
          </section>

          <section className="side-card people-card">
            <div className="side-heading"><div><span className="side-eyebrow">SIDE BY SIDE</span><h2>Our little duo</h2></div><span className="tiny-hearts">♡</span></div>
            <div className="people-list">
              <div className="person"><Avatar name={name} /><div><strong>{name}</strong><span><i className="presence-dot" /> You're here</span></div></div>
              <div className={`person ${!onlinePartner ? 'awaiting' : ''}`}>
                {onlinePartner ? <Avatar name={onlinePartner.name} alt /> : <div className="avatar awaiting-avatar">♡</div>}
                <div><strong>{onlinePartner?.name || 'Your person'}</strong><span>{onlinePartner ? <><i className="presence-dot" /> Drawing with you</> : 'A seat waiting for them'}</span></div>
              </div>
            </div>
            <p className="people-message" role="status">{room.connection === 'solo'
              ? 'Solo preview. Connect Supabase to draw together across devices.'
              : room.connection === 'connecting' ? 'Connecting your studio...'
              : room.connection === 'full' ? 'This room already has two artists.'
              : room.connection === 'expired' ? 'This invitation has expired. Start a fresh drawing date.'
              : room.connection === 'error' ? 'We lost the connection. Please retry.'
              : onlinePartner ? 'Together at last. Let the doodling begin ♡' : 'Share the room link so they can join you.'}</p>
            <button className="secondary-btn fullwidth" onClick={copyInvite}><Link2 size={15} /> {copyState ? 'Copied!' : 'Copy room link'}</button>
          </section>

          <section className="side-card love-card">
            <div className="love-card-top"><span className="love-stamp">♥</span><strong>A little love note</strong></div>
            <p>Send them a tiny surprise while you draw.</p>
            <div className="reaction-actions">
              <button onClick={() => room.react('heart')}><Heart size={16} fill="currentColor" /> Love</button>
              <button onClick={() => room.react('sparkle')}><Sparkles size={16} /> Sparkle</button>
            </div>
          </section>
        </aside>
      </main>
      <footer className="site-footer">A tiny corner of the universe for two. <span>♡</span></footer>
    </div>
  );
}

export default function App() {
  const initialRoom = new URLSearchParams(window.location.search).get('room');
  const [roomId, setRoomId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [theme, setTheme] = useState<Theme>(initialTheme);

  function changeTheme(next: Theme) {
    setTheme(next);
    try { localStorage.setItem(themeStorageKey, next); } catch { /* Theme still works this session. */ }
  }

  function start(displayName: string, room: string) {
    window.history.replaceState(null, '', roomUrl(room));
    setName(displayName);
    setRoomId(room);
  }

  function leave() {
    window.history.replaceState(null, '', window.location.pathname);
    setRoomId(null);
  }

  return (
    <div className="app-theme" data-theme={theme}>
      {roomId ? <Studio key={roomId} roomId={roomId} name={name} theme={theme} onThemeChange={changeTheme} onExit={leave} />
        : <Welcome room={isRoomId(initialRoom) ? initialRoom : null} theme={theme} onThemeChange={changeTheme} onStart={start} />}
    </div>
  );
}
