import { useRef, type PointerEvent } from 'react';
import { Heart, PencilLine, Sparkles } from 'lucide-react';
import { HeroAtmosphere } from './HeroAtmosphere';

/** Decorative artwork is separate from real HTML controls and the drawing canvas. */
export function HeroStage({ theme }: { theme: 'rose' | 'sage' }) {
  const stageRef = useRef<HTMLElement>(null);

  function move(event: PointerEvent<HTMLElement>) {
    if (event.pointerType === 'touch' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const box = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty('--pointer-x', `${((event.clientX - box.left) / box.width - 0.5) * -14}px`);
    event.currentTarget.style.setProperty('--pointer-y', `${((event.clientY - box.top) / box.height - 0.5) * -10}px`);
  }

  function reset() {
    stageRef.current?.style.setProperty('--pointer-x', '0px');
    stageRef.current?.style.setProperty('--pointer-y', '0px');
  }

  return (
    <section className="hero-world" aria-label="Two cuddly bears drawing together in a cozy studio" ref={stageRef}
      onPointerMove={move} onPointerLeave={reset}>
      <div className="hero-world-halo" aria-hidden="true" />
      <div className="hero-window" aria-hidden="true">
        <span className="window-light" />
        <span className="window-glass" />
      </div>
      <svg className="hero-vine vine-left" viewBox="0 0 115 205" aria-hidden="true" fill="none">
        <path d="M12 -8C8 64 69 80 56 138s23 61 37 83" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        <path d="M20 30C61 17 63 52 43 60C10 53 13 36 20 30ZM55 79C93 50 100 81 76 97C58 98 50 88 55 79ZM49 115C15 88 4 118 29 136C47 141 55 126 49 115ZM67 164C97 134 109 162 90 182C75 184 69 173 67 164Z" fill="currentColor" opacity=".82" />
      </svg>
      <svg className="hero-vine vine-right" viewBox="0 0 115 205" aria-hidden="true" fill="none">
        <path d="M12 -8C8 64 69 80 56 138s23 61 37 83" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        <path d="M20 30C61 17 63 52 43 60C10 53 13 36 20 30ZM55 79C93 50 100 81 76 97C58 98 50 88 55 79ZM49 115C15 88 4 118 29 136C47 141 55 126 49 115ZM67 164C97 134 109 162 90 182C75 184 69 173 67 164Z" fill="currentColor" opacity=".82" />
      </svg>
      <div className="hero-cloud cloud-left" aria-hidden="true" /><div className="hero-cloud cloud-right" aria-hidden="true" />
      <div className="hero-light-orb" aria-hidden="true" />
      <div className="world-top-label"><Heart size={14} fill="currentColor" /> MADE FOR TWO</div>
      <div className="hero-desk" aria-hidden="true" />
      <div className="hero-drawing-paper" aria-hidden="true">
        <svg viewBox="0 0 220 112" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M98 30C81 8 50 19 53 44c3 24 37 42 45 49 8-7 43-25 46-49 3-25-28-36-46-14Z" stroke="#e595ac" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="8 7" />
          <path d="M171 25l6 8 9-2-6 8 3 8-10-4-8 6 3-11-8-5 10-2Z" fill="#f2c797" />
          <path d="M22 57l4 9 11 1-9 6 2 11-8-6-10 5 3-11-8-6 11-1 4-8Z" fill="#c2d9b4" />
        </svg>
      </div>
      <img className="hero-plush-bears" src="/hero/cuddle-bears.webp" width={639} height={353}
        alt="A little cream teddy bear and a caramel teddy bear smiling while drawing with pink and green pencils" draggable={false} />
      <div className="world-art-dots" aria-hidden="true"><span /><span /><span /></div>
      <div className="world-greeting"><Sparkles size={17} /><span>our little corner of the world</span></div>
      <div className="world-sticky-note" aria-hidden="true"><PencilLine size={16} /> you + me<br /><strong>make magic ♡</strong></div>
      <div className="hero-css-sparkle sparkle-one" aria-hidden="true">✧</div>
      <div className="hero-css-sparkle sparkle-two" aria-hidden="true">✧</div>
      <HeroAtmosphere theme={theme} />
    </section>
  );
}
