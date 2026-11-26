#!/usr/bin/env bash
# CI only: the source is the dedicated, synthetic postgres service; restore
# into a second database. Never accept production connection strings.
set -euo pipefail
: "${TEST_0019_DATABASE_URL:?Missing test database URL}"
node -e 'const u=new URL(process.env.TEST_0019_DATABASE_URL);if(!["localhost","127.0.0.1"].includes(u.hostname)||u.pathname!=="/sesto_test_redesign")process.exit(2)'
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
source_url="$TEST_0019_DATABASE_URL"
target_url="${source_url%/*}/sesto_test_restore"
# The GitHub service already contains global roles; the dump preserves
# owners, privileges, policies, triggers, constraints and sequence state.
pg_dump --format=custom --file="$work/db.dump" "$source_url"
createdb --maintenance-db="$source_url" sesto_test_restore
pg_restore --exit-on-error --single-transaction --dbname="$target_url" "$work/db.dump"
audit=docs/redesign/F5_HISTORICAL_AUDIT.sql
psql "$source_url" -X -qAt -v ON_ERROR_STOP=1 -f "$audit" > "$work/source.audit"
psql "$target_url" -X -qAt -v ON_ERROR_STOP=1 -f "$audit" > "$work/restore.audit"
diff -u "$work/source.audit" "$work/restore.audit"
# Compare row counts for every application table and platform metadata,
# and the actual RLS definitions. No records or personal data in logs.
cat > "$work/verify.sql" <<'SQL'
select format('select %L, count(*) from %I.%I;',schemaname||'.'||tablename,schemaname,tablename)
from pg_tables where schemaname in ('public','auth','storage') order by schemaname,tablename
\gexec
select schemaname,tablename,policyname,permissive,roles,cmd,qual,with_check
from pg_policies where schemaname in ('public','auth','storage') order by 1,2,3;
select n.nspname,c.relname,c.relrowsecurity,c.relforcerowsecurity
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname in ('public','auth','storage') and c.relkind in ('r','p') order by 1,2;
SQL
psql "$source_url" -X -qAt -v ON_ERROR_STOP=1 -f "$work/verify.sql" > "$work/source.verify"
psql "$target_url" -X -qAt -v ON_ERROR_STOP=1 -f "$work/verify.sql" > "$work/restore.verify"
diff -u "$work/source.verify" "$work/restore.verify"
echo "OK backup e ripristino PostgreSQL: audit, conteggi, definizioni RLS"
