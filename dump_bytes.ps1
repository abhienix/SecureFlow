$path = Join-Path $PWD "frontend\src\App.js"
$bytes = [System.IO.File]::ReadAllBytes($path)

# Convert to string using Latin1/Windows-1252 just to locate the line (for searching purposes only)
$text = [System.Text.Encoding]::GetEncoding("ISO-8859-1").GetString($bytes)

# Find "SecureFlow" near the start (should be on line 2, in the corrupted comment)
$idx = $text.IndexOf("SecureFlow")
if ($idx -lt 0) {
    Write-Host "Could not find anchor text 'SecureFlow'"
    exit
}

# Grab 60 bytes starting a bit before that point to capture the corrupted dash after it
$start = $idx
$length = 60
if ($start + $length -gt $bytes.Length) { $length = $bytes.Length - $start }

$slice = $bytes[$start..($start + $length - 1)]

Write-Host "Bytes from offset $start to $($start+$length):"
Write-Host ""
$hexLine = ""
$charLine = ""
for ($i = 0; $i -lt $slice.Length; $i++) {
    $hexLine += "{0:X2} " -f $slice[$i]
}
Write-Host $hexLine
Write-Host ""
Write-Host "As Latin1 text (for visual reference only):"
Write-Host ([System.Text.Encoding]::GetEncoding("ISO-8859-1").GetString($slice))
