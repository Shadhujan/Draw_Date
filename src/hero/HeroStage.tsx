import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type PointerEvent } from 'react';
import { flushSync } from 'react-dom';
import { Heart, Moon, Pause, PencilLine, Play, Sparkles, Sun } from 'lucide-react';
import { HeroAtmosphere } from './HeroAtmosphere';
import { PaperHeart } from './PaperHeart';
import type { HeroCameraHandle, PaperPortal } from './entryMotion';
import '../PaperArrival.css';

export type HeroStageHandle = { enter: () => Promise<PaperPortal | null>; cancelEntry: () => void };

/** The illustrated welcome scene never shares state with a drawing room. */
export const HeroStage = forwardRef<HeroStageHandle, { theme: 'rose' | 'sage'; illustrated?: boolean }>(function HeroStage({ theme, illustrated = false }, ref) {
  const stageRef = useRef<HTMLElement>(null);
  const slotRef = useRef<HTMLDivElement>(null);
  const camera = useRef<HeroCameraHandle>(null);
  const fallbackPaper = useRef<HTMLDivElement>(null);
  const animations = useRef<Animation[]>([]);
  const generation = useRef(0);
  const [entering, setEntering] = useState(false);
  const [showPaper, setShowPaper] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [paused, setPaused] = useState(false);
  const [love, setLove] = useState(0);
  const [ready, setReady] = useState(false);
  const [night, setNight] = useState(false);
  const moving = !paused && !reducedMotion;
  const motion = useRef(moving); motion.current = moving;

  function cancelEntry() {
    generation.current++;
    animations.current.forEach((animation) => animation.cancel()); animations.current = [];
    camera.current?.resetCamera();
    const stage = stageRef.current;
    if (stage) { stage.removeAttribute('data-entering'); stage.style.removeProperty('--entry-left'); stage.style.removeProperty('--entry-top'); stage.style.removeProperty('--entry-width'); stage.style.removeProperty('--entry-height'); }
    if (slotRef.current) slotRef.current.style.removeProperty('min-height');
    setEntering(false); setShowPaper(false);
  }

  useEffect(() => () => { generation.current++; animations.current.forEach((animation) => animation.cancel()); }, []);
  useEffect(() => { if (!moving) animations.current.forEach((animation) => { try { animation.finish(); } catch { /* An animation may have already ended. */ } }); }, [moving]);

  useImperativeHandle(ref, () => ({ cancelEntry, async enter() {
    const stage = stageRef.current;
    if (!stage) return null;
    const original = stage.getBoundingClientRect();
    if (!motion.current) return { left: original.left, top: original.top, width: original.width, height: original.height, rotation: 0, reduced: true };
    const token = ++generation.current;
    slotRef.current?.style.setProperty('min-height', `${original.height}px`);
    const scale = Math.min((innerWidth - 24) / original.width, (innerHeight - 48) / original.height, 1.5);
    const width = original.width * scale, height = original.height * scale;
    const left = (innerWidth - width) / 2, top = (innerHeight - height) / 2;
    stage.style.setProperty('--entry-left', `${left}px`); stage.style.setProperty('--entry-top', `${top}px`);
    stage.style.setProperty('--entry-width', `${width}px`); stage.style.setProperty('--entry-height', `${height}px`);
    stage.dataset.entering = 'true';
    setEntering(true);
    const expand = stage.animate([
      { transform: `translate(${original.left - left}px, ${original.top - top}px) scale(${original.width / width})`, borderRadius: getComputedStyle(stage).borderRadius },
      { transform: 'translate(0, 0) scale(1)', borderRadius: '28px' },
    ], { duration: 750, easing: 'cubic-bezier(.37,0,.63,1)', fill: 'forwards' });
    animations.current.push(expand);
    await expand.finished.catch(() => {});
    if (token !== generation.current) return null;
    const paper = motion.current ? await camera.current?.approachPaper() : null;
    if (token !== generation.current) return null;
    if (paper) return paper;
    // The paper must exist before measuring/animating it; a single RAF can precede React's commit.
    flushSync(() => setShowPaper(true));
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    if (token !== generation.current) return null;
    const element = fallbackPaper.current;
    if (!element) return null;
    const reveal = element.animate([{ opacity: 0, transform: 'translateY(8px) rotate(-3deg) scale(.94)' }, { opacity: 1, transform: 'translateY(0) rotate(0) scale(1)' }], { duration: motion.current ? 1400 : 1, easing: 'cubic-bezier(.37,0,.63,1)', fill: 'forwards' });
    animations.current.push(reveal);
    await reveal.finished.catch(() => {});
    if (token !== generation.current) return null;
    const bounds = element.getBoundingClientRect();
    return { left: bounds.left, top: bounds.top, width: bounds.width, height: bounds.height, rotation: 0, reduced: !motion.current };
  } }));

  function reset() {
    stageRef.current?.style.setProperty('--pointer-x', '0px');
    stageRef.current?.style.setProperty('--pointer-y', '0px');
  }

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(preference.matches);
    preference.addEventListener('change', update);
    return () => preference.removeEventListener('change', update);
  }, []);

  useEffect(() => { if (!moving) reset(); }, [moving]);

  function move(event: PointerEvent<HTMLElement>) {
    if (!moving || event.pointerType === 'touch') return;
    const box = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty('--pointer-x', `${((event.clientX - box.left) / box.width - 0.5) * -18}px`);
    event.currentTarget.style.setProperty('--pointer-y', `${((event.clientY - box.top) / box.height - 0.5) * -12}px`);
  }

  function sendLove() {
    setLove((count) => count + 1);
    // Optional Three.js enhancement; the same action has an HTML/CSS fallback.
    stageRef.current?.dispatchEvent(new Event('hero-love'));
  }

  return (
    <div className="hero-stage-slot" ref={slotRef}>
    {entering && <div className="hero-entry-backdrop"><span role="status">A little space, just for you two…</span></div>}
    <section className="hero-world" aria-label="Two cuddly bears drawing together in a cozy studio" ref={stageRef}
      data-variant={illustrated ? 'invitation' : 'miniature'} data-scene={ready && !illustrated ? 'ready' : 'loading'} data-night={night} data-motion={moving ? 'on' : 'off'} onPointerMove={move} onPointerLeave={reset}>
      <div className="hero-environment" aria-hidden="true" />
      <div className="hero-world-halo" aria-hidden="true" />
      <div className="hero-sunbeams" aria-hidden="true" />
      <div className="hero-environment-light" aria-hidden="true" />
      <div className="world-top-label"><Heart size={13} fill="currentColor" /> {illustrated ? 'MADE FOR TWO' : 'OUR LITTLE ART STUDIO'}</div>
      <div className="hero-bear-shadow" aria-hidden="true" />
      <div className="hero-bears-depth">
        <img className="hero-plush-bears" src="/hero/cuddle-bears.webp" width={1593} height={939}
          alt="A little cream teddy bear and a caramel teddy bear smiling while drawing with pink and green pencils"
          fetchPriority="high" draggable={false} />
      </div>
      <div className="world-sticky-note" aria-hidden="true"><PencilLine size={15} /> you + me<br /><strong>make magic ♡</strong></div>
      <div className="hero-css-sparkle sparkle-one" aria-hidden="true">✧</div>
      <div className="hero-css-sparkle sparkle-two" aria-hidden="true">✧</div>
      <span className="hero-scene-hint" aria-hidden="true">move a little. send a little love.</span>
      {!illustrated && <HeroAtmosphere ref={camera} theme={theme} moving={moving} night={night} onReady={setReady} />}
      {showPaper && <div className="hero-entry-paper" ref={fallbackPaper}><PaperHeart pencil /></div>}
      {love > 0 && <div className="hero-love-bloom" key={love} aria-hidden="true">
        {Array.from({ length: 5 }, (_, i) => <Heart key={i} size={22} fill="currentColor" />)}
      </div>}
      <div className="hero-scene-footer">
        <div className="world-greeting"><Sparkles size={16} /><span>{ready ? 'our little world, just us' : 'our little corner of the world'}</span></div>
        <button type="button" className="hero-love-button" onClick={sendLove} aria-label="Send the bears a little love">
          <Heart size={17} fill={love ? 'currentColor' : 'none'} /><span>a little love</span>
        </button>
      </div>
      {ready && <button type="button" className="hero-light-button" onClick={() => setNight(value => !value)}
        aria-label={night ? 'Bring back the sunshine' : 'Make it a cozy evening'} aria-pressed={night}
        title={night ? 'Bring back the sunshine' : 'Make it a cozy evening'}>
        {night ? <Sun size={16} /> : <Moon size={16} />}
      </button>}
      {!reducedMotion && <button type="button" className="hero-motion-button" onClick={() => setPaused((value) => !value)}
        aria-label={paused ? 'Play scene animation' : 'Pause scene animation'} title={paused ? 'Play animation' : 'Pause animation'}>
        {paused ? <Play size={14} /> : <Pause size={14} />}
      </button>}
      <span className="visually-hidden" role="status">{love > 0 ? 'A little love for you both ♡' : ''}</span>
    </section>
    </div>
  );
});
