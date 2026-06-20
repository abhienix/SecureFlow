- name: Send Trivy results to backend
        env:
          BACKEND_URL: ${{ secrets.BACKEND_URL }}
          REPO_NAME: ${{ github.repository }}
          COMMIT_SHA: ${{ github.sha }}
          BRANCH_NAME: ${{ github.ref_name }}
        run: |
          PAYLOAD=$(jq -n \
            --arg repo "$REPO_NAME" \
            --arg sha "$COMMIT_SHA" \
            --arg branch "$BRANCH_NAME" \
            --arg scan_type "trivy" \
            --arg severity "unknown" \
            --slurpfile findings trivy-results.json \
            '{repo_name: $repo, commit_sha: $sha, branch: $branch, scan_type: $scan_type, severity: $severity, findings: $findings[0]}')
          echo "$PAYLOAD" | curl -X POST "$BACKEND_URL/api/scan-results" \
            -H "Content-Type: application/json" \
            -d @-
        continue-on-error: true