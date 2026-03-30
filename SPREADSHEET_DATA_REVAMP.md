# Spreadsheet-Driven Live Data Revamp

## Purpose

This document is the living implementation spec for moving selected dashboards from static JSON files to protected live data sourced from a private spreadsheet.

Phase 1 is a pilot for `extrusion-market`.

## Current State

- The frontend repo is a React/Vite SPA with dashboard pages under `src/dashboards/*`.
- Most dashboards currently fetch compact chart JSON from `public/data/*.json`.
- The frontend already points to a separate Yii2 backend via `src/config/api.ts`.
- The backend route placeholder for live dashboard data already exists as `ENDPOINTS.DASHBOARD.DATA`.
- The local workbook `Aircraft Interiors Extrusion Market.xlsx` has been added as a schema-reference sample.
- The canonical editorial spreadsheet is the private Google Sheet:
  `https://docs.google.com/spreadsheets/d/1x5Kp1W-57drdYbokBG6CqHxeFxddkfrKCy-57c4ZWnQ/edit?usp=sharing`

## Goals

- Keep the spreadsheet private and never expose spreadsheet credentials or direct sheet access in the browser.
- Let editors update the Google Sheet and see changes reflected on the site within 1 to 5 minutes.
- Preserve the existing compact dashboard JSON contract so chart components stay stable.
- Use the extrusion dashboard as the pilot implementation before migrating the rest of the catalog.

## Security Model

- The browser must never call Google Sheets APIs directly.
- The browser must never receive service-account credentials, spreadsheet API tokens, worksheet identifiers, formulas, or raw editorial rows.
- The Yii2 backend is the only system allowed to read the sheet.
- The backend returns only chart-ready, entitlement-checked payloads for a specific dashboard.
- If exact numbers are considered sensitive, the backend must aggregate, round, or omit them before returning the payload.

## High-Level Architecture

1. Editors update the private Google Sheet.
2. A Yii2 sync job reads the sheet server-side every 1 to 5 minutes.
3. The sync job validates and transforms sheet rows into the existing compact dashboard JSON schema.
4. The backend stores the last good payload plus sync metadata.
5. Authorized users request dashboard data through the protected `dashboard-data` API.
6. The frontend renders charts from the compact JSON without needing to know where the data came from.

## Pilot Scope

- Dashboard: `extrusion-market`
- Frontend route: `/dashboard/extrusion-market`
- Dataset membership: `Aircraft Interiors`
- Data source mode:
  - `extrusion-market`: live backend source
  - all other dashboards: current static JSON source

## Spreadsheet Source Contract

### Canonical Source

- Google Sheet ID: `1x5Kp1W-57drdYbokBG6CqHxeFxddkfrKCy-57c4ZWnQ`
- Workbook fallback/reference: `Aircraft Interiors Extrusion Market.xlsx`
- Worksheet/tab for pilot: `Sheet1` unless the backend source-config specifies a different tab name

### Observed Pilot Workbook Structure

The current local workbook has 36 rows and one visible sheet. The structure is section-based, not table-based.

### Explicit Row Mapping

- Row 1:
  - `A1` = market title
  - `B1..` = years
- Row 2:
  - `A2` = unit label
  - `B2..` = `totalMarket`
- Rows 4 to 11:
  - section `By Application Type`
  - map row labels to `application`
- Rows 13 to 18:
  - section `By Aircraft Type`
  - map row labels to `aircraftType`
- Rows 20 to 25:
  - section `By Region`
  - map row labels to `region`
- Rows 27 to 31:
  - section `By Material Type`
  - map row labels to `materialType`
- Rows 33 to 36:
  - section `By End-user Type`
  - map row labels to `endUser`

### Validation Rules

The backend parser must reject the sheet as invalid if any of the following occur:

- expected section headers are missing or renamed unexpectedly
- year headers are missing, duplicated, or non-numeric
- section rows contain non-numeric values where numbers are expected
- a section total row is missing
- any data series length differs from the number of years
- a segment name is duplicated within the same section

### Output Shape

The backend must emit the current compact JSON contract used by the frontend, including empty objects for unsupported nested structures:

```json
{
  "years": [],
  "totalMarket": [],
  "endUser": {},
  "aircraftType": {},
  "region": {},
  "application": {},
  "furnishedEquipment": {},
  "processType": {},
  "materialType": {},
  "countryDataByRegion": {},
  "endUserByAircraftType": {},
  "endUserByRegion": {},
  "aircraftTypeByRegion": {},
  "applicationByRegion": {},
  "equipmentByRegion": {},
  "processTypeByRegion": {},
  "materialTypeByRegion": {},
  "processTypeByApplication": {}
}
```

