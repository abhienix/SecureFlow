$path = Join-Path $PWD "frontend\src\App.js"

# Read raw bytes
$bytes = [System.IO.File]::ReadAllBytes($path)

# Check for UTF-8 BOM (EF BB BF) and strip it if present
if ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) {
    Write-Host "BOM detected - stripping it"
    $bytes = $bytes[3..($bytes.Length - 1)]
} else {
    Write-Host "No BOM found at start of file"
}

# Write back without BOM, using UTF8 encoding object configured to NOT emit a BOM
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllBytes($path, $bytes)

Write-Host "SUCCESS: File rewritten without BOM"
Write-Host ""
Write-Host "Verifying first 4 bytes now:"
$check = [System.IO.File]::ReadAllBytes($path) | Select-Object -First 4
$check
