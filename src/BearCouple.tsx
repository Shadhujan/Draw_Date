type BearCoupleProps = { className?: string };

/** Original illustrated mascots. SVG stays crisp at every viewport size. */
export function BearCouple({ className = '' }: BearCoupleProps) {
  return (
    <svg className={className} viewBox="0 0 520 360" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Two tiny bears cuddling with a heart">
      <g className="bear-stars" fill="none" stroke="#DAAA8D" strokeLinecap="round" strokeWidth="3.5">
        <path d="M86 78v23m-11-11h23M435 79v25m-12-12h25M420 276v15m-7-7h14" />
        <path d="M121 238l7 9 7-9-7-9zM397 182l6 9 6-9-6-9z" fill="#F7D69D" stroke="none" />
      </g>
      <ellipse cx="266" cy="310" rx="147" ry="15" fill="#E7CBD0" opacity=".42" />
      {/* Cocoa bear, gently leaning toward their partner. */}
      <g className="bear-cocoa">
        <g fill="#BA9078" stroke="#75564D" strokeWidth="5" strokeLinejoin="round">
          <path d="M283 214c-21 22-33 54-20 82 13 27 88 35 121 8 30-25 20-69-3-91z" />
          <circle cx="306" cy="107" r="33" /><circle cx="402" cy="111" r="33" />
          <path d="M301 136c7-43 52-59 92-49 45 11 62 45 59 86-3 50-35 86-86 91-50 3-91-27-99-69-4-22 7-44 34-59z" />
          <path d="M360 230c38 12 55 30 46 46-9 17-39 5-65-12" strokeLinecap="round" />
        </g>
        <g fill="#DAB3A0"><ellipse cx="305" cy="109" rx="13" ry="16"/><ellipse cx="402" cy="111" rx="13" ry="16"/></g>
        <path d="M322 178q9-10 18 0M387 179q9-10 18 0" fill="none" stroke="#60443F" strokeWidth="5" strokeLinecap="round" />
        <ellipse cx="320" cy="202" rx="15" ry="9" fill="#E9A5A7" opacity=".9" />
        <ellipse cx="414" cy="201" rx="15" ry="9" fill="#E9A5A7" opacity=".9" />
        <ellipse cx="367" cy="202" rx="24" ry="17" fill="#E4C3AF" />
        <path d="M361 195q6-6 12 0l-6 5z" fill="#60443F" /><path d="M367 200v8q-9 10-17 0m17 0q9 10 17 0" fill="none" stroke="#60443F" strokeWidth="3" strokeLinecap="round" />
      </g>
      {/* Cream bear cuddles the cocoa bear; the arms overlap to make a hug. */}
      <g className="bear-cream">
        <g fill="#FFF6EA" stroke="#856D68" strokeWidth="5" strokeLinejoin="round">
          <path d="M144 215c-31 27-34 74-11 92 20 16 83 14 110-2 28-17 30-57 4-89z" />
          <circle cx="151" cy="113" r="31" /><circle cx="237" cy="106" r="31" />
          <path d="M143 136c-15 12-24 38-22 61 4 45 38 73 83 73 44 0 84-29 86-73 1-25-10-52-30-64-29-19-91-19-117 3z" />
          <path d="M244 244c13-13 27-19 48-13l42 20c13 6 12 23-3 28-19 8-63-4-85-17" strokeLinecap="round" />
        </g>
        <g fill="#F5D4CC"><ellipse cx="151" cy="113" rx="12" ry="16"/><ellipse cx="237" cy="107" rx="12" ry="16"/></g>
        <path d="M164 188q8-10 16 0M223 188q8-10 16 0" fill="none" stroke="#604F4A" strokeWidth="5" strokeLinecap="round" />
        <ellipse cx="153" cy="211" rx="16" ry="10" fill="#F2B7B4" opacity=".8" /><ellipse cx="252" cy="211" rx="15" ry="10" fill="#F2B7B4" opacity=".8" />
        <ellipse cx="202" cy="208" rx="24" ry="17" fill="#FFFDF9" />
        <path d="M196 200q6-6 12 0l-6 5z" fill="#604F4A" /><path d="M202 205v7q-8 10-16 0m16 0q8 10 16 0" fill="none" stroke="#604F4A" strokeWidth="3" strokeLinecap="round" />
      </g>
      <g className="bear-heart" fill="#E994A5" stroke="#C56A86" strokeWidth="3" strokeLinejoin="round">
        <path d="M270 73c-8-14-27-16-35-5-12 19 20 40 35 51 15-11 47-32 35-51-8-11-27-9-35 5z" />
        <path d="M342 37c-3-6-12-7-16-2-6 8 8 18 16 23 8-5 22-15 16-23-4-5-13-4-16 2z" fill="#F6C6C9" stroke="none" />
      </g>
    </svg>
  );
}
