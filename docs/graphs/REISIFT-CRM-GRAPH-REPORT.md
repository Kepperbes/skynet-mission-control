# Graph Report — DataSift/REISift Official Documentation Corpus (2026-07-29)

## Corpus Check

- Corpus is ~13,119 words - fits in a single context window. You may not need a graph.

## Summary

- 150 nodes · 256 edges · 17 communities
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 29,210 input · 49,870 output

## Community Hubs (Navigation)

- API Operation Index
- Tasks and SiftLine
- CRM Automation Playbooks
- Property Data Operations
- Owner Communications
- External Integrations
- Activity and Reporting
- SiftMap Property Search
- API Operating Conventions
- Tags Lists and Statuses
- Filters and Exports
- Custom Field System
- Authentication and Permissions
- Quickstart API Calls
- Documentation Deployment
- Product Surface Overview
- Secure Setup Checklist

## God Nodes (most connected - your core abstractions)

1. `DataSift Developer Documentation (Extended)` - 21 edges
2. `Use-Case Playbooks` - 18 edges
3. `Properties` - 13 edges
4. `Owners, Phones, and Communication` - 13 edges
5. `Tasks, Task Presets, and SiftLine` - 13 edges
6. `Endpoint Index - DataSift API Core` - 13 edges
7. `DataSift API Core reference` - 12 edges
8. `Activity, Exports, and Reporting` - 11 edges
9. `Integrations` - 11 edges
10. `Workflow verification step` - 11 edges

## Surprising Connections (you probably didn't know these)

- `DataSift Developer Documentation (Extended)` --references--> `Quickstart` [EXTRACTED]
  README.md → docs/00-quickstart.md
- `DataSift Developer Documentation (Extended)` --references--> `Authentication` [EXTRACTED]
  README.md → docs/01-authentication.md
- `DataSift Developer Documentation (Extended)` --references--> `Conventions - Pagination, Errors, and Operating Rules` [EXTRACTED]
  README.md → docs/02-conventions.md
- `DataSift Developer Documentation (Extended)` --references--> `Properties` [EXTRACTED]
  README.md → docs/03-properties.md
- `DataSift Developer Documentation (Extended)` --references--> `Owners, Phones, and Communication` [EXTRACTED]
  README.md → docs/04-owners-and-phones.md

## Hyperedges (group relationships)

- **Bulk Import: Dedupe, Create, and Verify** — docs_13_use_case_playbooks_bulk_import, docs_03_properties_dedupe_exists_check, docs_03_properties_bulk_create, docs_02_conventions_write_verification [EXTRACTED 1.00]
- **Sequential Marketing Funnel Components** — docs_13_use_case_playbooks_sequential_funnel, docs_05_tags_lists_folders_property_tags, docs_06_filter_presets_filter_preset, docs_06_filter_presets_suppression_preset, docs_06_filter_presets_scheduled_export [EXTRACTED 1.00]
- **SiftMap Auto-Add to Core Funnel** — docs_11_siftmap_api_saved_map_filter, docs_11_siftmap_api_auto_add_snapshot, docs_11_siftmap_api_core_property_record, docs_13_use_case_playbooks_siftmap_standing_feed, docs_13_use_case_playbooks_sequential_funnel [EXTRACTED 1.00]

## Communities (17 total, 0 thin omitted)

### Community 0 - "API Operation Index"

Cohesion: 0.29
Nodes (13): Activity and dashboard operations, DataFlik operations, DataSift API Core reference, Dialer and SMS integration operations, Endpoint Index - DataSift API Core, Email and calendar integration operations, Filter preset operations, Open API v1 operations (+5 more)

### Community 1 - "Tasks and SiftLine"

Cohesion: 0.30
Nodes (12): Calendar integration, Card timeline, Deal, Tasks, Task Presets, and SiftLine, Pipeline QA audit, SiftLine board, SiftLine card, SiftLine column (+4 more)

### Community 2 - "CRM Automation Playbooks"

Cohesion: 0.36
Nodes (12): Bulk import workflow, Daily KPI snapshot, Phone scoring and dial tiering, Use-Case Playbooks, Record dossier workflow, Sequential marketing funnel workflow, SiftLine pipeline QA audit, SiftMap standing feed (+4 more)

### Community 3 - "Property Data Operations"

Cohesion: 0.31
Nodes (11): Marketing attempt counters, Bulk property creation, Per-property custom field values, Property existence check, Properties, Account-wide global statuses, Owner record, Presigned document and image upload flow (+3 more)

### Community 4 - "Owner Communications"

Cohesion: 0.29
Nodes (11): General contact book, Dial-priority tiering, Owners, Phones, and Communication, Internal owner message board, Owner offers, Owner record, Phone and email upserts, Phone tags (+3 more)

### Community 5 - "External Integrations"

