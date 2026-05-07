# debugbundle/action

Reference GitHub Action for DebugBundle incident automation.

Public distribution path: `debugbundle/action@v1`.

This action fetches a DebugBundle incident bundle and reproduction artifact with a DebugBundle member token and writes them into the canonical cloud cache layout:

- `.debugbundle/bundles/cloud/<incident-id>.bundle.json`
- `.debugbundle/bundles/cloud/reproductions/<incident-id>.reproduction.json`

The action is designed for `repository_dispatch` workflows triggered by DebugBundle GitHub automation.

This repository is the dedicated public `debugbundle/action` source of truth.

## Usage

```yaml
name: DebugBundle Incident Handler

on:
  repository_dispatch:
    types: [debugbundle.incident]

jobs:
  handle-incident:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Fetch DebugBundle context
        uses: debugbundle/action@v1
        with:
          incident-id: ${{ github.event.client_payload.incident_id }}
          debugbundle-token: ${{ secrets.DEBUGBUNDLE_TOKEN }}

      - name: Review bundle metadata
        run: |
          cat .debugbundle/bundles/cloud/${{ github.event.client_payload.incident_id }}.bundle.json
```

## Inputs

| Input | Required | Default | Description |
|---|---|---|---|
| `incident-id` | Yes | — | Incident identifier to fetch from DebugBundle |
| `debugbundle-token` | Yes | — | DebugBundle member token with incident retrieval access |
| `api-base-url` | No | `https://api.debugbundle.com` | Base URL for the DebugBundle API |
| `workspace-root` | No | `.` | Workspace root where `.debugbundle/` should be written |

## Outputs

| Output | Description |
|---|---|
| `bundle-path` | Path to the fetched bundle JSON |
| `reproduction-path` | Path to the fetched reproduction JSON |
| `reproduction-status` | `available`, `pending`, or `not_found` |

## Notes

- The action expects DebugBundle to trigger the workflow through `repository_dispatch` with `event_type: debugbundle.incident`.
- Bundle fetches fail fast if the bundle endpoint returns a non-ready payload.
- Reproduction fetches are written even when the artifact is still pending so later steps can branch on `reproduction-status`.
- See the repository examples in `examples/github-actions/` for basic, agent-capable, and issue-creation workflow patterns.
