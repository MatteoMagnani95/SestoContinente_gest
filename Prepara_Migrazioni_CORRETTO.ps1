# Sesto Continente - Rinomina sicura delle migrazioni locali.
# Anteprima (nessuna modifica): .\Prepara_Migrazioni_CORRETTO.ps1
# Applica SOLO i rinomini locali: .\Prepara_Migrazioni_CORRETTO.ps1 -Applica
# Nessuna connessione o scrittura sul database Supabase.
[CmdletBinding()]
param([switch]$Applica)
$ErrorActionPreference = 'Stop'

$cartella = Join-Path (Get-Location).Path 'supabase\migrations'
if (-not (Test-Path -LiteralPath '.\package.json' -PathType Leaf) -or
    -not (Test-Path -LiteralPath $cartella -PathType Container)) {
    throw 'Apri PowerShell nella radice del repository: devono esistere package.json e supabase\migrations.'
}

# Oggetti espliciti: evita che PowerShell appiattisca accidentalmente gli array annidati.
$mappings = @(
    [pscustomobject]@{ Original = '0001_fase1.sql'; Destinazione = '20261111210100_fase1.sql' }
    [pscustomobject]@{ Original = '0002_gestionale_completo.sql'; Destinazione = '20261111210200_gestionale_completo.sql' }
    [pscustomobject]@{ Original = '0003_schede_soci.sql'; Destinazione = '20261111210300_schede_soci.sql' }
    [pscustomobject]@{ Original = '0004_corsi_guidati.sql'; Destinazione = '20261111210400_corsi_guidati.sql' }
    [pscustomobject]@{ Original = '0005_calendario_economico.sql'; Destinazione = '20261111210500_calendario_economico.sql' }
    [pscustomobject]@{ Original = '0006_incassi_controllati.sql'; Destinazione = '20261111210600_incassi_controllati.sql' }
    [pscustomobject]@{ Original = '0007_ruolo_cda.sql'; Destinazione = '20261116100700_ruolo_cda.sql' }
    [pscustomobject]@{ Original = '0008_v12_sicurezza_organi_didattica_import.sql'; Destinazione = '20261116100800_v12_sicurezza_organi_didattica_import.sql' }
    [pscustomobject]@{ Original = '0009_precaricamento_didattica.sql'; Destinazione = '20261116100900_precaricamento_didattica.sql' }
    [pscustomobject]@{ Original = '0010_v12_riepilogo_cda_certificati.sql'; Destinazione = '20261116101000_v12_riepilogo_cda_certificati.sql' }
)

# Prima valida TUTTI i percorsi; non eseguire rinomini parziali se manca un file.
foreach ($m in $mappings) {
    $origine = Join-Path -Path $cartella -ChildPath $m.Original
    $destinazione = Join-Path -Path $cartella -ChildPath $m.Destinazione
    $vecchioEsiste = Test-Path -LiteralPath $origine -PathType Leaf
    $nuovoEsiste = Test-Path -LiteralPath $destinazione -PathType Leaf
    if ($vecchioEsiste -and $nuovoEsiste) {
        throw "Conflitto: esistono entrambi $($m.Original) e $($m.Destinazione). Nessun rinomino eseguito."
    }
    if (-not $vecchioEsiste -and -not $nuovoEsiste) {
        throw "File mancante: $($m.Original) (o $($m.Destinazione)). Nessun rinomino eseguito."
    }
}

$contatore = 0
foreach ($m in $mappings) {
    $origine = Join-Path -Path $cartella -ChildPath $m.Original
    $destinazione = Join-Path -Path $cartella -ChildPath $m.Destinazione
    if (Test-Path -LiteralPath $destinazione -PathType Leaf) {
        Write-Host "GIA' RINOMINATO: $($m.Destinazione)" -ForegroundColor Gray
    } elseif ($Applica) {
        Rename-Item -LiteralPath $origine -NewName $m.Destinazione -ErrorAction Stop
        $contatore++
        Write-Host "RINOMINATO: $($m.Original) -> $($m.Destinazione)" -ForegroundColor Green
    } else {
        Write-Host "ANTEPRIMA: $($m.Original) -> $($m.Destinazione)" -ForegroundColor Yellow
    }
}
if ($Applica) {
    Write-Host "Operazione locale conclusa: $contatore file rinominati. Nessuna operazione su Supabase." -ForegroundColor Green
} else {
    Write-Host 'Anteprima conclusa: nessun file modificato. Non usare ancora -Applica senza verificare l''elenco.'
}
