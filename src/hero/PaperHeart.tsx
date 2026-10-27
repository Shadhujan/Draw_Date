export function PaperHeart({ pencil = false }: { pencil?: boolean }) {
  return <svg className="entry-heart" viewBox="-.81 -.54 1.62 1.08" fill="none" aria-hidden="true">
    <path pathLength={1} d="M0 .29 C-.14 .18 -.43 .04 -.43 -.05 C-.43 -.29 -.17 -.42 0 -.17 C.18 -.43 .40 -.29 .40 -.05 C.40 .10 .12 .20 0 .29Z"
      stroke="currentColor" strokeWidth=".035" strokeLinecap="round" strokeLinejoin="round" />
    {pencil && <g className="entry-pencil" transform="translate(.35 -.1) rotate(-32)">
      <path d="M-.025 -.34 H.025 V-.04 L0 .02 L-.025 -.04Z" fill="#e89ba9" stroke="#a86280" strokeWidth=".008" />
      <path d="M-.025 -.04 H.025 L0 .02Z" fill="#e8c7a1" /><path d="M-.008 0 H.008 L0 .02Z" fill="#745b56" />
    </g>}
  </svg>;
}
