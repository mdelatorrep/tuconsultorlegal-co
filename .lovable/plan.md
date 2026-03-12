

# Plan: CRM Client Management & Client Portal Activity Visibility

## Problem

1. **Client detail view is too basic** -- clicking a client in CRM only shows contact info. No way to see their cases, documents, or appointments.
2. **Client portal activity is invisible to lawyers** -- when a client uploads a document (`client_shared_documents` table), schedules an appointment (`client_appointments` table), or views a shared document, the lawyer has zero visibility of this in the CRM.
3. **Two separate document systems** -- CRM uses `crm_documents`, portal uses `client_shared_documents`. They never cross-reference.

## Solution

### 1. Enhanced Client Detail Panel
Replace the simple Dialog with a full detail view that includes tabs:
- **Resumen**: contact info + stats (current content, improved)
- **Casos**: list of `crm_cases` for this client, clickable
- **Documentos**: merged view of `crm_documents` + `client_shared_documents` for this client
- **Actividad del Portal**: feed showing client portal actions (docs uploaded, docs viewed, appointments scheduled)

### 2. Client Portal Activity Feed (new component)
A component `ClientPortalActivity` that queries:
- `client_shared_documents` where `is_from_client = true` (client uploads)
- `client_shared_documents` where `viewed_at IS NOT NULL` (client viewed lawyer docs)
- `client_appointments` for this client
- Merges into a chronological feed with icons and timestamps

### 3. Shared Documents visibility in CRM
In the Documents section of client detail, show both:
- Lawyer's `crm_documents` for this client
- Portal `client_shared_documents` (with badge indicating source: "Portal" vs "CRM")
- Allow lawyer to share documents TO the client (insert into `client_shared_documents` with `is_from_client = false`)

## Files to modify/create

| File | Changes |
|---|---|
| `src/components/lawyer-modules/crm/ClientDetailPanel.tsx` | **New** -- full client detail with tabs (Resumen, Casos, Documentos, Actividad Portal) |
| `src/components/lawyer-modules/crm/ClientPortalActivity.tsx` | **New** -- activity feed component querying portal tables |
| `src/components/lawyer-modules/crm/ClientDocumentsTab.tsx` | **New** -- merged document view (CRM + portal docs), share-to-client action |
| `src/components/lawyer-modules/crm/ClientCasesTab.tsx` | **New** -- cases list for a specific client |
| `src/components/lawyer-modules/crm/CRMClientsView.tsx` | Replace simple Dialog detail with `ClientDetailPanel`, pass lawyerId |

## Key details

- No DB changes needed -- all tables (`client_shared_documents`, `client_appointments`, `crm_cases`, `crm_documents`) already exist with `client_id` and `lawyer_id` columns
- The "Share document to client" action inserts into `client_shared_documents` with `is_from_client = false`
- Activity feed sorts all events by date descending, showing upload/view/appointment events with distinct icons
- Client detail opens as a larger Dialog (or replaces current view) to accommodate tabs

