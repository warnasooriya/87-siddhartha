# Debug Session: supabase-sync-bug
- **Status**: [OPEN]
- **Issue**: Application updates are not reflecting in Supabase database tables.
- **Debug Server**: Pending
- **Log File**: .dbg/trae-debug-log-supabase-sync-bug.ndjson

## Reproduction Steps
1. Start the app with Supabase environment values configured.
2. Open the app and perform an insertion or update from the UI.
3. Check whether the new record appears in Supabase tables.
4. Compare UI state vs Supabase persisted state.

## Hypotheses & Verification
| ID | Hypothesis | Likelihood | Effort | Evidence |
|----|------------|------------|--------|----------|
| A | The sync hook never triggers after Redux state changes. | High | Low | Pending |
| B | Supabase write requests are sent but fail on one or more tables. | High | Medium | Pending |
| C | Snapshot/hydration guards prevent sync from running after local updates. | Medium | Medium | Pending |
| D | ID/relationship normalization breaks one of the upsert batches. | Medium | Medium | Pending |
| E | Browser-side runtime/network errors occur but are not surfaced in the UI. | Medium | Low | Pending |

## Log Evidence
- Pending instrumentation.

## Verification Conclusion
- Pending pre-fix evidence.
