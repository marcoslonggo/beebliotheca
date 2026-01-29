# Architecture Review - Multi-User Library Plan

## Context
- Review scope: assess docs/multi-user-architecture-plan.md against existing FastAPI backend.
- Assumption confirmed with stakeholders: no legacy prod data to migrate, but current code and sample SQLite data (ackend/data/books.db) reflect a single-user schema that new work must respect or replace.

## Strengths
- Clear conceptual separation between intrinsic book metadata, shared library ownership, and per-user reading signals.
- Thoughtful treatment of privacy defaults and tenant membership patterns aligned with multi-tenant best practices.

## Key Gaps
- **Schema Disconnect**: Existing code paths (for example ackend/app/models/book.py:1, ackend/app/api/endpoints/books.py:37) mix intrinsic and library-specific attributes. Moving to Book/LibraryBook/UserBookData requires touching nearly every query, dependency, and Pydantic model today. The plan frames the effort as a greenfield build with “no legacy data,” overlooking the scope of code migration even if the database is empty.
- **Feature Mapping**: Series linkage (ackend/app/models/series.py:12), enrichment jobs (ackend/app/models/enrichment.py:20), cover storage, and loan logic all point straight at the monolithic Book table. The proposal does not spell out how these features map to the new entities or what API changes the frontend will need.
- **Delivery Strategy**: The six-phase timeline lists features but lacks an incremental transition strategy (coexistence of old/new tables, toggle plan, temporary adapters). Without that, the risk of long-lived branches or broken endpoints during implementation is high.

## Recommendations
- Document a stepwise schema transition even in a clean DB: create new tables alongside ooks, add ORM models, adapt endpoints behind feature flags, then remove the legacy table once parity exists.
- Produce a feature mapping matrix that traces every current endpoint/service (books CRUD, enrichment, covers, series) to the proposed multi-entity design, highlighting required DTO/API changes.
- Refine the implementation roadmap to include integration checkpoints (e.g., Phase 1 delivers auth plus read-only tenant scoping on existing endpoints; Phase 2 introduces LibraryBook with compatibility adapters, etc.).
- Update the architecture doc to acknowledge existing code constraints explicitly so future contributors understand the migration effort and avoid assuming a from-scratch backend.

## Open Questions
- Can we introduce the new auth and tenant context ahead of the schema split to reduce concurrency risk?
- What validation or testing strategy will ensure enrichment and cover upload workflows continue to function while models shift?
- How will frontend clients consume the updated responses (e.g., will they need both shared and personal data in one payload)?

