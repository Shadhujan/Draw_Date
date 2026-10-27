import './styles.css';
import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Heart, Plus, Sparkles } from 'lucide-react';
import { HeroStage, type HeroStageHandle } from './hero/HeroStage';
import { Emblem, ThemeSwitch, type Theme } from './Brand';
import { createRoomId, isRoomId } from './board';
import { roomUrl } from './roomLink';
import { PaperArrival } from './PaperArrival';
import type { PaperPortal } from './hero/entryMotion';

const themeStorageKey = 'draw-date-theme';
let studioLoad: Promise<typeof import('./Studio')> | undefined;
function loadStudio() {
  return studioLoad ??= import('./Studio').catch((error) => { studioLoad = undefined; throw error; });
}
function preloadStudio() { void loadStudio().catch(() => {}); }
async function studioForEntry() {
  let timer: number | undefined;
  try {
    return await Promise.race([loadStudio(), new Promise<never>((_, reject) => {
      timer = window.setTimeout(() => reject(new Error('Studio loading timed out')), 15_000);
    })]);
  } finally { window.clearTimeout(timer); }
}

function initialTheme(): Theme {
  try { return localStorage.getItem(themeStorageKey) === 'sage' ? 'sage' : 'rose'; }
  catch { return 'rose'; }
}

function Welcome({ room, theme, onThemeChange, onStart }: {
  room: string | null;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  onStart: (name: string, id: string, hero: HeroStageHandle | null) => Promise<void>;
}) {
  const [name, setName] = useState(() => {
    // A nickname is private to THIS tab and THIS room. An invitation in a new
    // tab must never inherit the creator's browser-wide remembered name.
    if (!room || !isRoomId(room)) return '';
    try { return sessionStorage.getItem(`draw-date-name:${room}`) ?? ''; }
    catch { return ''; }
  });
  const [error, setError] = useState('');
  const [entering, setEntering] = useState(false);
  const enteringRef = useRef(false);
  const hero = useRef<HeroStageHandle>(null);

  async function enter(newRoom = false) {
    if (enteringRef.current) return;
    const cleaned = name.trim().replace(/\s+/g, ' ').slice(0, 24);
    if (!cleaned) { setError('Add a little nickname before we begin.'); return; }
    const id = !newRoom && room && isRoomId(room) ? room : createRoomId();
    try { sessionStorage.setItem(`draw-date-name:${id}`, cleaned); } catch { /* Optional. */ }
    enteringRef.current = true;
    setEntering(true);
    setError('');
    try { await onStart(cleaned, id, hero.current); }
    catch { setError('We couldn’t open your canvas. Please try again, or reload the page.'); }
    finally { enteringRef.current = false; setEntering(false); }
  }

  return (
    <div className="welcome-screen">
      <div className="ambient-orb orb-one" aria-hidden="true" />
      <div className="ambient-orb orb-two" aria-hidden="true" />
      <header className="welcome-nav" inert={entering}>
        <div className="brand-lockup"><Emblem /><span>draw date<small>just us & a canvas</small></span></div>
        <div className="nav-actions"><span className="top-caption">A tiny world, just for two ♡</span><ThemeSwitch theme={theme} onChange={onThemeChange} /></div>
      </header>
      <main className="welcome-main">
        <section className="welcome-copy">
          <div className="eyebrow"><Sparkles size={15} /> a little time, just us</div>
          <h1><span className="hero-title-line">Draw together.</span><em>Stay a little closer.
            <svg className="hero-handdrawn" viewBox="0 0 450 20" aria-hidden="true">
              <path d="M4 12C100 1 268 2 398 10M42 17C181 9 280 11 366 15M411 8C402-3 391 4 411 17C435 3 423-4 411 8" />
            </svg>
          </em></h1>
          <p>A cozy little art studio for you and your favorite person. Make a mess, make a memory, make something yours.</p>
          <form className="welcome-form" onSubmit={(event) => { event.preventDefault(); void enter(); }} noValidate aria-busy={entering}>
            <label htmlFor="name">Your little nickname</label>
            <input id="name" autoComplete="off" maxLength={24} value={name} required disabled={entering} onFocus={preloadStudio} onPointerEnter={preloadStudio}
              aria-invalid={Boolean(error)} aria-describedby={error ? 'name-error' : undefined}
              placeholder="What should we call you?" onChange={(event) => { setName(event.target.value); setError(''); }} />
            {error && <span id="name-error" className="form-error" role="alert">{error}</span>}
            <button type="submit" className="primary-btn" disabled={entering} onPointerEnter={preloadStudio} onFocus={preloadStudio}>
              {entering ? 'Opening our little canvas…' : room ? 'Join the drawing date' : 'Start drawing together'}
              <span className="button-icon"><ArrowUpRight size={19} /></span>
            </button>
            {room && <button type="button" className="welcome-new-room" disabled={entering} onClick={() => { void enter(true); }}>
              <Plus size={14} /> Start a completely new room
            </button>}
            <span className="form-note">No account form needed. Your room link is just for the two of you.</span>
          </form>
          <div className="welcome-whisper"><Heart size={14} fill="currentColor" /> The sweetest things are made together.</div>
        </section>
        <HeroStage ref={hero} key={room ? 'invitation' : 'home'} theme={theme} illustrated={Boolean(room)} />
      </main>
      <footer className="welcome-footer"><span>Made for slow evenings, soft smiles, and messy doodles.</span><span>♡</span></footer>
    </div>
  );
}

