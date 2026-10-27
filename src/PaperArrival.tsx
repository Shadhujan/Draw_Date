import { useEffect, useRef } from 'react';
import { PaperHeart } from './hero/PaperHeart';
import type { PaperPortal } from './hero/entryMotion';
import './PaperArrival.css';

export function PaperArrival({ paper, onComplete }: { paper: PaperPortal | null; onComplete: () => void }) {
  const sheet = useRef<HTMLDivElement>(null), veil = useRef<HTMLDivElement>(null);
  const complete = useRef(onComplete); complete.current = onComplete;
  useEffect(() => {
    let active = true, frame = 0;
    const animations: Animation[] = [];
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const finish = () => { if (active) complete.current(); };
    const reduce = () => { if (preference.matches) animations.forEach(animation => animation.finish()); };
    preference.addEventListener('change', reduce);
    window.scrollTo({ top: 0, behavior: 'instant' });
    frame = requestAnimationFrame(() => {
      const target = document.querySelector('.canvas-shell')?.getBoundingClientRect();
      if (!target || !sheet.current || !veil.current) { finish(); return; }
      const reduced = paper?.reduced || preference.matches || !paper;
      const from = paper ?? { ...target, rotation: 0 };
      const element = sheet.current;
      element.style.left = `${target.left}px`; element.style.top = `${target.top}px`;
      element.style.width = `${target.width}px`; element.style.height = `${target.height}px`;
      const duration = reduced ? 120 : 1250;
      if (!reduced) animations.push(element.animate([
        { transform: `translate(${from.left - target.left}px, ${from.top - target.top}px) rotate(${from.rotation}deg) scale(${from.width / target.width}, ${from.height / target.height})`, opacity: 1 },
        { transform: 'translate(0, 0) rotate(0) scale(1)', opacity: 1, offset: .82 },
        { transform: 'translate(0, 0) rotate(0) scale(1)', opacity: 0 },
      ], { duration, easing: 'cubic-bezier(.37,0,.63,1)', fill: 'forwards' }));
      else element.style.display = 'none';
      if (!reduced && element.firstElementChild) animations.push(element.firstElementChild.animate([{ opacity: 1 }, { opacity: 1, offset: .3 }, { opacity: 0, offset: .85 }, { opacity: 0 }], { duration, fill: 'forwards' }));
      animations.push(veil.current.animate([{ opacity: 1 }, { opacity: 1, offset: .16 }, { opacity: 0 }], { duration, easing: 'ease-in-out', fill: 'forwards' }));
      void Promise.all(animations.map(animation => animation.finished)).then(finish).catch(() => {});
    });
    return () => { active = false; cancelAnimationFrame(frame); animations.forEach(animation => animation.cancel()); preference.removeEventListener('change', reduce); };
  }, [paper]);
  return <div className="paper-arrival" aria-label="Opening your drawing canvas" role="status">
    <div className="paper-arrival-veil" ref={veil} />
    <div className="paper-arrival-sheet" ref={sheet} style={paper && !paper.reduced ? { left: paper.left, top: paper.top, width: paper.width, height: paper.height, transform: `rotate(${paper.rotation}deg)` } : { visibility: 'hidden' }}><PaperHeart /></div>
  </div>;
}
