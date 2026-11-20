# EIRVAN Blogs — Story Composer JSON Import Guide & Schema Specification

This document is the complete reference for importing articles into the **EIRVAN Publisher Studio → Story Composer** via **Import JSON** (`src/utils/articleJsonImport.ts`).

Every selector, dropdown, chooser, checkbox, validation rule, auto-derivation fallback, and editorial security rule enforced by Story Composer is documented below.

---

## Table of Contents

1. [How JSON Import Works in Story Composer](#1-how-json-import-works-in-story-composer)
2. [Complete Field-by-Field Reference Table](#2-complete-field-by-field-reference-table)
3. [Strict Selector / Chooser Allowed Options](#3-strict-selector--chooser-allowed-options)
   - [3.1 `status` — Workflow Status Selector](#31-status--workflow-status-selector)
   - [3.2 `category` — Category Hub Selector](#32-category--category-hub-selector)
   - [3.3 `topicCluster` — Topic Cluster Selector (Category-Dependent)](#33-topiccluster--topic-cluster-selector-category-dependent)
   - [3.4 `author` — Author Selector](#34-author--author-selector)
   - [3.5 `articleType` — Schema.org Type Selector](#35-articletype--schemaorg-type-selector)
   - [3.6 `robotsDirective` — Robots Indexation Directive Selector](#36-robotsdirective--robots-indexation-directive-selector)
   - [3.7 `searchIntent` — Search Intent Selector](#37-searchintent--search-intent-selector)
   - [3.8 `aiAssisted`, `isFeatured`, `isTrending` — Boolean Toggles](#38-aiassisted-isfeatured-istrending--boolean-toggles)
   - [3.9 `headings[].level` — Heading Level Chooser](#39-headingslevel--heading-level-chooser)
   - [3.10 `sources[].dateStatus` — Source Date Status Chooser](#310-sourcesdatestatus--source-date-status-chooser)
4. [Every Field Scenario & Auto-Derivation Rules](#4-every-field-scenario--auto-derivation-rules)
5. [Protected & System-Managed Fields (Ignored on Import)](#5-protected--system-managed-fields-ignored-on-import)
6. [Copy-Pasteable JSON Examples (All Real-World Scenarios)](#6-copy-pasteable-json-examples-all-real-world-scenarios)
   - [Scenario A: Minimal Quick-Start Draft](#scenario-a-minimal-quick-start-draft)
   - [Scenario B: Full A+ SEO Research Briefing (`Technology`)](#scenario-b-full-a-seo-research-briefing-technology)
   - [Scenario C: Breaking Dispatch (`News` / `NewsArticle`) with Mixed Sources & Changelog](#scenario-c-breaking-dispatch-news--newsarticle-with-mixed-sources--changelog)
   - [Scenario D: AI-Assisted Methodology Playbook (`Education` / `BlogPosting` / `noindex`)](#scenario-d-ai-assisted-methodology-playbook-education--blogposting--noindex)
   - [Scenario E: Scheduled Future Release with `previousSlugs` Redirects & `editorialNotes`](#scenario-e-scheduled-future-release-with-previousslugs-redirects--editorialnotes)
   - [Scenario F: Updating an Existing Published Article via JSON](#scenario-f-updating-an-existing-published-article-via-json)
7. [Scoring 95–100 (Grade A+) on the Built-In SEO Checklist](#7-scoring-95100-grade-a-on-the-built-in-seo-checklist)
8. [Troubleshooting Validation Errors](#8-troubleshooting-validation-errors)

---

## 1. How JSON Import Works in Story Composer

1. Open `/admin` → **Story Composer** (or click **Edit** on an existing article in **Articles Directory**).
2. Click **Import JSON** in the Story Composer header bar.
3. Either **paste raw JSON** directly into the editor (markdown ````json ... ```` fences and single-item arrays `[{ ... }]` are automatically unwrapped) or click **Upload .json**.
4. Click **Map JSON to Composer**:
   - Every selector/chooser field is strictly validated against the exact options available in Story Composer.
   - `contentHtml` is immediately sanitized with `DOMPurify` (`src/utils/sanitize.ts`).
   - Missing optional metadata (`slug`, `canonicalUrl`, `metaTitle`, `metaDescription`, `readTimeMinutes`, `headings`, `topicCluster`, `author`, `featuredImage`, `imageAlt`) is deterministically derived.
   - Any pasted `approval`, `humanReviewed: true`, `reviewedRevisionHash`, or `views` values are **ignored** for editorial security and data integrity.
   - When updating an existing article (`editingArticle` is open), the existing article's `id` and live visitor `views` counter are automatically preserved.
5. Inspect the mapped fields in Story Composer, click **Approve Current Revision** as an authenticated administrator (required for `approved`, `scheduled`, or `published`), choose your final workflow status, and click **Save Story**.

---

## 2. Complete Field-by-Field Reference Table

> **Substantive Hash Column:** Fields marked **Yes** under *Substantive* are included in the cryptographic SHA-256 revision fingerprint (`computeArticleRevisionHash`). Modifying any substantive field invalidates prior editorial approval until re-signed.

| JSON Key | Type | Required? | Substantive? | Default When Omitted | Notes & Constraints |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `title` | `string` | **Yes** | Yes | — | Article H1 headline. Must be non-empty. |
| `contentHtml` | `string` | **Yes** | Yes | — | Sanitized semantic HTML body. At least 2 `<h2>` headings recommended. |
| `slug` | `string` | No | Yes | Auto-slugified from `title` | Strict lowercase kebab-case: `/^[a-z0-9]+(?:-[a-z0-9]+)*$/`. |
| `canonicalUrl` | `string` | No | Yes (derived) | `https://eirvan.com/articles/${slug}` | Always normalized to match `slug`. |
| `metaTitle` | `string` | No | Yes | Falls back to `title` | Google SERP title (`35–65` chars recommended). Must be unique across catalog. |
| `metaDescription` | `string` | No | Yes | Falls back to `summary` | Google SERP snippet (`115–160` chars recommended). Must be unique across catalog. |
| `summary` | `string` | Recommended | Yes | `""` (triggers warning) | Shown in article deck, cards, RSS, and synopsis box. |
| `category` | `string` (Enum) | No | Yes | `"Technology"` | **Selector:** strictly 1 of 5 Category Hubs. |
| `topicCluster` | `string` (Enum) | No | Yes | First cluster of chosen `category` | **Selector:** strictly 1 of 3 clusters belonging to `category`. |
| `author` | `string` or `object` (Enum) | No | Yes | `"Dr. Evelyn Vance"` | **Selector:** strictly 1 of 6 masthead authors (`name`, `slug`, or `id`). |
| `status` | `string` (Enum) | No | No (workflow) | `"draft"` | **Selector:** strictly 1 of 6 workflow statuses (`approved`/`scheduled`/`published` downgrade to `in_review` on import). |
| `articleType` | `string` (Enum) | No | Yes | `"Article"` | **Selector:** `"Article"`, `"BlogPosting"`, or `"NewsArticle"`. |
| `robotsDirective` | `string` (Enum) | No | Yes | `"index, follow"` | **Selector:** `"index, follow"` or `"noindex, follow"`. |
| `searchIntent` | `string` (Enum) | No | No | `"informational"` | **Selector:** `"informational"`, `"commercial"`, `"navigational"`, or `"transactional"`. |
| `aiAssisted` | `boolean` | No | Yes | `false` | Checkbox: discloses AI outline/drafting assistance. |
| `isFeatured` | `boolean` | No | No | `false` | Marks story eligible for homepage Lead Featured slot. |
| `isTrending` | `boolean` | No | No | `false` | Marks story eligible for Direct Briefings / Trending strip. |
| `featuredImage` | `string` | No | Yes | `"/images/editorial/about-library-1200.webp"` | Must start with `"/images/"` or `"https://"` / `"http://"`. |
| `socialImage` | `string` | No | Yes | `"/images/editorial/about-library-1200.jpg"` (when default hero used) | OG/Twitter share image (prefer `1200x675` `.jpg` or `.webp`). Must start with `"/images/"` or `"http(s)://"`. |
| `imageAlt` | `string` | No | Yes | Falls back to `title` | Descriptive alt text (`>= 15` chars required to pass SEO image check). |
| `headings` | `HeadingItem[]` | No | Yes | Auto-extracted from `<h2>`/`<h3>` in `contentHtml` | Array of `{ id, text, level }` where `level` is strictly `2` or `3`. |
| `sources` | `ArticleSource[]` | Recommended* | Yes | `[]` (triggers warning) | *Required (`>= 1` source) before clicking **Approve Current Revision** or publishing. |
| `faqs` | `FAQItem[]` | No | Yes | `[]` | Array of `{ question, answer }`. Rendered as visible accordion & FAQPage context. |
| `changelog` | `ArticleChangelogEntry[]` | No | No | `[]` | Array of `{ date, note }` (e.g. `"2026-11-20"`). Visible revision log. |
| `tags` | `string[]` | No | Yes | `[category]` | Plain-text topic tags rendered below article & in JSON-LD `keywords`. |
| `targetKeywords` | `string[]` | No | No | `[]` | Editorial SEO keyword targets in Composer. |
| `focusTopic` | `string` | No | No | `targetKeywords[0] \|\| ""` | Primary editorial focus keyword/phrase. |
| `secondaryTopics` | `string[]` | No | No | `[]` | Supporting topic tags. |
| `previousSlugs` | `string[]` | No | Yes | `[]` | Old kebab-case slugs for Apache `.htaccess` single-hop `301` redirects. |
| `relatedArticleIds` | `string[]` | No | No | `[]` | Pinned related article IDs (e.g. `["art-001", "art-002"]`). |
| `publishedAt` | `string` (ISO-8601) | No | Yes | Existing `publishedAt` or current UTC timestamp | Valid ISO-8601 timestamp (e.g. `"2026-11-20T09:00:00Z"`). |
| `scheduledAt` | `string` (ISO-8601) | No | Yes | `undefined` | Embargo release timestamp. Blocks public emission until timestamp passes. |
| `readTimeMinutes` | `number` | No | No | `Math.max(3, Math.ceil(words / 210))` | Positive integer reading duration in minutes. |
| `editorialNotes` | `string` | No | No (isolated) | `""` | Internal newsroom memo; saved **only** to private `/articlePrivate/{id}` (never public). |

---

## 3. Strict Selector / Chooser Allowed Options

Any field tied to a `<select>`, radio/chooser, or enum in Story Composer **rejects invalid values** during JSON import. You **must** supply one of the exact options below.

### 3.1 `status` — Workflow Status Selector

Allowed values (exact lowercase strings):

| Value | Meaning & Release Effect |
| :--- | :--- |
| `"draft"` | **Default.** Working copy. Excluded from public site, `dist/articles/`, sitemap, and RSS. |
| `"in_review"` | Submitted for factual/technical review. Excluded from public site, sitemap, and RSS. |
| `"approved"` | Cryptographically signed off by an authorized reviewer; ready to schedule or publish. Excluded from public site until `"published"`. |
| `"scheduled"` | Approved and staged for upcoming release at `scheduledAt`. Excluded from public site until status moves to `"published"` and `scheduledAt <= now`. |
| `"published"` | Eligible for public display, prerendered HTML, RSS, and sitemap (if `robotsDirective` is `"index, follow"`). |
| `"archived"` | Retained in Admin Directory; excluded from public site, sitemap, and RSS. |

> **Important Security Behavior on Import:**
> If your JSON sets `"status"` to `"approved"`, `"scheduled"`, or `"published"`, Story Composer accepts the option as valid **but automatically stages the imported draft as `"in_review"`** with a warning notice. Because imported JSON cannot carry trusted cryptographic approval, a signed-in Administrator must inspect the content and click **Approve Current Revision** before changing the selector back to `approved`, `scheduled`, or `published`.

---

### 3.2 `category` — Category Hub Selector

Allowed values (strictly the **5 canonical Editorial Desks**; case-insensitive matching on name or slug is accepted, normalized to the canonical Name):

| Canonical `category` Value | Equivalent Slug (accepted) | Desk Scope |
| :--- | :--- | :--- |
| `"Technology"` | `"technology"` | Hardware physics, neuromorphic silicon, photonics, edge inference |
| `"Business"` | `"business"` | Quantitative markets, algorithmic execution, institutional liquidity |
| `"Lifestyle"` | `"lifestyle"` | Longevity science, human clinical trials, preventive medicine |
| `"Education"` | `"education"` | Cognitive ergonomics, deep work systems, ultradian learning |
| `"News"` | `"news"` | Foundry policy, settlement reform, standards & regulatory dispatches |

> Legacy aliases such as `"Technology & AI"` or `"Crypto"` are **rejected** by JSON import so imported articles never misalign with the 5 Story Composer Category Hub options.

---

### 3.3 `topicCluster` — Topic Cluster Selector (Category-Dependent)

Story Composer populates the **Topic Cluster** `<select>` dynamically based on the chosen `category`. Your JSON `topicCluster` **must belong to the selected `category`**, or import fails with a validation error.

| `category` | Allowed `topicCluster` Options (Pick Exactly One) | Default if Omitted |
| :--- | :--- | :--- |
| `"Technology"` | `"Neuromorphic Silicon"`, `"Silicon Photonics"`, `"Edge Inference"` | `"Neuromorphic Silicon"` |
| `"Business"` | `"Algorithmic Execution"`, `"Dark Pool Liquidity"`, `"Sovereign Allocation"` | `"Algorithmic Execution"` |
| `"Lifestyle"` | `"Clinical Trial Syntheses"`, `"Epigenetic Reprogramming"`, `"Vascular Health"` | `"Clinical Trial Syntheses"` |
| `"Education"` | `"Ultradian Cycles"`, `"Attention Residue"`, `"Motivation Calibration"` | `"Ultradian Cycles"` |
| `"News"` | `"Foundry Policy"`, `"Settlement Reform"`, `"Standards Updates"` | `"Foundry Policy"` |

**Cross-category mismatch example (INVALID):**
`"category": "Business"` + `"topicCluster": "Silicon Photonics"` → Rejected because `"Silicon Photonics"` belongs to `"Technology"`, not `"Business"`.

---

### 3.4 `author` — Author Selector

Story Composer's Author `<select>` only permits the **6 verified Masthead Authors** defined in `src/data/authors.ts`. Custom arbitrary author names (e.g., `"John Doe"`) are **rejected**.

You can specify `author` in JSON in **any** of these 3 formats:
- Exact Name string: `"author": "Dr. Evelyn Vance"` *(recommended)*
- Exact Slug string: `"author": "evelyn-vance"`
- Object containing `name`, `slug`, or `id`: `"author": { "name": "Dr. Evelyn Vance" }`

The mapper automatically populates the full author `role`, `avatar`, `slug`, `bio`, and `verified` flag from the Masthead registry.

| Exact `name` | Exact `slug` | Exact `id` | Role & Desk |
| :--- | :--- | :--- | :--- |
| `"Dr. Evelyn Vance"` | `"evelyn-vance"` | `"auth-001"` | Principal Hardware Architect & Research Fellow (Technology Desk) |
| `"Marcus Sterling"` | `"marcus-sterling"` | `"auth-002"` | Senior Markets & Microstructure Analyst (Business & Markets Desk) |
| `"Dr. Clara Thorne"` | `"clara-thorne"` | `"auth-003"` | Cognitive Neuroscientist & Learning Systems Editor (Education Desk) |
| `"Dr. Aris Thorne"` | `"aris-thorne"` | `"auth-004"` | Molecular Biologist & Translational Medicine Editor (Lifestyle & Longevity Desk) |
| `"Elena Rostova"` | `"elena-rostova"` | `"auth-005"` | Senior Systems & Ergonomics Correspondent (Education & News Desk) |
| `"EIRVAN Editorial Desk"` | `"editorial-desk"` | `"auth-006"` | Staff Reporting & Standards Collective (News & Standards Desk) |

*(Default if `author` is omitted: `"Dr. Evelyn Vance"`.)*

---

### 3.5 `articleType` — Schema.org Type Selector

Allowed values (exact case-sensitive strings):

| Value | When to Use |
| :--- | :--- |
| `"Article"` | **Default.** Evergreen investigative analyses, semiconductor/markets/clinical deep dives. |
| `"BlogPosting"` | Methodology playbooks, structured learning guides, practitioner field notes. |
| `"NewsArticle"` | Time-sensitive policy announcements, regulatory rulings, foundry capacity dispatches. |

---

### 3.6 `robotsDirective` — Robots Indexation Directive Selector

Allowed values (exact strings):

| Value | Effect on Public Site, `sitemap.xml`, and `rss.xml` |
| :--- | :--- |
| `"index, follow"` | **Default.** Eligible for search engine indexation, included in `sitemap.xml` and `rss.xml` once approved & published. |
| `"noindex, follow"` | Emits `<meta name="robots" content="noindex, follow">` on the article page and **excludes** the URL from `sitemap.xml` and `rss.xml`. |

---

### 3.7 `searchIntent` — Search Intent Selector

Allowed values (exact lowercase strings):

| Value | Meaning |
| :--- | :--- |
| `"informational"` | **Default.** Explanatory, analytical, or educational research intent. |
| `"commercial"` | Comparative evaluation of architectures, tools, vendors, or protocols. |
| `"navigational"` | Hub, documentation, or entity-specific reference intent. |
| `"transactional"` | Action/implementation-oriented purchase or workflow intent. |

---

### 3.8 `aiAssisted`, `isFeatured`, `isTrending` — Boolean Toggles

Allowed values: **strict JSON booleans `true` or `false` only** (never strings `"true"` or `1`/`0`).

- `aiAssisted` (`false` by default): Checks the *"AI-Assisted Outline / Draft (disclosed)"* box in Composer. When `true`, displays transparent *"Disclosure: AI-assisted draft · Human-verified"* on published pages.
- `isFeatured` (`false` by default): Marks article as candidate for the homepage Hero Lead Story.
- `isTrending` (`false` by default): Marks article for the homepage Direct Briefings / Trending strip.

---

### 3.9 `headings[].level` — Heading Level Chooser

Allowed values inside `headings`: **strict JSON numbers `2` or `3` only** (`<h2>` or `<h3>`).

---

### 3.10 `sources[].dateStatus` — Source Date Status Chooser

Allowed values inside each object of `sources`:

| Value | Meaning & Rendering |
| :--- | :--- |
| `"published"` | Dated source. Pair with `publishedDate` (e.g. `"2026-02-18"`) and/or `year` (e.g. `"2026"`). Renders `(2026-02-18)` or `(2026)`. |
| `"undated-evergreen"` | Living standard, official charter, or reference documentation with no fixed publication date. Pair with `accessedAt` (e.g. `"2026-11-20"`). Renders `(Undated evergreen source) · Accessed 2026-11-20`. |

---

## 4. Every Field Scenario & Auto-Derivation Rules

### `title` & `metaTitle`
- **`title` omitted or empty `""`:** Rejected (`"title" is required`).
- **`metaTitle` omitted:** Automatically defaults to `title`.
- **`metaTitle` < 35 chars or > 65 chars:** Imported with a warning notice; passes once tuned to **35–65 chars**.

### `slug` & `canonicalUrl`
- **`slug` omitted:** Auto-generated from `title` in kebab-case (e.g., `"Wafer Lithography 2026!"` → `"wafer-lithography-2026"`).
- **`slug` with leading/trailing slashes or `/articles/` prefix:** Automatically cleaned (e.g., `"/articles/my-post/"` → `"my-post"`), then validated against `/^[a-z0-9]+(?:-[a-z0-9]+)*$/`.
- **`slug` with spaces, uppercase, underscores, or symbols:** Rejected with exact formatting guidance.
- **`canonicalUrl`:** Always forced to `https://eirvan.com/articles/${slug}`. If JSON supplies a mismatched `canonicalUrl`, it is normalized and flagged in import notices.

### `summary` & `metaDescription`
- **`summary` omitted:** Allowed as draft with a warning; fill in before publishing.
- **`metaDescription` omitted:** Defaults to `summary`.
- **`metaDescription` < 115 or > 160 chars:** Allowed with a warning notice explaining the `115–160` char target.

### `contentHtml` (Sanitization Rules)
- **Allowed HTML tags (`src/utils/sanitize.ts`):**
  - Headings: `h1`, `h2`, `h3`, `h4`, `h5`, `h6` *(keep `<h1>` for page title only; use `<h2>` and `<h3>` in body)*
  - Text & Blocks: `p`, `span`, `div`, `blockquote`, `hr`, `br`, `strong`, `b`, `em`, `i`, `u`, `s`, `sub`, `sup`, `mark`, `small`, `del`, `ins`
  - Lists: `ul`, `ol`, `li`
  - Code: `pre`, `code`, `kbd`, `samp`
  - Links: `a` (`target="_blank"` automatically receives `rel="noopener noreferrer"`)
  - Media: `picture`, `source`, `figure`, `figcaption`, `img`
  - Tables: `table`, `thead`, `tbody`, `tfoot`, `tr`, `th`, `td`, `caption`, `colgroup`, `col`
  - Disclosures: `details`, `summary`
- **Forbidden (automatically stripped):** `<script>`, `<style>`, `<iframe>`, `<object>`, `<embed>`, `<form>`, `<input>`, `<button>`, inline `style="..."`, inline JS handlers (`onclick`, `onload`, `onerror`, etc.), and `javascript:` URLs.
- **Internal links scenario:** Use relative canonical paths such as `<a href="/articles/target-slug">` or `<a href="/editorial-policy">`. Never use legacy `/article/...` singular paths (the SEO Audit flags `/article/` as a broken/legacy link failure).

### `headings`
- **Scenario 1 — `headings` omitted (Recommended):** The importer scans sanitized `contentHtml` for every `<h2>` and `<h3>`, extracts plain text, and reads its `id="..."` attribute. If an `<h2>`/`<h3>` is missing an `id`, the importer automatically generates a unique kebab-case `id` and injects `id="..."` directly into `contentHtml` so Table of Contents jump links work immediately.
- **Scenario 2 — `headings` explicitly provided:** Every item must be `{ id, text, level }` with `level` strictly `2` or `3`.

### `featuredImage`, `socialImage`, and `imageAlt`
- **Accepted URL formats:** Local `/images/...` paths or external `https://...` / `http://...` URLs. Legacy `/src/assets/...` paths are rejected.
- **Bundled local responsive article images (`public/images/articles/`):**
  Each prefix exists in `400`, `800`, `1200` widths across `.avif`, `.webp`, `.jpg` (use the `-1200.webp` path for `featuredImage` and `-1200.jpg` for `socialImage`):
  - `/images/articles/neuromorphic-silicon-1200.webp`
  - `/images/articles/photonic-supercomputing-1200.webp`
  - `/images/articles/algorithmic-arbitrage-1200.webp`
  - `/images/articles/sovereign-wealth-liquidity-1200.webp`
  - `/images/articles/cellular-longevity-nad-1200.webp`
  - `/images/articles/crispr-epigenetics-1200.webp`
  - `/images/articles/cognitive-sprint-1200.webp`
  - `/images/articles/dopamine-baseline-1200.webp`
  - `/images/articles/news-semiconductor-fab-1200.webp`
  - `/images/articles/news-settlement-summit-1200.webp`
- **Bundled editorial fallback:**
  - `featuredImage`: `/images/editorial/about-library-1200.webp` (or `/images/editorial/about-masthead-800.webp`)
  - `socialImage`: `/images/editorial/about-library-1200.jpg`
- **`imageAlt` omitted:** Defaults to `title` (ensure `>= 15` chars for SEO Checklist pass).

### `sources`
- Required (`>= 1` valid source) before editorial approval or publishing.
- Each entry requires `title`, `publisher`, and a valid `http(s)://` `url`.
- Optional per-source fields: `year`, `publishedDate`, `dateStatus` (`"published"` | `"undated-evergreen"`), `accessedAt`.

### `faqs`, `changelog`, `tags`, `targetKeywords`, `focusTopic`, `secondaryTopics`, `previousSlugs`, `relatedArticleIds`
- All array fields validate element types strictly (`string[]` or typed object arrays).
- **`previousSlugs`:** Normalized to bare lowercase slugs (e.g. `"/articles/old-slug/"` → `"old-slug"`). When published, the static build automatically emits Apache `.htaccess` single-hop `301` redirects from `/articles/old-slug` to `/articles/<current-slug>`.
- **`changelog`:** Each entry requires a valid `date` (recommended `YYYY-MM-DD`) and non-empty `note`.
- **`tags` omitted:** Defaults to `[category]`.
- **`focusTopic` omitted:** Defaults to `targetKeywords[0] || ""`.

### `publishedAt`, `scheduledAt`, `readTimeMinutes`
- **`publishedAt`:** Must be a parseable ISO-8601 date string. Defaults to existing article's `publishedAt` (when editing) or current UTC timestamp.
- **`scheduledAt`:** Must be a parseable ISO-8601 date string. When set in the future on an approved article, public static builds exclude the article until `scheduledAt` arrives.
- **`readTimeMinutes`:** Defaults to `Math.max(3, Math.ceil(wordCount / 210))`. If provided, must be a positive number `>= 1`.

### `editorialNotes`
- Internal review/fact-checking notes.
- Stored in Composer and persisted **exclusively** to `/articlePrivate/{articleId}` (admin-only collection) when saving—never written to public `/articles/{articleId}` or public `dist/`.

---

## 5. Protected & System-Managed Fields (Ignored on Import)

For security and data integrity, **the following fields are stripped/ignored if included in pasted JSON**:

- `approval`, `humanReviewed`, `reviewedAt`, `reviewedRevisionHash`, `reviewer` — Editorial sign-off can **only** be created live in Story Composer by an authenticated, email-verified Administrator clicking **Approve Current Revision**.
- `views` — Live visitor counts are preserved (`0` for new articles, or `editingArticle.views` when updating an existing article).
- `reactions`, `isBookmarked` — Browser-local reader engagement state.
- `id` — Preserves `editingArticle.id` when editing an existing story, or uses Composer's generated `art-...` ID for a new draft.

---

## 6. Copy-Pasteable JSON Examples (All Real-World Scenarios)

### Scenario A: Minimal Quick-Start Draft

Demonstrates minimum required fields (`title` + `contentHtml`) with auto-generated `slug`, `canonicalUrl`, `headings`, `readTimeMinutes`, default `Technology` / `Neuromorphic Silicon`, `Dr. Evelyn Vance`, and `status: "draft"`.

```json
{
  "title": "Wafer-Scale Interconnect Scaling Limits Under Sub-2nm Thermal Density",
  "summary": "An engineering overview of power delivery and copper resistance bottlenecks in dense wafer-scale packages.",
  "contentHtml": "<h2>Backside Power Delivery Networks</h2><p>Moving power rails to the wafer backside reduces IR voltage drop across dense logic cells.</p><h2>Thermal Dissipation Ceiling</h2><p>Microfluidic cold plates are increasingly required once package heat flux surpasses 1.5 kilowatts.</p>",
  "sources": [
    {
      "title": "IEEE IEDM Backside Power Routing Proceedings",
      "publisher": "IEEE Electron Devices Society",
      "url": "https://ieeexplore.ieee.org/",
      "year": "2026",
      "dateStatus": "published"
    }
  ]
}
```

---

### Scenario B: Full A+ SEO Research Briefing (`Technology`)

Hits every SEO Checklist criterion (`35–65` char SEO title, `115–160` char meta description, `>= 2` H2s, `>= 450` words, contextual internal links, `>= 15` char image alt text, explicit primary sources, FAQs, and changelog).

```json
{
  "title": "Co-Packaged Silicon Photonics for Sub-Watt Datacenter Interconnects",
  "metaTitle": "Co-Packaged Silicon Photonics for Sub-Watt AI Interconnects",
  "slug": "co-packaged-silicon-photonics-sub-watt-interconnects",
  "category": "Technology",
  "topicCluster": "Silicon Photonics",
  "author": "Dr. Evelyn Vance",
  "status": "draft",
  "articleType": "Article",
  "robotsDirective": "index, follow",
  "searchIntent": "informational",
  "aiAssisted": false,
  "isFeatured": true,
  "isTrending": true,
  "metaDescription": "Technical analysis of co-packaged optical engines reducing datacenter SerDes energy below 2 pJ/bit versus copper retimers across high-radix AI fabrics.",
  "summary": "An architectural evaluation of co-packaged silicon photonics, external continuous-wave laser budgets, and link energy per bit across next-generation AI compute clusters.",
  "featuredImage": "/images/articles/photonic-supercomputing-1200.webp",
  "socialImage": "/images/articles/photonic-supercomputing-1200.jpg",
  "imageAlt": "Co-packaged silicon photonics optical waveguide wafer architecture diagram",
  "tags": ["Silicon Photonics", "Co-Packaged Optics", "Datacenter Interconnects"],
  "targetKeywords": ["co-packaged silicon photonics", "optical interconnects", "sub-watt serdes"],
  "focusTopic": "co-packaged silicon photonics",
  "secondaryTopics": ["Waveguide Thermal Tuning", "224G PAM4"],
  "previousSlugs": [],
  "publishedAt": "2026-11-20T09:00:00Z",
  "contentHtml": "<h2 id=\"copper-attenuation\">Copper Attenuation Limits Past 224G PAM4</h2><p>At 224 Gbps per differential lane, electrical traces inside organic substrates and printed circuit boards encounter steep skin-effect and dielectric insertion losses. System designers frequently compensate with active digital signal processor retimers placed within centimeters of the switch ASIC, consuming substantial rack power before data even leaves the chassis. Readers reviewing how our engineering desk evaluates hardware claims can inspect our <a href=\"/editorial-policy\">primary-source editorial verification standards</a> alongside our <a href=\"/category/technology\">Technology hardware physics hub</a>.</p><h3 id=\"energy-scaling\">Energy-Per-Bit Scaling Thresholds</h3><p>Co-packaged optical engines relocate electrical-to-optical modulation directly onto the shared switch package substrate. By shortening copper reach from tens of centimeters to a few millimeters, switch vendors eliminate intermediate retimer stages and push total interconnect link energy below two picojoules per bit across cluster-scale switch fabrics. Lower SerDes power overhead directly expands thermal headroom available for tensor compute tiles inside liquid-cooled racks.</p><h2 id=\"thermal-constraints\">Laser Coupling &amp; Ring Modulator Thermal Budgets</h2><p>Micro-ring resonators deliver compact footprint density and low drive voltage, yet their resonant wavelengths shift sensitively with local silicon temperature fluctuations. Consequently, production co-packaged platforms increasingly pair on-package modulators with external remote continuous-wave laser modules mounted on accessible front-panel cages. This separation isolates temperature-sensitive III-V laser gain media from hot switch silicon while preserving serviceable optical source replacement during multi-year datacenter lifecycles.</p><h3 id=\"packaging-yield\">Optical Fiber Attach &amp; Known-Good-Die Testing</h3><p>High-volume deployment also hinges on passive V-groove fiber alignment tolerances and wafer-level optical probing before costly multi-chip integration. Foundry test flows now combine automated photonic wafer-scale insertion loss screening with standardized optical coupler pitches so switch manufacturers can qualify known-good optical tiles prior to final substrate assembly and burn-in qualification.</p>",
  "sources": [
    {
      "title": "Co-Packaged Optics Energy Efficiency at 200G/Lane",
      "publisher": "IEEE Solid-State Circuits Society (ISSCC)",
      "url": "https://ieeexplore.ieee.org/",
      "year": "2026",
      "publishedDate": "2026-02-18",
      "dateStatus": "published",
      "accessedAt": "2026-11-20"
    }
  ],
  "faqs": [
    {
      "question": "Why does co-packaged optics save energy over pluggable transceivers?",
      "answer": "Placing the optical engine on the switch package shortens electrical traces to millimeters, removing power-intensive copper DSP retimers."
    },
    {
      "question": "Why are laser sources kept external to the switch package?",
      "answer": "External continuous-wave laser modules avoid high switch-die temperatures that degrade laser reliability and simplify field replacement."
    }
  ],
  "changelog": [
    {
      "date": "2026-11-20",
      "note": "Initial technical manuscript prepared for peer review."
    }
  ],
  "editorialNotes": "Confirm ISSCC Table 4 pJ/bit benchmark citations prior to final approval."
}
```

---

### Scenario C: Breaking Dispatch (`News` / `NewsArticle`) with Mixed Sources & Changelog

Uses `"category": "News"`, `"topicCluster": "Settlement Reform"`, `"author": "EIRVAN Editorial Desk"`, `"articleType": "NewsArticle"`, both `"published"` and `"undated-evergreen"` sources, and multiple correction log entries.

```json
{
  "title": "Global Clearing Houses Harmonize T+1 Cutover Windows Across Cross-Border Repos",
  "metaTitle": "Cross-Border Clearing Houses Harmonize T+1 Repo Settlement",
  "slug": "global-clearing-houses-harmonize-t1-repo-settlement",
  "category": "News",
  "topicCluster": "Settlement Reform",
  "author": "EIRVAN Editorial Desk",
  "status": "in_review",
  "articleType": "NewsArticle",
  "robotsDirective": "index, follow",
  "searchIntent": "navigational",
  "aiAssisted": false,
  "metaDescription": "Central securities depositories publish synchronized T+1 affirmation cutoffs and FX settlement liquidity windows for institutional bond and equity desks.",
  "summary": "Clearing utilities across North America and Europe finalize synchronized affirmation deadlines to compress cross-border T+1 settlement fails.",
  "featuredImage": "/images/articles/news-settlement-summit-1200.webp",
  "socialImage": "/images/articles/news-settlement-summit-1200.jpg",
  "imageAlt": "Central clearing house settlement timing coordination chart for T+1 cycles",
  "tags": ["Settlement Reform", "Clearing Infrastructure", "Regulatory Policy"],
  "targetKeywords": ["T+1 settlement", "clearing house cutover", "repo affirmation"],
  "contentHtml": "<h2 id=\"harmonized-cutoffs\">Synchronized Affirmation Deadlines</h2><p>Major central counterparties issued updated operational timelines aligning institutional trade affirmation windows ahead of sovereign repo cutovers.</p><h2 id=\"fx-liquidity\">Foreign Exchange Funding Windows</h2><p>Custodian banks outlined automated pre-funding rules designed to mitigate late-day currency conversion bottlenecks.</p>",
  "sources": [
    {
      "title": "DTCC T+1 Settlement Implementation Playbook",
      "publisher": "Depository Trust & Clearing Corporation",
      "url": "https://www.dtcc.com/",
      "publishedDate": "2026-10-04",
      "dateStatus": "published",
      "accessedAt": "2026-11-20"
    },
    {
      "title": "IOSCO Principles for Financial Market Infrastructures",
      "publisher": "IOSCO",
      "url": "https://www.iosco.org/",
      "dateStatus": "undated-evergreen",
      "accessedAt": "2026-11-20"
    }
  ],
  "changelog": [
    {
      "date": "2026-11-19",
      "note": "Initial wire dispatch drafted from clearing utility circular."
    },
    {
      "date": "2026-11-20",
      "note": "Added CLS FX cutover window reference."
    }
  ]
}
```

---

### Scenario D: AI-Assisted Methodology Playbook (`Education` / `BlogPosting` / `noindex`)

Demonstrates `"category": "Education"`, `"topicCluster": "Ultradian Cycles"`, `"author": "Dr. Clara Thorne"`, `"articleType": "BlogPosting"`, `"robotsDirective": "noindex, follow"`, `"aiAssisted": true`, and `"searchIntent": "commercial"`.

```json
{
  "title": "Structuring 90-Minute Ultradian Engineering Sprints Without Attention Residue",
  "metaTitle": "90-Minute Ultradian Engineering Sprints & Focus Protocol",
  "category": "Education",
  "topicCluster": "Ultradian Cycles",
  "author": "clara-thorne",
  "status": "draft",
  "articleType": "BlogPosting",
  "robotsDirective": "noindex, follow",
  "searchIntent": "commercial",
  "aiAssisted": true,
  "readTimeMinutes": 7,
  "metaDescription": "Evidence-based protocol for pairing 90-minute deep cognitive blocks with deliberate 20-minute non-screen recovery intervals to minimize context-switching loss.",
  "summary": "A practical engineering workflow aligning deep debugging and architecture work with natural human basic rest-activity cycles.",
  "featuredImage": "/images/articles/cognitive-sprint-1200.webp",
  "imageAlt": "Ultradian 90-minute focus cycle paired with low-stimulation recovery intervals",
  "tags": ["Ultradian Cycles", "Deep Work", "Cognitive Ergonomics"],
  "targetKeywords": ["ultradian engineering sprints", "attention residue protocol"],
  "contentHtml": "<h2>Physiological Basis of 90-Minute Cycles</h2><p>Human cortical arousal oscillates across predictable 85–110 minute ultradian windows followed by 20-minute parasympathetic recovery dips.</p><h3>Recovery Interval Rules</h3><p>Checking asynchronous chat feeds during recovery intervals re-triggers working memory residue and blunts next-cycle recall.</p>",
  "sources": [
    {
      "title": "Attention Residue & Task Switching Cost Studies",
      "publisher": "Organizational Behavior and Human Decision Processes",
      "url": "https://www.sciencedirect.com/",
      "year": "2024",
      "dateStatus": "published"
    }
  ]
}
```

---

### Scenario E: Scheduled Future Release with `previousSlugs` Redirects & `editorialNotes`

Demonstrates scheduling (`scheduledAt`), SEO redirect preservation (`previousSlugs`), related story pinning (`relatedArticleIds`), and private notes (`editorialNotes`). Because `"status": "scheduled"` requires approval first, Story Composer stages it as `"in_review"` so the Editor-in-Chief can click **Approve Current Revision** and then pick `scheduled`.

```json
{
  "title": "Epigenetic Partial Reprogramming Readouts in Phase I Human Safety Trials",
  "metaTitle": "Epigenetic Reprogramming Readouts in Phase I Human Trials",
  "slug": "epigenetic-partial-reprogramming-phase-1-human-trials",
  "previousSlugs": [
    "early-epigenetic-clock-reprogramming-notes",
    "oskm-human-safety-brief"
  ],
  "category": "Lifestyle",
  "topicCluster": "Epigenetic Reprogramming",
  "author": "Dr. Aris Thorne",
  "status": "scheduled",
  "scheduledAt": "2026-12-01T14:00:00Z",
  "articleType": "Article",
  "robotsDirective": "index, follow",
  "searchIntent": "informational",
  "aiAssisted": false,
  "relatedArticleIds": ["art-004", "art-008"],
  "metaDescription": "Clinical evaluation of Phase I safety endpoints, methylation clock variance, and tissue-specificity constraints in transient cellular reprogramming trials.",
  "summary": "What registered Phase I human endpoints actually measure—and where animal longevity models diverge from clinical safety margins.",
  "featuredImage": "/images/articles/crispr-epigenetics-1200.webp",
  "socialImage": "/images/articles/crispr-epigenetics-1200.jpg",
  "imageAlt": "DNA methylation CpG site epigenetic clock assay diagram for Phase I clinical trials",
  "contentHtml": "<h2 id=\"safety-endpoints\">Primary Clinical Safety Endpoints</h2><p>Registered Phase I protocols prioritize ocular and localized tissue delivery to limit systemic teratoma risk.</p><h2 id=\"methylation-variance\">Methylation Clock Measurement Limits</h2><p>Bulk tissue CpG arrays frequently conflate immune cell composition shifts with true cellular age reversal.</p>",
  "sources": [
    {
      "title": "ClinicalTrials.gov Phase I Safety Registry",
      "publisher": "U.S. National Library of Medicine",
      "url": "https://clinicaltrials.gov/",
      "dateStatus": "undated-evergreen",
      "accessedAt": "2026-11-20"
    }
  ],
  "editorialNotes": "Embargoed until Dec 1 14:00 UTC clinical readout conference."
}
```

---

### Scenario F: Updating an Existing Published Article via JSON

1. Open **Articles Directory** → click **Edit** (pencil icon) on the existing article.
2. Click **Import JSON**, paste the updated JSON, and click **Map JSON to Composer**:
   - The existing article's Firestore document `id` and live visitor `views` counter are **automatically preserved**.
   - Previous approval is cleared because substantive content changed.
3. Click **Approve Current Revision**, change **Workflow Status** back to `published`, and click **Save Story**.

---

## 7. Scoring 95–100 (Grade A+) on the Built-In SEO Checklist

Before saving a `published` article, check the right-hand **Editorial & Technical SEO Checklist** in Story Composer (`auditArticleSEO` in `src/utils/seo.ts`):

1. **SEO Title (`metaTitle`):** `35–65` characters and unique across all articles.
2. **Meta Description (`metaDescription`):** `115–160` characters and unique across all articles.
3. **Heading Hierarchy:** At least `2` `<h2>` headings in `contentHtml` (or `headings`).
4. **Featured Image & Alt Text:** Valid `featuredImage` and `imageAlt` at least `15` characters long.
5. **Slug & Canonical:** Lowercase kebab-case `slug` matching `https://eirvan.com/articles/<slug>`.
6. **Contextual Internal Links:** At least `1` `<a href="/articles/<known-slug>">` (or `/category/...`, `/editorial-policy`) inside `contentHtml`, and zero legacy `/article/...` paths.
7. **Depth:** At least `450` words in `contentHtml` body copy.
8. **Authorship, Sources & Human Review:** Valid masthead `author`, at least `1` primary source in `sources`, and live **Approve Current Revision** sign-off.

---

## 8. Troubleshooting Validation Errors

| Validation Error Message | Root Cause & Exact Fix |
| :--- | :--- |
| `JSON parse error: ...` | Trailing commas, unescaped double quotes inside HTML attributes (use `\"` or single quotes `'` inside JSON strings), or single quotes around JSON keys. |
| `Invalid "category": ... Allowed Story Composer options are strictly: Technology, Business, Lifestyle, Education, News.` | Use one of the exact 5 canonical hub names (legacy labels like `"Technology & AI"` are rejected). |
| `Invalid "topicCluster": ... Allowed options for this Category Hub are strictly: ...` | Pick one of the 3 clusters belonging specifically to the chosen `category` (Section 3.3). |
| `Invalid "author". Allowed Story Composer options are strictly the 6 masthead authors...` | Match one of the 6 registered Masthead Authors by `name`, `slug`, or `id` (Section 3.4). |
| `Invalid "status": ... Allowed Story Composer options are strictly: draft, in_review, approved, scheduled, published, archived.` | Use only one of the 6 exact workflow statuses (Section 3.1). |
| `Invalid "articleType": ...` | Use `"Article"`, `"BlogPosting"`, or `"NewsArticle"` (exact casing). |
| `Invalid "robotsDirective": ...` | Use `"index, follow"` or `"noindex, follow"`. |
| `Invalid "searchIntent": ...` | Use `"informational"`, `"commercial"`, `"navigational"`, or `"transactional"`. |
| `"slug" must be lowercase kebab-case...` | Remove spaces, underscores, uppercase letters, or punctuation from `slug` (e.g. `"my-article-2026"`). |
| `"sources[0].url" must be a valid http(s):// URL.` | Provide a full `https://...` primary source URL, `title`, and `publisher`. |