Notes:

- The backend must not fabricate missing forecast years or nested breakdowns.
- If the sheet does not provide a structure, the response must keep that field as an empty object rather than inventing values.
- The Google Sheet is authoritative if it differs from the local workbook or current static JSON.

## Backend Design (Yii2)

### Responsibilities

- authenticate to Google Sheets using server-side credentials
- fetch the configured spreadsheet tab
- validate the sheet shape
- transform validated rows into compact dashboard JSON
- persist the last good payload
- persist sync metadata and validation errors
- serve protected dashboard data to authorized users

### Source Configuration Model

Each live dashboard should have backend source config with at minimum:

- `dashboard_slug`
- `source_type` = `google_sheet`
- `spreadsheet_id`
- `worksheet_name`
- `mapping_version`
- `sync_enabled`
- `last_synced_at`
- `last_source_revision`
- `last_sync_status`
- `last_error`

### Sync Job

- schedule every 1 to 5 minutes
- sync only enabled live dashboards
- write last good payload atomically so a failed sync never deletes serving data
- keep validation diagnostics for debugging
- log sheet revision time and payload hash to detect no-op syncs

### Protected API Contract

Public frontend integration point:

- `GET /react/dashboard-data?dashboard_slug=extrusion-market`

Behavior:

- requires authenticated user
- requires entitlement to the requested dashboard
- returns only the compact JSON payload for that dashboard
- must not include spreadsheet source metadata in the response body

Internal operations endpoint or admin view:

- sync status
- last success/failure time
- last validation error
- current mapping version

## Frontend Design

### Pilot Changes

- introduce a dashboard data-source abstraction with two modes:
  - `static`
  - `live`
- move `extrusion-market` to the `live` mode
- keep all other dashboards on static JSON during the pilot

### Frontend Contract

The frontend must treat dashboard data as coming from an abstract source rather than assuming a `public/data/*.json` file.

Example source shapes:

```ts
type DashboardDataSource =
  | { kind: "static"; url: string }
  | { kind: "live"; dashboardSlug: string };
```

### Frontend Behavior

- live sources call the protected Yii2 endpoint
- live sources send the bearer token already stored by the auth flow
- static sources continue using the current `public/data/*.json` path behavior
- chart rendering and compact JSON expansion stay unchanged in phase 1

## Rollout Plan

### Phase 1: Extrusion Pilot

- backend sync and protected data API for `extrusion-market`
- frontend pilot wiring for live source
- compare live payload to the current static JSON output
- verify editorial update flow with the Google Sheet

### Phase 2: Pattern Hardening

- add better sync observability
- add alerting on validation failures
- review whether nested structures need spreadsheet support
- decide whether a manual "sync now" admin action is needed

### Phase 3: Broader Migration

- migrate other functional dashboards one by one
- define per-dashboard row-mapping contracts
- retire static JSON only after each dashboard has a validated live source

## Testing and Acceptance

### Parser and Contract

- local workbook can be parsed into the compact schema
- Google Sheet can be parsed into the same schema
- malformed headers, non-numeric values, duplicate segments, or mismatched year counts fail validation
- unsupported nested structures remain empty objects

### Security

- frontend bundle contains no spreadsheet credentials or Google API code
- unauthorized requests to `dashboard-data` fail
- authorized users receive only the requested compact payload

### Freshness

- sheet edits appear on the site within the 1 to 5 minute window
- sync failures keep serving the last known good data
- backend exposes last successful sync time and last validation error

### Frontend

- `extrusion-market` renders correctly from the live endpoint
- all non-pilot dashboards still render from static JSON
- route guards and dataset navigation behave the same as before

## Implementation Notes For This Repo

This repo contains the frontend pilot only. The Yii2 backend implementation described above lives outside this repository and must be built in the backend codebase.

The frontend pilot in this repo should:

- add the shared data-source contract
- switch the extrusion dashboard to a live source definition
- keep other dashboards unchanged
- avoid any direct spreadsheet access from browser code

## Known Gaps

- The current static JSON for `extrusion-market` contains years and fields not present in the local workbook sample.
- The workbook sample appears to stop earlier than the static JSON forecast range.
- Phase 1 must not invent missing years or nested breakdowns; those need to come from the source sheet or remain empty.
- `INTEGRATION.md` is stale and should not be used as the source of truth for live-data architecture.
