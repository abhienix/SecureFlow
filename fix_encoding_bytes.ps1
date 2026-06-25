$path = Join-Path $PWD "frontend\src\App.js"

# Read the file as raw bytes - no text interpretation at all
$bytes = [System.IO.File]::ReadAllBytes($path)

# The corrupted sequence "â€"" (em dash mojibake) as UTF-8 bytes is:
#   â  = 0xC3 0xA2
#   €  = 0xE2 0x82 0xAC
#   "  = 0xE2 0x80 0x9D   (or sometimes followed by different continuation bytes)
# Rather than guess every variant, we search for the byte sequence:
#   0xC3 0xA2 0x82 0xAC  -- this is "â€" partial UTF-8 mojibake prefix common to ALL these corruptions
#   (â€”, â€¦, â€¢, â€™, â€œ all start with these same first bytes: C3 A2 E2 82 AC)

# Define byte patterns (as int arrays) for each corrupted sequence and its correct replacement
# Corrupted "â€”" (em dash mojibake) -> real em dash "—" (UTF-8: E2 80 94)
$emdash_corrupt = [byte[]](0xC3,0xA2,0xE2,0x82,0xAC,0xE2,0x80,0x9D)
$emdash_fix     = [byte[]](0xE2,0x80,0x94)

# Corrupted "â€¦" (ellipsis mojibake) -> real ellipsis "…" (UTF-8: E2 80 A6)
$ellipsis_corrupt = [byte[]](0xC3,0xA2,0xE2,0x82,0xAC,0xC2,0xA6)
$ellipsis_fix     = [byte[]](0xE2,0x80,0xA6)

# Corrupted "â€¢" (bullet mojibake) -> real bullet "•" (UTF-8: E2 80 A2)
$bullet_corrupt = [byte[]](0xC3,0xA2,0xE2,0x82,0xAC,0xC2,0xA2)
$bullet_fix     = [byte[]](0xE2,0x80,0xA2)

function Replace-ByteSequence {
    param([byte[]]$source, [byte[]]$find, [byte[]]$replace)
    $result = New-Object System.Collections.Generic.List[byte]
    $i = 0
    $count = 0
    while ($i -lt $source.Length) {
        $matched = $true
        if ($i + $find.Length -le $source.Length) {
            for ($j = 0; $j -lt $find.Length; $j++) {
                if ($source[$i + $j] -ne $find[$j]) { $matched = $false; break }
            }
        } else {
            $matched = $false
        }
        if ($matched) {
            $result.AddRange($replace)
            $i += $find.Length
            $count++
        } else {
            $result.Add($source[$i])
            $i++
        }
    }
    return @{ Bytes = $result.ToArray(); Count = $count }
}

Write-Host "Original file size: $($bytes.Length) bytes"

$r1 = Replace-ByteSequence -source $bytes -find $emdash_corrupt -replace $emdash_fix
Write-Host "Em-dash fixes applied: $($r1.Count)"

$r2 = Replace-ByteSequence -source $r1.Bytes -find $ellipsis_corrupt -replace $ellipsis_fix
Write-Host "Ellipsis fixes applied: $($r2.Count)"

$r3 = Replace-ByteSequence -source $r2.Bytes -find $bullet_corrupt -replace $bullet_fix
Write-Host "Bullet fixes applied: $($r3.Count)"

[System.IO.File]::WriteAllBytes($path, $r3.Bytes)

Write-Host ""
Write-Host "New file size: $($r3.Bytes.Length) bytes"
Write-Host "SUCCESS: byte-level corruption fix applied and saved"
