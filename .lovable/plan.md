## Goal

Stop generating native non-English reports. Instead, generate one canonical English report per day, then translate it to other languages on first view and cache the result. This unlocks more languages than just DE and removes the timeout pressure that has been killing the DE run.

Scope (per your answers):
- Reports only — emails, CMS pages, UI strings unchanged.
- Existing DE schedule keeps running as a fallback until the new pipeline is verified, then we disable it.
- Translation triggered lazily when a user opens a report in a non-EN language.
- Glossary: term map plus a "do-not-translate" list (assumed, since no preference was given — easy to drop one half later).

## What changes

### 1. New table: `report_translations`
Stores one row per (source EN report, target language).
```text
id              uuid pk
report_id       uuid  -- FK to generated_reports.id (the EN source)
language        text  -- 'de', 'fr', ...
title           text
report_data     jsonb -- same shape as generated_reports.report_data
created_at      timestamptz
```
Unique on (report_id, language). Public read, service-role write (same pattern as `generated_reports`).

### 2. New table: `translation_glossary`
Admin-managed.
```text
id              uuid pk
source_term     text  -- EN term as it appears
translations    jsonb -- { "de": "Mondcivitan", "fr": "..." }
do_not_translate boolean default false  -- if true, leave term verbatim in all langs
notes           text
```
Admin RLS, public read.

### 3. New edge function: `translate-report`
Input: `{ reportId, language }`.
- Loads EN report from `generated_reports`.
- Loads glossary, builds a "always translate X as Y / never translate Z" instruction block.
- Calls AI gateway (Gemini Flash, fallback gpt-5-mini) with strict instruction:
  - Translate every user-visible string field in `report_data` (title, intro, theme titles, summaries, ethical perspectives, quotes, source labels, etc.).
  - Preserve JSON shape and all non-text fields (URLs, IDs, image URLs, dates) verbatim.
  - Apply glossary rules.
  - Do not invent or omit content.
- Stores result in `report_translations`. Returns the translated report.
- Idempotent: if a row already exists, returns it without re-calling the model.

### 4. Report page (`src/pages/Report.tsx`)
- Determine target language from current `useLanguage()` value (not from the report's stored language).
- If report's source language matches target → render directly (today's behaviour).
- Else: query `report_translations` for (id, target). If found → render. If not → call `translate-report`, show a "Translating…" state, then render.
- Translations are reused on subsequent visits.

### 5. Home / report list
No data-model change. Lists keep showing native reports as today; users in DE see the EN report titles translated lazily as they're opened. (We can add eager translation later if you want DE titles to appear in the list — out of scope here.)

### 6. Admin: Glossary manager
New tab in `AdminTabs` to CRUD `translation_glossary`. Simple table UI.

### 7. DE schedule
Left running per your answer. Once you confirm translations work for a few reports, we flip `enabled=false` on the DE schedule row (one click in the existing Schedule manager).

## Out of scope (intentionally)
- Translating emails, CMS pages, announcements, UI strings.
- Pre-warming translations at EN-generation time.
- Search across translations (search keeps hitting the EN source).

## Technical notes

- Translation prompt sends the report as JSON and asks for JSON back, with `response_format: json_object` and a schema-like instruction. We split very large reports into per-theme chunks (same 10-at-a-time pattern as generation) to stay under model limits and the 180s edge-function wall clock.
- Glossary block is small (<2KB typical) and prepended to every chunk's system prompt.
- `report_translations.report_data` mirrors the EN `report_data` shape so `DailyNewsReportView` needs no changes.
- New route stays `/report/:id`; the language is implicit from the user's `LanguageContext`. SEO `lang` attribute reflects the rendered language, canonical URL unchanged.
- Memory updates: `mem://features/internationalization` will be revised to describe the on-demand model after rollout.

## Rollout order
1. Migration: `report_translations` + `translation_glossary`.
2. Deploy `translate-report` edge function.
3. Update `Report.tsx` to use it.
4. Add Glossary admin tab.
5. Verify on a fresh EN report in DE; then you disable the DE schedule from the existing UI when ready.
