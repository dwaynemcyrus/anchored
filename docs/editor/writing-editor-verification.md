# Anchored Writing Editor — Schema Verification

Run after migration push to confirm Phase 2 schema is live.

## Documents Table
Verify columns exist and types are expected:

```sql
select column_name, data_type
from information_schema.columns
where table_name = 'documents'
order by ordinal_position;
```

Expected (key fields):
- `collection` (text)
- `visibility` (text)
- `canonical` (text)
- `tags` (array)
- `date` (date)
- `published_at` (timestamptz)

## Document Versions Table
Confirm snapshots table exists:

```sql
select column_name, data_type
from information_schema.columns
where table_name = 'document_versions'
order by ordinal_position;
```

Expected (key fields):
- `document_id` (text)
- `snapshot_reason` (text)
- `collection` (text)
- `visibility` (text)
- `tags` (array)
- `date` (date)

## Visibility Check
Confirm visibility values are constrained:

```sql
select conname, pg_get_constraintdef(oid)
from pg_constraint
where conrelid = 'documents'::regclass
  and conname = 'documents_visibility_check';
```

Expected: `public | personal | private`

## Indexes
Confirm collection indexes exist:

```sql
select indexname, indexdef
from pg_indexes
where tablename = 'documents'
  and indexname like 'idx_documents_%';
```

Expected:
- `idx_documents_collection`
- `idx_documents_collection_status_visibility`
- `idx_documents_user_collection`

