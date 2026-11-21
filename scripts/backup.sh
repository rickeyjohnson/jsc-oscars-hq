#!/usr/bin/env bash
# Personal backup of the JSC Oscars Supabase database (free tier has no dashboard backups).
# Usage:   export SUPABASE_DB_URL='postgresql://postgres.<ref>:<DB_PASSWORD>@<pooler-host>:5432/postgres'
#          scripts/backup.sh
# Get the URL in the Supabase dashboard: Connect -> Session pooler -> URI (replace [YOUR-PASSWORD]).
# Never commit the URL or the backups (backups/ is gitignored: they contain votes and emails).
set -euo pipefail

if [ -z "${SUPABASE_DB_URL:-}" ]; then
  echo "Set SUPABASE_DB_URL first (see the header of this script)." >&2
  exit 1
fi
command -v pg_dump >/dev/null || { echo "pg_dump not found (brew install libpq)." >&2; exit 1; }

stamp="$(date +%Y%m%d-%H%M%S)"
dir="backups/${stamp}"
mkdir -p "$dir"

# 1. Everything in the app's schema: structure + data, restorable with pg_restore.
pg_dump "$SUPABASE_DB_URL" --schema=public --no-owner --no-privileges -Fc -f "$dir/public.dump"

# 2. Readable, re-runnable data-only copy of the tables that matter (open it in any editor).
pg_dump "$SUPABASE_DB_URL" --data-only --inserts --column-inserts --no-owner --no-privileges \
  --table=public.members --table=public.profiles --table=public.seasons --table=public.ballots \
  --table=public.categories --table=public.nominees --table=public.round_nominees \
  --table=public.votes --table=public.results --table=public.past_stats \
  --table=public.myoc_windows --table=public.myoc_ideas \
  -f "$dir/public-data.sql"

# 3. Accounts (emails + identities), data only. Needed only to rebuild logins; keep it private.
pg_dump "$SUPABASE_DB_URL" --data-only --no-owner --no-privileges \
  --table=auth.users --table=auth.identities -f "$dir/auth-accounts.sql"

echo "Backup written to $dir"
ls -lh "$dir"
echo "Tip: copy the folder somewhere off this laptop (iCloud/Drive) after every phase."
