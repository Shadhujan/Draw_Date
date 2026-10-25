import { useMemo, useRef, useState } from 'react';
import {
  ArrowLeft, Check, ChevronRight, Copy, Download, Eraser, Heart, Link2,
  LockKeyhole, Paintbrush, RotateCcw, Sparkles, UsersRound, WandSparkles,
} from 'lucide-react';
import { createRoomId, isRoomId } from './board';
import { DrawingCanvas, type CanvasHandle } from './Canvas';
import { realtimeConfigured } from './realtime';
import { GuideArt, templates } from './templates';
import type { TemplateId, Tool } from './types';
import { useRoom } from './useRoom';

const colors = [
  { name: 'Berry', value: '#b85b7e' },
  { name: 'Plum', value: '#8067b0' },
  { name: 'Ocean', value: '#5a95ad' },
  { name: 'Sage', value: '#6e9f82' },
  { name: 'Honey', value: '#dc9c54' },
  { name: 'Ink', value: '#5c5363' },
];

function roomUrl(room: string) {
  const url = new URL(window.location.origin + window.location.pathname);
  url.searchParams.set('room', room);
  return url.toString();
}

function Emblem() {
  return (
    <div className="emblem" aria-hidden="true">
      <Heart size={21} fill="currentColor" strokeWidth={2.2} />
      <span className="emblem-stroke" />
    </div>
  );
}

function Avatar({ name, alt = false }: { name: string; alt?: boolean }) {
  return <span className={`avatar ${alt ? 'avatar-alt' : ''}`} title={name}>{name.trim().slice(0, 1).toUpperCase() || '?'}</span>;
}

function Welcome({ room, onStart }: { room: string | null; onStart: (name: string, id: string) => void }) {
  const [name, setName] = useState(() => localStorage.getItem('doodle-date-name') || '');
  const [error, setError] = useState('');
  const [joining] = useState(Boolean(room));

  function enter() {
    const cleaned = name.trim().replace(/\s+/g, ' ').slice(0, 24);
    if (!cleaned) { setError('Tell us what we should call you first.'); return; }
    localStorage.setItem('doodle-date-name', cleaned);
    onStart(cleaned, room && isRoomId(room) ? room : createRoomId());
  }

  return (
    <div className="welcome-screen">
      <div className="decor-circle one" /><div className="decor-circle two" />
      <header className="welcome-nav"><Emblem /><span>doodle date</span><span className="top-caption">a little place for two</span></header>
      <main className="welcome-main">
        <section className="welcome-copy">
          <div className="eyebrow"><Sparkles size={16} /> YOUR PRIVATE LITTLE ART STUDIO</div>
          <h1>Draw a little <em>closer.</em></h1>
          <p>One canvas, two hearts, and all the tiny imperfect lines that make something beautiful together.</p>
          <div className="welcome-form">
            <label htmlFor="name">What should we call you?</label>
            <input
              id="name"
              autoComplete="nickname"
              maxLength={24}
              value={name}
              placeholder="Your nickname"
              onChange={(event) => { setName(event.target.value); setError(''); }}
              onKeyDown={(event) => { if (event.key === 'Enter') enter(); }}
              autoFocus
            />
            {error && <span className="form-error">{error}</span>}
            <button className="primary-btn" onClick={enter}>
              {joining ? 'Join your drawing date' : 'Create our drawing date'}
              <ChevronRight size={18} />
            </button>
            <div className="form-note"><LockKeyhole size={14} /> No accounts. No payment. Just a link for two.</div>
          </div>
        </section>
        <section className="hero-art" aria-hidden="true">
          <div className="hero-paper">
            <span className="paper-label">TO: MY FAVORITE PERSON</span>
            <GuideArt template="heart" className="hero-guide" />
            <div className="hero-signature">made with <span>love</span></div>
          </div>
          <span className="hero-sparkle sparkle-a">\u2726</span>
          <span className="hero-sparkle sparkle-b">\u2727</span>
          <div className="hero-sticker">two artists<br />one little world <span>\u2665</span></div>
        </section>
      </main>
      <footer className="welcome-footer">
        <span>Handmade moments, not perfect masterpieces.</span>
        <span className="welcome-footer-right">made for smiles \u2661</span>
      </footer>
    </div>
  );
}

