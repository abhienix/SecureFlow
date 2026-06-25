$path = "frontend\src\App.js"
$content = Get-Content $path -Raw

$old = "function PipelineView({ scan }) {`r`n  const [expanded, setExpanded] = useState(null);`r`n  if (!scan?.pipeline?.length) return <EmptyState text=`"No pipeline data`" />;`r`n  const stageColor = (s) => s === `"passed`" ? C.teal : s === `"failed`" ? C.red : C.inkLow;`r`n  const stageIcon  = (s) =>`r`n    s === `"passed`"  ? <CheckCircle size={14} color={C.teal} /> :`r`n    s === `"failed`"  ? <XCircle size={14} color={C.red} /> :`r`n    <Minus size={14} color={C.inkLow} />;`r`n  return (`r`n    <div style={{ position: `"relative`" }}>`r`n      {scan.pipeline.map((stage, i) => {`r`n        const isLast = i === scan.pipeline.length - 1;"

$new = "function PipelineView({ scan }) {`r`n  const [expanded, setExpanded] = useState(null);`r`n  const steps = scan?.pipeline_steps;`r`n  if (!steps || !Object.keys(steps).length) return <EmptyState text=`"No pipeline data`" />;`r`n  const pipeline = Object.entries(steps).map(([key, val]) => ({`r`n    id: key,`r`n    name: key.replace(/_/g, `" `").replace(/\b\w/g, c => c.toUpperCase()),`r`n    status: val.result === `"PASS`" || val.result === `"SCANNED`" ? `"passed`" : (val.result === `"BLOCK`" || val.result === `"FAILED`" ? `"failed`" : `"skipped`"),`r`n    duration_ms: 0,`r`n    logs: [val.detail || `"`"],`r`n  }));`r`n  const stageColor = (s) => s === `"passed`" ? C.teal : s === `"failed`" ? C.red : C.inkLow;`r`n  const stageIcon  = (s) =>`r`n    s === `"passed`"  ? <CheckCircle size={14} color={C.teal} /> :`r`n    s === `"failed`"  ? <XCircle size={14} color={C.red} /> :`r`n    <Minus size={14} color={C.inkLow} />;`r`n  return (`r`n    <div style={{ position: `"relative`" }}>`r`n      {pipeline.map((stage, i) => {`r`n        const isLast = i === pipeline.length - 1;"

if ($content.Contains($old)) {
    $content = $content.Replace($old, $new)
    Set-Content -Path $path -Value $content -NoNewline -Encoding UTF8
    Write-Host "SUCCESS: PipelineView updated"
} else {
    Write-Host "ERROR: exact text not found - the file content does not match expected text"
    Write-Host "This can happen if line endings differ. Trying line-ending-agnostic match..."

    $oldLF = $old -replace "`r`n", "`n"
    $contentLF = $content -replace "`r`n", "`n"
    if ($contentLF.Contains($oldLF)) {
        $newLF = $new -replace "`r`n", "`n"
        $contentLF = $contentLF.Replace($oldLF, $newLF)
        Set-Content -Path $path -Value $contentLF -NoNewline -Encoding UTF8
        Write-Host "SUCCESS (LF mode): PipelineView updated"
    } else {
        Write-Host "STILL FAILED: please paste lines 943-957 again, exactly as currently in the file"
    }
}
