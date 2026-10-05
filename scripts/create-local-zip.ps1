param([string]$OutputPath = "")

$ErrorActionPreference = "Stop"
$taskRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")).Path
Push-Location -LiteralPath $taskRoot
try {
  if ([string]::IsNullOrWhiteSpace($OutputPath)) {
    & pnpm.cmd run template:export
  } else {
    & pnpm.cmd run template:export --output $OutputPath
  }
  if ($LASTEXITCODE -ne 0) { throw "A exportação do template falhou." }
} finally {
  Pop-Location
}
