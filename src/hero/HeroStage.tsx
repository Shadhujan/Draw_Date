import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { Heart, Pause, PencilLine, Play, Sparkles } from 'lucide-react';
import { HeroAtmosphere } from './HeroAtmosphere';

/** The illustrated welcome scene never shares state with a drawing room. */
export function HeroStage({ theme }: { theme: 'rose' | 'sage' }) {
  const stageRef = useRef<HTMLElement>(null);
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [paused, setPaused] = useState(false);
  const [love, setLove] = useState(0);
  const moving = !paused && !reducedMotion;

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
    <section className="hero-world" aria-label="Two cuddly bears drawing together in a cozy studio" ref={stageRef}
      data-motion={moving ? 'on' : 'off'} onPointerMove={move} onPointerLeave={reset}>
      <div className="hero-environment" aria-hidden="true" />
      <div className="hero-world-halo" aria-hidden="true" />
      <div className="hero-sunbeams" aria-hidden="true" />
      <div className="hero-environment-light" aria-hidden="true" />
      <div className="world-top-label"><Heart size={13} fill="currentColor" /> MADE FOR TWO</div>
      <div className="hero-bear-shadow" aria-hidden="true" />
      <div className="hero-bears-depth">
        <img className="hero-plush-bears" src="/hero/cuddle-bears.webp" width={1593} height={939}
          alt="A little cream teddy bear and a caramel teddy bear smiling while drawing with pink and green pencils"
          fetchPriority="high" draggable={false} />
      </div>
      <div className="world-sticky-note" aria-hidden="true"><PencilLine size={15} /> you + me<br /><strong>make magic ♡</strong></div>
      <div className="hero-css-sparkle sparkle-one" aria-hidden="true">✧</div>
      <div className="hero-css-sparkle sparkle-two" aria-hidden="true">✧</div>
      <HeroAtmosphere theme={theme} moving={moving} />
      {love > 0 && <div className="hero-love-bloom" key={love} aria-hidden="true">
        {Array.from({ length: 5 }, (_, i) => <Heart key={i} size={22} fill="currentColor" />)}
      </div>}
      <div className="hero-scene-footer">
        <div className="world-greeting"><Sparkles size={16} /><span>our little corner of the world</span></div>
        <button type="button" className="hero-love-button" onClick={sendLove} aria-label="Send the bears a little love">
          <Heart size={17} fill={love ? 'currentColor' : 'none'} /><span>a little love</span>
        </button>
      </div>
      {!reducedMotion && <button type="button" className="hero-motion-button" onClick={() => setPaused((value) => !value)}
        aria-label={paused ? 'Play scene animation' : 'Pause scene animation'} title={paused ? 'Play animation' : 'Pause animation'}>
        {paused ? <Play size={14} /> : <Pause size={14} />}
      </button>}
      <span className="visually-hidden" role="status">{love > 0 ? 'A little love for you both ♡' : ''}</span>
    </section>
  );
}
