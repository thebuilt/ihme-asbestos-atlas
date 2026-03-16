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

## Methodology and simplification note

This project distinguishes between:

- intended official inputs from IHME tools
- inferred prototype metrics created for visualization on this site

Burden values in a production version of this atlas should come directly from IHME GBD outputs.
By contrast, the `coverage score`, `blind-spot score`, `uncovered population share`, and any
composite weighting scheme in this prototype are inferred constructs created for exploratory use.

The current prototype uses a demo composite formula for blind spots:

```text
gap score = 0.35 x burden percentile
          + 0.25 x uncovered population share
          + 0.20 x uncertainty
          + 0.10 x source staleness
          + 0.10 x source sparsity
```

These weights are judgment-based design choices. They are not official IHME methodology and have not
been formally validated. They were informed by general composite-indicator guidance and public health
data quality concepts, but they should be treated as an exploratory heuristic rather than a
definitive ranking system.

## Assumptions

- Higher estimated burden should increase priority even when evidence quality varies.
- Larger uncovered population share may indicate greater risk of under-observation.
- Greater uncertainty can serve as a caution signal for weaker or less stable evidence environments.
- Older source inputs reduce confidence in how current the evidence picture is.
- Fewer available sources may indicate thinner evidence support, even though source count is not a direct measure of source quality.
- Combining multiple evidence dimensions into one score can be useful for communication, even though it compresses a more complex system.

## Possible limitations

- The blind-spot score is not an official IHME indicator.
- The weighting scheme is heuristic and judgment-based.
- Different weighting choices could materially change country rankings.
- Uncertainty is an imperfect proxy for evidence weakness.
- Source count does not equal source quality.
- Population outside reported coverage is an inferred approximation, not a universal observed statistic.
- Country-level averages may hide meaningful subnational hotspots and occupational clusters.
- Exploratory visualizations can highlight candidate blind spots, but they do not establish surveillance adequacy on their own.

## Legal and use disclaimers

- This repository and its associated website are provided for informational and exploratory visualization purposes only.
- Nothing in this repository constitutes medical advice, diagnosis, treatment advice, legal advice, occupational safety advice, or regulatory advice.
- This project is not an official IHME product.
- References to IHME sources, tools, methods, or publications do not imply endorsement, review, certification, sponsorship, or affiliation by IHME.
- No representation or warranty is made that the visualizations, rankings, derived indicators, or summaries are complete, current, error-free, or fit for any particular purpose.
- Users should not rely on this project as the sole basis for clinical decisions, compensation claims, legal proceedings, regulatory action, public policy, or investment decisions.
- Users are responsible for verifying important findings against original IHME materials and other authoritative sources before relying on them.
- Methods, assumptions, weights, and outputs may change over time as the project is refined.

## References supporting the simplification framing

- OECD/JRC, `Handbook on Constructing Composite Indicators: Methodology and User Guide`
- WHO, `Data Quality Review Toolkit, Module 1`
- IHME, `GBD 2021 Data Tools Guide`
- IHME GBD 2021 disease and injury analysis summary
- IHME GBD 2021 causes of death analysis summary

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
