# Optional REA research plan

REA: https://github.com/morluto/rea (https://rea.tools/)

**Status:** This starter was implemented from the general gameplay concept, not from ArtWorkout's app package. There has been no APK decompilation, runtime trace, or comparison with proprietary code.

## Why REA could be useful

REA can inspect authorized Android APKs with a JDK and JADX, and inspect app runtime through ADB. Use it to answer targeted questions about a feature you are permitted to study, and record both evidence and limitations. It is not a one-click "port this APK to the web" button.

## Prepare your local environment

1. Read REA's latest setup documentation at https://rea.tools/ and verify the published package / repository.
2. Check `node --version`; the October 2026 repository documentation lists supported Node branches with minimum patch versions. Update to a supported patch before setup.
3. Review the actions the installer proposes before approval:

```powershell
npx rea-agents@latest setup
```

4. For authorized APK analysis, install the version of the JDK and headless JADX that REA documents, and provide an APK you have a legal right to inspect.
5. Start with narrow, evidence-based questions, such as:
   - Which pointer gestures does the app accept (finger, stylus, pressure, cancel)?
   - How does the guide progress or stroke feedback appear at the UI level?
   - What canvas aspect ratio and coordinate transforms are relevant?
   - How does a drawing session recover from a lost connection?
6. Compare only *observable gameplay behavior* and rebuild independently with original UI, custom illustrations, and our own networking protocol.

## Boundaries

Do not scrape the app's copyrighted lesson catalog or graphics, copy proprietary source code, bypass subscription/licensing controls, circumvent access restrictions, impersonate the app, or connect to its private backend. The MVP does not require any of those actions.

## What remains to be built

- Optional guided lesson steps with gentle feedback based on our original SVG paths.
- Better durable storage and genuinely authenticated two-person rooms if strict privacy is needed.
- Optional visual comparison with authorized screenshots, solely to understand broad user-facing interaction patterns.
