with open('frontend/src/App.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

old_lines = [
    "        pipeline: s.pipeline || (s.pipeline_steps\n",
    "          ? Object.entries(s.pipeline_steps).map(([name, info], i) => ({\n",
    "              id: name + i,\n",
    '              name: name.replace(/_/g, " ").replace(\\w/g, c => c.toUpperCase()),\n',
    '              status: info.result === "PASS" ? "passed" : info.result === "FAIL" ? "failed" : info.result === "running" ? "running" : "passed",\n',
    "              duration_ms: null,\n",
    '              logs: info.detail ? [info.detail] : ["Completed"],\n',
    "            }))\n",
    "          : []),\n",
]

new_lines = [
    "        pipeline: s.pipeline_steps\n",
    "          ? Object.entries(s.pipeline_steps).map(([name, info], i) => ({\n",
    "              id: name + i,\n",
    '              name: name.replace(/_/g, " ").replace(/\\b\\w/g, c => c.toUpperCase()),\n',
    '              status: ["PASS", "SCANNED"].includes(info.result) ? "passed" : ["FAIL", "FAILED", "BLOCK"].includes(info.result) ? "failed" : info.result === "running" ? "running" : info.result === "skipped" ? "skipped" : "passed",\n',
    "              duration_ms: null,\n",
    '              logs: info.detail ? [info.detail] : ["Completed"],\n',
    "            }))\n",
    "          : [],\n",
]

found = False
for i in range(len(lines) - len(old_lines) + 1):
    if lines[i:i+len(old_lines)] == old_lines:
        lines[i:i+len(old_lines)] = new_lines
        found = True
        break

if found:
    print("PATCHED OK at line", i + 1)
else:
    print("STILL NOT FOUND - exact line match failed")

with open('frontend/src/App.js', 'w', encoding='utf-8') as f:
    f.writelines(lines)
