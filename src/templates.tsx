import type { TemplateId } from './types';

export const templates: { id: TemplateId; name: string; subtitle: string; emoji: string }[] = [
  { id: 'heart', name: 'Love note', subtitle: 'A little love, line by line', emoji: '\u2665' },
  { id: 'flowers', name: 'Flower date', subtitle: 'Grow something together', emoji: '\u273f' },
  { id: 'bunny', name: 'Bunny buddies', subtitle: 'The cutest little challenge', emoji: '\u2661' },
  { id: 'blank', name: 'Freestyle', subtitle: 'The canvas is yours', emoji: '\u2727' },
];

export function GuideArt({ template, className = '', step }: {
  template: TemplateId; className?: string; step?: number;
}) {
  if (template === 'blank') return null;
  const common = { fill: 'none', stroke: '#cb96a5', strokeWidth: 7,
    strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  const phase = (index: number) => step === undefined ? '' :
    index === step ? 'current' : index < step ? 'done' : 'upcoming';
  return (
    <svg viewBox="0 0 1000 700" className={className} aria-hidden="true"
      data-guided={step !== undefined || undefined} xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
      {template === 'heart' && <g {...common}>
        <g data-guide-step="0" className={phase(0)}>
          <path d="M500 545 C430 487 250 400 245 275 C239 195 294 143 366 153 C430 160 477 212 500 248 C523 212 570 160 634 153 C706 143 761 195 755 275 C750 400 570 487 500 545Z" />
        </g>
        <g data-guide-step="1" className={phase(1)}>
          <path d="M340 228 C360 208 394 215 412 234" strokeWidth="5" />
          <path d="M584 234 C606 210 634 210 654 225" strokeWidth="5" />
        </g>
        <g data-guide-step="2" className={phase(2)}>
          <path d="M452 350 Q475 328 500 350 Q525 328 548 350" strokeWidth="5" />
        </g>
        <g data-guide-step="3" className={phase(3)}>
          <path d="M450 401 Q500 427 550 401" strokeWidth="5" />
        </g>
        <g data-guide-step="4" className={phase(4)}>
          <path d="M153 140 l0 50 M128 165 l50 0 M820 500 l0 50 M795 525 l50 0" strokeWidth="5" />
        </g>
      </g>}
      {template === 'flowers' && <g {...common}>
        <g data-guide-step="0" className={phase(0)}>
          <path d="M365 550 C376 452 377 382 355 314" />
          <path d="M645 551 C626 468 627 420 646 351" />
        </g>
        <g data-guide-step="1" className={phase(1)}>
          <path d="M365 440 Q290 400 265 462 Q320 491 365 440Z" />
          <path d="M365 480 Q429 405 466 456 Q419 501 365 480Z" />
          <path d="M639 435 Q584 397 554 433 Q576 479 639 455" />
          <path d="M641 479 Q701 436 733 477 Q694 520 641 479Z" />
        </g>
        <g data-guide-step="2" className={phase(2)}>
          <path d="M355 314 C305 280 295 240 330 219 C342 171 386 171 404 213 C454 214 465 259 430 287 C436 337 391 351 355 314Z" />
          <path d="M646 351 Q620 291 657 238 Q683 308 646 351Z" />
          <path d="M646 351 Q578 332 581 276 Q642 292 646 351Z" />
          <path d="M646 351 Q691 282 735 291 Q719 348 646 351Z" />
        </g>
        <g data-guide-step="3" className={phase(3)}>
          <circle cx="379" cy="264" r="33" />
        </g>
        <g data-guide-step="4" className={phase(4)}>
          <path d="M250 552 Q500 586 750 552" strokeWidth="5" />
        </g>
      </g>}
      {template === 'bunny' && <g {...common}>
        <g data-guide-step="0" className={phase(0)}>
          <path d="M330 258 C289 192 269 97 304 88 C346 81 363 178 382 227" />
          <path d="M443 226 C466 130 507 79 540 104 C579 140 508 231 490 265" />
        </g>
        <g data-guide-step="1" className={phase(1)}>
          <path d="M306 303 C276 393 324 487 422 492 C520 494 578 426 554 332 C533 244 360 230 306 303Z" />
        </g>
        <g data-guide-step="2" className={phase(2)}>
          <path d="M370 370 q17 -17 34 0 M465 370 q17 -17 34 0" />
          <path d="M432 391 q18 -14 36 0 q-18 19 -36 0Z" />
          <path d="M449 405 v19 q-18 16 -34 0 M449 424 q18 16 34 0" strokeWidth="5" />
        </g>
        <g data-guide-step="3" className={phase(3)}>
          <path d="M334 401 l-78 -15 M336 420 l-79 11 M515 402 l76 -16 M515 420 l76 10" strokeWidth="5" />
        </g>
        <g data-guide-step="4" className={phase(4)}>
          <path d="M377 489 Q321 556 366 589 Q432 623 474 585 Q548 599 569 552 Q590 506 515 471" />
          <path d="M638 229 C638 209 653 196 671 201 C690 177 729 200 717 228 C729 250 706 270 686 255Z" strokeWidth="5" />
          <path d="M658 337 Q702 293 747 336" strokeWidth="5" />
        </g>
      </g>}
    </svg>
  );
}
