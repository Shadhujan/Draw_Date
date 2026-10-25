[CmdletBinding()]
param(
    [Parameter(Mandatory=$true, Position=0)]
    [string[]]$PatchPath
)
$ErrorActionPreference = 'Stop'
$patches = @(
    foreach ($p in $PatchPath) {
        $f = (Resolve-Path -LiteralPath $p).Path
        if (-not (Test-Path -LiteralPath $f -PathType Leaf)) { throw "Missing patch: $p" }
        if ((Get-Content -LiteralPath $f -TotalCount 1) -notmatch '^From [0-9a-fA-F]{40} ') {
            throw "Expected git format-patch file: $p"
        }
        $f
    }
)
$root = (& git rev-parse --show-toplevel)
if ($LASTEXITCODE -ne 0) { throw 'Run this from a Git repository.' }
Push-Location $root
try {
    $branch = (& git branch --show-current).Trim()
    if (-not $branch) { throw 'Check out a branch first.' }
    if ((& git status --porcelain).Count -gt 0) { throw 'Working tree must be clean; save patches in .incoming-patches.' }
    & git fetch origin $branch
    if ($LASTEXITCODE -ne 0) { throw 'Fetch failed. No patch applied.' }
    $localHead = (& git rev-parse HEAD).Trim()
    $remoteHead = (& git rev-parse "origin/$branch").Trim()
    if ($localHead -ne $remoteHead) { throw "Local branch differs from origin/$branch. Sync before applying." }
    & git am --3way @patches
    if ($LASTEXITCODE -ne 0) { throw 'Patch conflicted: use git am --abort or resolve and git am --continue. Nothing pushed.' }
    & git push origin $branch
    if ($LASTEXITCODE -ne 0) { throw "Committed locally but push failed; retry: git push origin $branch" }
    & git log -1 --oneline
} finally { Pop-Location }