function Studio({ roomId, name, onExit }: { roomId: string; name: string; onExit: () => void }) {
  const room = useRoom(roomId, name);
  const [tool, setTool] = useState<Tool>('pen');
  const [color, setColor] = useState(colors[0].value);
  const [size, setSize] = useState(12);
  const [guideVisible, setGuideVisible] = useState(true);
  const [copyState, setCopyState] = useState(false);
  const canvas = useRef<CanvasHandle>(null);
  const full = room.connection === 'full';
  const onlinePartner = useMemo(() => room.members.find((member) => member.id !== room.myId), [room.members, room.myId]);
  const myStrokes = room.board.strokes.filter((stroke) => stroke.by === room.myId).length;
  const canDraw = !full && room.connection !== 'error';

  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(roomUrl(roomId));
      setCopyState(true);
      window.setTimeout(() => setCopyState(false), 2000);
    } catch {
      window.prompt('Copy your private invite link:', roomUrl(roomId));
    }
  }

  function reset(template: TemplateId) {
    if (template === room.board.template && room.board.strokes.length === 0) return;
    if (room.board.strokes.length && !window.confirm('Start a fresh page for both of you? You can save this one first.')) return;
    room.changeTemplate(template);
  }

  return (
    <div className="studio-screen">
      <header className="studio-header">
        <div className="studio-brand"><Emblem /><div><strong>doodle date</strong><span>your little corner of the internet</span></div></div>
        <div className="header-center"><span className="room-pill"><LockKeyhole size={13} /> INVITE-ONLY LINK</span></div>
        <button className="leave-button" onClick={onExit}><ArrowLeft size={16} /><span>Leave studio</span></button>
      </header>

      <main className="studio-layout">
        <section className="studio-main">
          <div className="studio-heading">
            <div>
              <div className="eyebrow compact">YOUR LITTLE ART DATE</div>
              <h1>Make something <em>together.</em></h1>
              <p>No perfect lines needed. Just you two, having fun.</p>
            </div>
            <button className="invite-btn" onClick={copyInvite}><Link2 size={17} /> {copyState ? 'Copied!' : 'Invite partner'} {copyState ? <Check size={16} /> : <Copy size={14} />}</button>
          </div>

          <div className="paper-frame">
            <div className="paper-header">
              <div className="paper-dots"><i /><i /><i /></div>
              <span className="paper-title">OUR MASTERPIECE <span>\u2661</span></span>
              <span className="page-number">01 / forever</span>
            </div>
            <div className={`canvas-shell ${!canDraw ? 'canvas-locked' : ''}`}>
              {guideVisible && <GuideArt template={room.board.template} className="guide-layer" />}
              <DrawingCanvas
                key={room.board.revision}
                ref={canvas}
                strokes={room.board.strokes}
                remoteDrafts={room.remoteDrafts}
                draftVersion={room.draftVersion}
                myId={room.myId}
                tool={tool}
                color={color}
                size={size}
                disabled={!canDraw}
                onStart={room.begin}
                onPoints={room.points}
                onEnd={room.end}
                onCursor={room.sendCursor}
              />
              {room.cursors.filter((cursor) => cursor.by !== room.myId).map((cursor) => (
                <div className="remote-cursor" key={cursor.by} style={{ left: `${cursor.x / 10}%`, top: `${cursor.y / 7}%` }}>
                  <Paintbrush size={15} fill="#d8c2f4" color="#856bc2" />
                  <span>{cursor.name}</span>
                </div>
              ))}
              {room.reactions.map((reaction, i) => (
                <span key={reaction.id} className="floating-reaction" style={{ right: `${24 + i * 16}%` }}>
                  <b>{reaction.value}</b><small>{reaction.name}</small>
                </span>
              ))}
              {full && <div className="full-overlay"><UsersRound size={28} /><strong>This studio is for two.</strong><span>It looks like both places are taken.</span></div>}
              {room.connection === 'error' && <div className="full-overlay"><strong>Connection lost</strong><span>Refresh to try reconnecting. Your local drawing is saved.</span></div>}
            </div>
            <div className="canvas-footer"><span>Every little line counts.</span><span>{room.board.strokes.length} strokes of magic <Sparkles size={12} /></span></div>
          </div>

          <div className="tools-bar">
            <div className="tool-mode" aria-label="Drawing tools">
              <button className={`tool-btn ${tool === 'pen' ? 'selected' : ''}`} title="Pen" aria-pressed={tool === 'pen'} onClick={() => setTool('pen')}><Paintbrush size={18} /><span>Brush</span></button>
              <button className={`tool-btn ${tool === 'eraser' ? 'selected' : ''}`} title="Eraser" aria-pressed={tool === 'eraser'} onClick={() => setTool('eraser')}><Eraser size={18} /><span>Eraser</span></button>
            </div>
            <div className="vertical-rule" />
            <div className="swatches" aria-label="Drawing colors">
              {colors.map((option) => <button
                key={option.value} title={option.name} aria-label={option.name}
                aria-pressed={color === option.value && tool === 'pen'}
                className={`swatch ${color === option.value && tool === 'pen' ? 'active' : ''}`}
                style={{ backgroundColor: option.value }}
                onClick={() => { setColor(option.value); setTool('pen'); }} />)}
            </div>
            <div className="vertical-rule" />
            <label className="size-slider"><span>Size</span><input aria-label="Brush size" type="range" min={4} max={34} step={2} value={size} onChange={(event) => setSize(Number(event.target.value))} /></label>
            <div className="tool-actions">
              <button className="icon-action" title="Undo your last stroke" disabled={!myStrokes} onClick={room.undo}><RotateCcw size={18} /></button>
              <button className="icon-action" title="Save PNG" onClick={() => canvas.current?.save(guideVisible ? document.querySelector<SVGSVGElement>('.guide-layer') : null)}><Download size={18} /></button>
            </div>
          </div>
          <div className="studio-footer-tip"><WandSparkles size={15} /> Tip: draw with your finger, a stylus, or your mouse. Both your lines appear on the same page.</div>
        </section>

        <aside className="studio-sidebar">
          <section className="side-card people-card">
            <div className="side-heading"><h2>Your little duo</h2><span className="tiny-hearts">\u2665 \u2661</span></div>
            <div className="people-list">
              <div className="person"><Avatar name={name} /><div><strong>{name}</strong><span><i className="presence-dot" /> You're here</span></div></div>
              <div className={`person ${!onlinePartner ? 'awaiting' : ''}`}>
                {onlinePartner ? <Avatar name={onlinePartner.name} alt /> : <div className="avatar awaiting-avatar">+</div>}
                <div><strong>{onlinePartner?.name || 'Your favorite person'}</strong><span>{onlinePartner ? <><i className="presence-dot" /> Drawing with you</> : 'A spot saved just for them'}</span></div>
              </div>
            </div>
            <div className="people-message">{room.connection === 'solo'
              ? 'Solo preview: connect Supabase to make the invitation work across devices.'
              : room.connection === 'connecting' ? 'Connecting your drawing studio...'
              : room.connection === 'full' ? 'This room already has two artists.'
              : room.connection === 'error' ? 'There is a connection problem.'
              : onlinePartner ? 'You are both here. Time to make some magic!' : 'Send the invite link and start doodling while you wait.'}</div>
            <button className="secondary-btn fullwidth" onClick={copyInvite}><Link2 size={15} /> {copyState ? 'Link copied!' : 'Copy invitation link'}</button>
          </section>

          <section className="side-card prompt-card">
            <div className="side-heading"><h2>What shall we draw?</h2><Sparkles size={17} color="#d291a2" /></div>
            <p>Pick a tiny prompt, or let your imagination run wild.</p>
            <div className="template-list">
              {templates.map((template) => (
                <button
                  key={template.id}
                  className={`template-option ${template.id === room.board.template ? 'active' : ''}`}
                  onClick={() => reset(template.id)}
                  disabled={full}
                >
                  <div className="template-preview">{template.id === 'blank' ? <span className="blank-spark">\u2727</span> : <GuideArt template={template.id} />}</div>
                  <div><strong>{template.name}</strong><span>{template.subtitle}</span></div>
                  {template.id === room.board.template ? <Check size={16} /> : <ChevronRight size={16} />}
                </button>
              ))}
            </div>
            <button className="guide-toggle" onClick={() => setGuideVisible((visible) => !visible)}>
              {guideVisible ? 'Hide' : 'Show'} tracing guide <span>{guideVisible ? 'ON' : 'OFF'}</span>
            </button>
          </section>

          <section className="side-card love-card">
            <div className="love-card-top"><Heart size={20} fill="#efb6c7" color="#c47494" /> A little something extra</div>
            <p>Send a tiny surprise across the canvas.</p>
            <div className="reaction-actions">
              <button onClick={() => room.react('heart')}><Heart size={17} fill="currentColor" /> Send love</button>
              <button onClick={() => room.react('sparkle')}><Sparkles size={17} /> Sparkle</button>
            </div>
          </section>
        </aside>
      </main>
      <footer className="site-footer">A tiny corner of the universe, just for two. <span>\u2661</span></footer>
    </div>
  );
}

export default function App() {
  const initialRoom = new URLSearchParams(window.location.search).get('room');
  const [roomId, setRoomId] = useState<string | null>(null);
  const [name, setName] = useState('');

  function start(displayName: string, room: string) {
    const url = roomUrl(room);
    window.history.replaceState(null, '', url);
    setName(displayName);
    setRoomId(room);
  }

  function leave() {
    window.history.replaceState(null, '', window.location.pathname);
    setRoomId(null);
  }

  if (roomId) return <Studio key={roomId} roomId={roomId} name={name} onExit={leave} />;
  return <Welcome room={isRoomId(initialRoom) ? initialRoom : null} onStart={start} />;
}
