# IHME Asbestos Burden and Evidence Atlas

Visual prototype for a global asbestos-related disease dashboard shaped around the IHME ecosystem.

## What this prototype does

- Maps global burden intensity for mesothelioma, asbestosis, and asbestos-attributable lung cancer
- Switches between burden, evidence coverage, and blind-spot views
- Ranks countries where burden and thin evidence overlap
- Shows a burden-vs-coverage scatterplot and a selected-country trend line
- Documents which IHME surfaces feed each layer

## Important honesty note

This repository currently uses a **synthesis dataset** in `data/atlas-data.json`.

- The schema is designed to accept official exports from IHME tools.
- The burden values are placeholder demo intensities for interface development.
- `coverage score` and `blind-spot score` are inferred metrics, not official IHME outputs.

That separation is deliberate so the eventual production dashboard can remain methodologically transparent.

## Recommended production data flow

1. Export asbestos-related burden series from IHME `GBD Results`.
2. Export source metadata for the matching causes and risks from `GBD 2021 Sources Tool`.
3. Add supporting context from `Epi Visualization`, `Causes of Death Visualization`, `Data Coverage Map`, and `Country Profiles`.
4. Transform the exports into the JSON schema already used by this prototype.
5. Recalculate the inferred evidence metrics from real source counts, recency, and uncertainty widths.

## IHME surfaces used for the concept

- `GBD Results`
- `GBD 2021 Sources Tool`
- `Epi Visualization`
- `Causes of Death Visualization`
- `Data Coverage Map`
- `Country Profiles`

## Local preview

Because this is a static site, serve the folder with any local web server.

Example:

```bash
cd /Users/rajasingh/Documents/New\ project/ihme-asbestos-atlas
python3 -m http.server 8080
```

Then open `http://localhost:8080`.