Cohesion: 0.29
Nodes (10): User and account identity, Marketing attempt counters, Calendar integration, Call and SMS events, County FIPS identifier, DataFlik data service, Dialer integration namespaces, Integrations (+2 more)

### Community 6 - "Activity and Reporting"

Cohesion: 0.36
Nodes (9): Account activity feed, Activity-feed change stream, Daily KPI snapshot, Dashboard API, Activity, Exports, and Reporting, Per-record change logs, Counting-read metrics, Scheduled export (+1 more)

### Community 7 - "SiftMap Property Search"

Cohesion: 0.39
Nodes (9): Add-properties bridge to DataSift Core, Auto-add snapshot feed, Core API property record, SiftMap API, Nationwide property search, Saved SiftMap filter, SiftMap nationwide property layer, SiftMap Pro capability (+1 more)

### Community 8 - "API Operating Conventions"

Cohesion: 0.32
Nodes (8): ASCII-hyphen naming discipline, Conventions - Pagination, Errors, and Operating Rules, ISO 8601 timestamps, limit/offset pagination, offset/page_size pagination, Property import deduplication, Rate-limit and server-error backoff, Write-then-read verification

### Community 9 - "Tags Lists and Statuses"

Cohesion: 0.43
Nodes (8): Tags, Lists, and Folders, Single current global status, List folders, Label naming discipline, properties-count instrumentation, Property tags, Property source lists, Tag folders

### Community 10 - "Filters and Exports"

Cohesion: 0.46
Nodes (8): Preset compile endpoint, Filter Presets and Scheduled Exports, Filter preset, Filter preset folder, Read-one-then-template pattern, Scheduled export, Sequential marketing funnel, Suppression preset

### Community 11 - "Custom Field System"

Cohesion: 0.46
Nodes (8): Custom field definition, Custom field group, Custom Fields, Field deletion orphaning, Custom-field filter preset, Idempotent definition setup, Per-property custom field value, Select-field option

### Community 12 - "Authentication and Permissions"

Cohesion: 0.48
Nodes (7): Api-Key authorization scheme, DataSift API Core surface, Authentication, Revocation and rotation key lifecycle, Least-privilege key issuance, SiftMap API surface, User permission inheritance

### Community 13 - "Quickstart API Calls"

Cohesion: 0.60
Nodes (6): Quickstart, DATASIFT_API_KEY environment variable, REISift Open API Key, Property list call, SiftMap saved-filter call, Authenticated user profile call

### Community 14 - "Documentation Deployment"

Cohesion: 0.53
Nodes (6): Credential exclusion safety rail, GitHub Deploy - Publishing and Maintaining This Repo, Endpoint index regeneration workflow, Published DataSift reference, Private staging repository, Public release review gate

### Community 15 - "Product Surface Overview"

Cohesion: 0.53
Nodes (6): DataSift API Core, DataSift Developer Documentation (Extended), Official generated API reference, REISift Open API Key, SiftMap API, Verify the data, never the exit code

### Community 16 - "Secure Setup Checklist"

Cohesion: 0.53
Nodes (6): Setup Checklist - DataSift API, Exposed-key rotation, Minimum-permission integration keys, Open API key setup, Property import deduplication, Write verification read

## Knowledge Gaps

- **12 isolated node(s):** `limit/offset pagination`, `ASCII-hyphen naming discipline`, `ISO 8601 timestamps`, `Presigned document and image upload flow`, `General contact book` (+7 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions

_Questions this graph is uniquely positioned to answer:_

- **Why does `DataSift Developer Documentation (Extended)` connect `Product Surface Overview` to `API Operation Index`, `Tasks and SiftLine`, `CRM Automation Playbooks`, `Property Data Operations`, `Owner Communications`, `External Integrations`, `Activity and Reporting`, `SiftMap Property Search`, `API Operating Conventions`, `Tags Lists and Statuses`, `Filters and Exports`, `Custom Field System`, `Authentication and Permissions`, `Quickstart API Calls`, `Documentation Deployment`, `Secure Setup Checklist`?**
  _High betweenness centrality (0.783) - this node is a cross-community bridge._
- **Why does `Use-Case Playbooks` connect `CRM Automation Playbooks` to `Tasks and SiftLine`, `Activity and Reporting`, `SiftMap Property Search`, `Tags Lists and Statuses`, `Filters and Exports`, `Custom Field System`, `Product Surface Overview`?**
  _High betweenness centrality (0.191) - this node is a cross-community bridge._
- **Why does `Endpoint Index - DataSift API Core` connect `API Operation Index` to `Product Surface Overview`?**
  _High betweenness centrality (0.152) - this node is a cross-community bridge._
- **What connects `limit/offset pagination`, `ASCII-hyphen naming discipline`, `ISO 8601 timestamps` to the rest of the system?**
  _12 weakly-connected nodes found - possible documentation gaps or missing edges._
