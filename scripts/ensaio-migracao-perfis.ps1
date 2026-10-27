# Gera o arquivo do ensaio da migracao dos varios perfis. NAO envia nada ao servidor.
#
# O arquivo gerado tem: BEGIN; <corpo da migracao>; <corpo de novo>; <testes>; ROLLBACK;
# - o corpo e a migracao sem as linhas BEGIN; e COMMIT; (o script falha se nao achar exatamente uma de cada);
# - o corpo duas vezes prova que a migracao e idempotente;
# - os testes dao RAISE EXCEPTION quando algo nao sai como esperado, e o psql (-v ON_ERROR_STOP=1) para ali.
# Como tudo termina em ROLLBACK, nada fica gravado. O envio ao servidor esta no DEPLOY.md.
#
# Uso (na raiz do repositorio):
#   powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ensaio-migracao-perfis.ps1
# Parametros opcionais: -Migracao <arquivo.sql> -Testes <a.sql>,<b.sql> -Saida <arquivo gerado>
param(
  [string]$Migracao = 'deploy\vpsavila\migrations\2026-10-26-varios-perfis.sql',
  [string[]]$Testes = @('scripts\ensaio-perfis-testes.sql', 'scripts\ensaio-perfis-testes-storage.sql'),
  [string]$Saida = (Join-Path $env:TEMP 'linkhub-ensaio-varios-perfis.sql')
)

$ErrorActionPreference = 'Stop'
$raiz = Split-Path -Parent $PSScriptRoot
# UTF-8 sem BOM: com BOM, o psql acusa erro de sintaxe na primeira linha
$utf8 = New-Object System.Text.UTF8Encoding $false

function Resolve-NoRepositorio([string]$caminho) {
  if ([System.IO.Path]::IsPathRooted($caminho)) { return $caminho }
  return (Join-Path $raiz $caminho)
}

$linhas = [System.IO.File]::ReadAllLines((Resolve-NoRepositorio $Migracao), $utf8)
$qtdBegin = @($linhas | Where-Object { $_.Trim() -eq 'BEGIN;' }).Count
$qtdCommit = @($linhas | Where-Object { $_.Trim() -eq 'COMMIT;' }).Count
if ($qtdBegin -ne 1) { throw "A migracao precisa ter exatamente uma linha 'BEGIN;' (achei $qtdBegin)." }
if ($qtdCommit -ne 1) { throw "A migracao precisa ter exatamente uma linha 'COMMIT;' (achei $qtdCommit)." }
$corpo = ($linhas | Where-Object { $_.Trim() -ne 'BEGIN;' -and $_.Trim() -ne 'COMMIT;' }) -join "`n"

$partes = New-Object System.Collections.Generic.List[string]
$partes.Add('-- Gerado por scripts/ensaio-migracao-perfis.ps1. Termina em ROLLBACK: nada fica gravado.')
$partes.Add('BEGIN;')
$partes.Add('-- ===== Corpo da migracao, 1a vez =====')
$partes.Add($corpo)
$partes.Add('-- ===== Corpo da migracao, 2a vez (idempotencia) =====')
$partes.Add($corpo)
foreach ($arquivo in $Testes) {
  $texto = [System.IO.File]::ReadAllText((Resolve-NoRepositorio $arquivo), $utf8)
  if ($texto -match '(?m)^\s*(BEGIN|COMMIT|ROLLBACK);\s*$') {
    throw "O arquivo de testes $arquivo nao pode ter linhas BEGIN;, COMMIT; ou ROLLBACK;."
  }
  $partes.Add("-- ===== Testes: $arquivo =====")
  $partes.Add($texto)
}
$partes.Add('ROLLBACK;')

[System.IO.File]::WriteAllText($Saida, (($partes -join "`n") + "`n"), $utf8)
Write-Host "Ensaio gerado em $Saida"
