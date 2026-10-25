# Draw_Date patch workflow

Future updates arrive as `.patch` files made by `git format-patch`. Each patch
already contains its intended commit message. A PowerShell script applies it,
creates the Git commit, and pushes it to your current branch.

## One-time local setup

```powershell
git clone https://github.com/Shadhujan/Draw_Date.git
cd Draw_Date
npm ci
npm run dev
```

## Install the first workflow patch

Download `0001-chore-dev-add-automatic-git-am-patch-workflow.patch` and place it
in the repository root. From the repo root run:

```powershell
git am --3way .\0001-chore-dev-add-automatic-git-am-patch-workflow.patch
git push origin main
```

Remove the downloaded patch after applying. Subsequent patches go into the
ignored `.incoming-patches/` directory.

## Future updates (one command)

```powershell
.\scripts\apply-patch.ps1 .\.incoming-patches\0002-example.patch
```

If local PowerShell execution policy blocks the helper:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\apply-patch.ps1 .\.incoming-patches\0002-example.patch
```

The script requires a clean working tree and a branch that matches GitHub.
It verifies both before applying anything. If `git am` fails, the script
stops without pushing. Resolve manually with `git am --continue` or undo
with `git am --abort`. Never run a successfully applied patch twice.

For all future deliveries, the patch subject is the intended commit message.
Examples: `feat(drawing): add guided tracing hints` and
`style(ui): add pink and green theme switcher`.

## Safety

Never commit `.env.local` or Supabase service-role credentials. The original
MVP uses public Realtime rooms and is not yet secured for private two-person
access. Reuse the Lovebug Booth project only after proper authorization work.
