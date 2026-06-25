with open('frontend/src/App.js', 'r', encoding='utf-8') as f:
    content = f.read()

old_pipeline = """        pipeline: s.pipeline || (s.pipeline_steps
          ? Object.entries(s.pipeline_steps).map(([name, info], i) => ({
              id: name + i,
              name: name.replace(/_/g, " ").replace(/\\w/g, c => c.toUpperCase()),
              status: info.result === "PASS" ? "passed" : info.result === "FAIL" ? "failed" : info.result === "running" ? "running" : "passed",
              duration_ms: null,
              logs: info.detail ? [info.detail] : ["Completed"],
            }))
          : []),"""

new_pipeline = """        pipeline: s.pipeline_steps
          ? Object.entries(s.pipeline_steps).map(([name, info], i) => ({
              id: name + i,
              name: name.replace(/_/g, " ").replace(/\\b\\w/g, c => c.toUpperCase()),
              status: ["PASS", "SCANNED"].includes(info.result) ? "passed" : ["FAIL", "FAILED", "BLOCK"].includes(info.result) ? "failed" : info.result === "running" ? "running" : info.result === "skipped" ? "skipped" : "passed",
              duration_ms: null,
              logs: info.detail ? [info.detail] : ["Completed"],
            }))
          : [],"""

if old_pipeline in content:
    content = content.replace(old_pipeline, new_pipeline)
    print("FIX 1+2 OK: pipeline conversion + status mapping patched")
else:
    print("FIX 1+2 FAILED")

old_reltime = '''const relTime = (iso) => { if (!iso) return "\u2014"; const m = Math.floor((Date.now() - new Date(iso)) / 60000); if (m < 1) return "just now"; if (m < 60) return `${m}m ago`; const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`; return `${Math.floor(h / 24)}d ago`; };'''

new_reltime = '''const relTime = (iso) => { if (!iso) return "\u2014"; const fixedIso = /Z$|[+-]\\d\\d:\\d\\d$/.test(iso) ? iso : iso + "Z"; const m = Math.floor((Date.now() - new Date(fixedIso)) / 60000); if (m < 1) return "just now"; if (m < 60) return `${m}m ago`; const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`; return `${Math.floor(h / 24)}d ago`; };'''

if old_reltime in content:
    content = content.replace(old_reltime, new_reltime)
    print("FIX 6 OK: relTime UTC handling patched")
else:
    print("FIX 6 FAILED")

with open('frontend/src/App.js', 'w', encoding='utf-8') as f:
    f.write(content)
