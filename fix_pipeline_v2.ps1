$path = "frontend\src\App.js"
$lines = Get-Content $path

# Lines 943-956 (1-indexed) = indices 942-955 (0-indexed)
# We replace this block:
#   943: function PipelineView({ scan }) {
#   944:   const [expanded, setExpanded] = useState(null);
#   945:   if (!scan?.pipeline?.length) return <EmptyState text="No pipeline data" />;
#   946: (blank)
#   947:   const stageColor = ...
#   948-951: stageIcon block
#   952: (blank)
#   953:   return (
#   954:     <div style={{ position: "relative" }}>
#   955:       {scan.pipeline.map((stage, i) => {
#   956:         const isLast = i === scan.pipeline.length - 1;

$startIdx = 942  # line 943, 0-indexed
$endIdx   = 955  # line 956, 0-indexed

# Verify the anchor lines match what we expect before touching anything
$check943 = $lines[$startIdx].Trim()
$check945 = $lines[944].Trim()
$check955 = $lines[954].Trim()
$check956 = $lines[955].Trim()

Write-Host "Line 943 found: $check943"
Write-Host "Line 945 found: $check945"
Write-Host "Line 955 found: $check955"
Write-Host "Line 956 found: $check956"

if ($check943 -ne "function PipelineView({ scan }) {") {
    Write-Host "MISMATCH on line 943 - aborting, no changes made"
    exit
}
if ($check956 -notmatch "const isLast = i === scan.pipeline.length - 1;") {
    Write-Host "MISMATCH on line 956 - aborting, no changes made"
    exit
}

$replacement = @(
    'function PipelineView({ scan }) {',
    '  const [expanded, setExpanded] = useState(null);',
    '  const steps = scan?.pipeline_steps;',
    '  if (!steps || !Object.keys(steps).length) return <EmptyState text="No pipeline data" />;',
    '  const pipeline = Object.entries(steps).map(([key, val]) => ({',
    '    id: key,',
    '    name: key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),',
    '    status: val.result === "PASS" || val.result === "SCANNED" ? "passed" : (val.result === "BLOCK" || val.result === "FAILED" ? "failed" : "skipped"),',
    '    duration_ms: 0,',
    '    logs: [val.detail || ""],',
    '  }));',
    '',
    '  const stageColor = (s) => s === "passed" ? C.teal : s === "failed" ? C.red : C.inkLow;',
    '  const stageIcon  = (s) =>',
    '    s === "passed"  ? <CheckCircle size={14} color={C.teal} /> :',
    '    s === "failed"  ? <XCircle size={14} color={C.red} /> :',
    '    <Minus size={14} color={C.inkLow} />;',
    '',
    '  return (',
    '    <div style={{ position: "relative" }}>',
    '      {pipeline.map((stage, i) => {',
    '        const isLast = i === pipeline.length - 1;'
)

$before = $lines[0..($startIdx - 1)]
$after  = $lines[($endIdx + 1)..($lines.Length - 1)]

$newContent = $before + $replacement + $after

Set-Content -Path $path -Value $newContent -Encoding UTF8

Write-Host ""
Write-Host "SUCCESS: PipelineView block replaced (lines 943-956 -> new block)"
Write-Host "Run: Select-String -Path frontend\src\App.js -Pattern 'pipeline_steps' to verify"