export default function App() {
  useEffect(() => { window.drawDateBoot?.ready(); }, []);
  const initialRoom = new URLSearchParams(window.location.search).get('room');
  const [roomId, setRoomId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [theme, setTheme] = useState<Theme>(initialTheme);
  const [Studio, setStudio] = useState<typeof import('./Studio').default | null>(null);
  const [arrival, setArrival] = useState<{ paper: PaperPortal | null } | null>(null);
  const starting = useRef(false);
  useEffect(() => {
    if (roomId && !arrival) document.querySelector<HTMLElement>('.studio-heading h1')?.focus({ preventScroll: true });
  }, [roomId, arrival]);

  function changeTheme(next: Theme) {
    setTheme(next);
    try { localStorage.setItem(themeStorageKey, next); } catch { /* Theme still works this session. */ }
  }

  async function start(displayName: string, room: string, hero: HeroStageHandle | null) {
    if (starting.current) return;
    starting.current = true;
    try {
      const [module, paper] = await Promise.all([studioForEntry(), hero?.enter() ?? Promise.resolve(null)]);
      setStudio(() => module.default);
      window.history.replaceState(null, '', roomUrl(room));
      setName(displayName);
      setRoomId(room);
      setArrival({ paper });
    } catch (error) { hero?.cancelEntry(); throw error; }
    finally { starting.current = false; }
  }

  function leave() {
    window.history.replaceState(null, '', window.location.pathname);
    setRoomId(null);
  }

  function startFreshRoom() {
    const nextId = createRoomId();
    window.history.replaceState(null, '', roomUrl(nextId));
    setRoomId(nextId);
  }

  return (
    <div className="app-theme" data-theme={theme}>
      {roomId && Studio ? <div className="studio-arrival" data-arriving={Boolean(arrival)} inert={Boolean(arrival)}><Studio key={roomId} roomId={roomId} name={name} theme={theme} onThemeChange={changeTheme} onExit={leave} onNewRoom={startFreshRoom} /></div>
        : <Welcome room={isRoomId(initialRoom) ? initialRoom : null} theme={theme} onThemeChange={changeTheme} onStart={start} />}
      {arrival && <PaperArrival paper={arrival.paper} onComplete={() => {
        setArrival(null);
      }} />}
    </div>
  );
}
