# Joplin notes and daily TODOs

The Joplin app tile displays either a pinned note or the latest daily TODO. Both the app and the Daily TODO screensaver are read only. Checkboxes reflect Joplin; they cannot be changed on the display.

## Daily convention

- Notebook: **Daily TODO**.
- Title: **Daily TODO — YYYY-MM-DD**.
- Body starts with **Tasks**, an empty checkbox, and **Notes**.
- One generated note per local calendar day.
- The screensaver prefers the newest dated note with content, on or before today. A new blank template does not hide the previous list. If every daily note is blank, the newest template is shown.
- The actual note date stays visible when showing an earlier day. Selection never uses last-edited order.
- Long screensaver notes scroll automatically, pausing at the top and bottom. Tap anywhere to return.

## Connect the display

The integration uses the [Joplin Data API](https://joplinapp.org/help/api/references/rest_api/), served by a running Joplin client. A Joplin Cloud/Server sync URL is not a replacement for the Data API URL. Enable the Web Clipper service in Joplin desktop and obtain its port and token there.

Add these values to the display's private environment file, .env.local:

    JOPLIN_API_URL=http://127.0.0.1:41184
    JOPLIN_API_TOKEN=your_joplin_data_api_token

    # Optional: exact existing notebook ID, useful if names are duplicated.
    JOPLIN_DAILY_NOTEBOOK_ID=

    # Optional: a default pinned note. You can also choose one in the app.
    JOPLIN_PINNED_NOTE_ID=

    # Optional: otherwise the worker uses its host's system timezone.
    # Use the same timezone for the display and the worker.
    JOPLIN_TIME_ZONE=America/Chicago

Restart desk-display after changing environment variables. The token stays on the server and in the maintenance process; it is never saved in dashboard settings or returned to the browser. The browser calls a GET-only display endpoint.

When the display and Joplin run on separate machines, arrange private connectivity to the Joplin Data API or a locally synced Joplin client. Keep the API token private. The sync provider, encryption settings, and which machine stays on determine the best deployment; no live Joplin connection is provisioned by this change.

In the **Joplin** app, use **Choose note** to paste a copied Joplin note link or a note ID. The selection is saved with the other display settings. In **Settings → Screensaver**, select **Daily TODO**.

## Daily creation and cleanup

A separate worker creates notes and moves untouched older templates to Joplin's Trash. It has no web endpoint and does not run merely because someone views a note.

Run from the repository root with Node.js 20.6 or later:

    node --env-file=.env.local scripts/joplin-daily.mjs --dry-run

This reports planned actions without creating, editing or deleting Joplin items. To run once:

    node --env-file=.env.local scripts/joplin-daily.mjs

For continuous daily operation, including catch-up after a restart:

    node --env-file=.env.local scripts/joplin-daily.mjs --watch

With the existing Pi PM2 setup:

    pm2 start scripts/joplin-daily.mjs --name joplin-daily --interpreter node --interpreter-args="--env-file=.env.local" -- --watch
    pm2 save

The worker checks the calendar date every minute and runs once per day, shortly after local midnight. Failed runs retry in watch mode. It creates today's note only, rather than backfilling blank days missed while the host was off. The job creates the notebook if it does not already exist.

Use one worker for this notebook. Deterministic note IDs prevent retry duplicates, including when creation succeeds but its response is lost. If today's generated note was manually trashed, the job does not recreate it.

### Retention rules

The private worker ledger under .data/joplin-daily records the exact creation snapshot of each generated template. It only contains original template content, not subsequent personal note content.

Cleanup requires all of the following:

1. The worker itself created and recorded the note.
2. Its date is earlier than today and it remains in the same notebook.
3. Its title, body, source marker, timestamps and tracked note properties still exactly match the creation snapshot.
4. It has no tags or attached resources.
5. A fresh read immediately before moving it to Trash still matches.

Any changed note leaves the cleanup ledger permanently. Checking a task, renaming, moving, adding notes or an attachment, or editing and later clearing the body preserves it. Untracked matching notes are never adopted for deletion. Losing the ledger preserves existing notes; it cannot cause a blanket cleanup.

The worker never requests permanent deletion and never automatically rolls unfinished tasks into the next day. Previously edited lists stay available in Joplin.

Joplin's API does not provide an atomic compare-and-delete operation. The final reread limits concurrent-edit races, and using Trash makes recovery possible. An edit on another device that has not synced is not visible to this process. Run maintenance against the editing client itself, or ensure a mirrored client has successfully synced before a one-shot run. The watch worker does not initiate or verify Joplin synchronization; choose the deployment before enabling it against a mirror.

The ledger is written atomically with private file permissions. Do not run workers on multiple hosts against the same notebook. A local process lock prevents overlapping runs on one host and recognizes a lock left by an exited process. If a lock or ledger is damaged, the worker stops rather than resetting cleanup history.

## Display behaviour and limits

The first viewer renders headings, lists, disabled task checkboxes, bold text, inline code and fenced code blocks. Other Markdown and embedded HTML remain visible as text; attachment previews and full Joplin-specific Markdown extensions are not implemented.

Notes refresh every minute. If Joplin becomes unavailable while a note is displayed, the current in-memory version remains visible with a stale notice and the display retries. Missing or deleted pinned notes clear the view. This is not a persistent offline note cache.

## Verification

Run:

    pnpm test:joplin
    pnpm build

Tests cover local-midnight and DST boundaries, invalid dates, content-first selection, duplicate prevention, lost creation responses, edited/renamed/moved/attached notes, changes during cleanup, unavailable Joplin, skipped days, dry runs, pagination and credential redaction.

No live notes are modified by the test suite. Live connection, synchronization, and scheduling still need to be verified on the chosen Joplin host before enabling the worker.
