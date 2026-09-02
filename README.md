# n8n-nodes-projectflow

This is an n8n community node package for **ProjectFlow**, a lean Kanban-based project management tool. It lets you manage items, comments, attachments, discussion channels, wiki pages, time entries and initiatives, and react to item events from your n8n workflows.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

[Installation](#installation) · [Credentials](#credentials) · [Operations](#operations) · [Trigger](#trigger) · [Caveats](#caveats)

## Installation

Follow the [community nodes installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) and install `n8n-nodes-projectflow`.

For local development:

```bash
npm install
npm run build
# then link into your n8n custom folder, e.g.
npm link
cd ~/.n8n/custom && npm link n8n-nodes-projectflow
```

## Credentials

Two credential types are provided — pick whichever fits your setup. Both are **user-scoped**, so a single credential can access all of your projects and the node lets you pick the project per operation.

### ProjectFlow Personal Token API
- **Base URL** — e.g. `https://kanban.example.com`
- **Personal Access Token** — create one in ProjectFlow under *Account → Tokens* (starts with `pt_`)

### ProjectFlow OAuth2 API
- **Base URL** — e.g. `https://kanban.example.com`
- Standard OAuth2 *authorization code* flow against `/api/oauth/authorize` and `/api/oauth/token`.
- Register the n8n redirect URL (shown in the credential dialog) as a redirect URI for your OAuth client.

> A **project API key** (`pk_…`) is intentionally **not** supported, because it is scoped to a single project and would prevent the in-node project picker.

## Operations

### Item
- **Create** — pick a project, set title and optional fields (type, status, priority, value/effort, story points, labels, areas, assignee, due date, parent, dependencies, custom fields)
- **Get** / **Get Many** — one item, or a project's items
- **Update** — patch any item field, including the definition-of-done checklist and watchers
- **Move** — change status and/or position in the Kanban column
- **Archive** / **Restore** — take an item off the board, or put it back
- **Delete** — permanently delete an item (see the caveat below)
- **Search** — full-text search within a project

### Comment
- **Get Many** — list comments of an item
- **Create** — add a comment / question / answer
- **Update** / **Delete**

### Attachment
- **Upload** — attach a binary file to an item
- **Download** — download an attachment into a binary field
- **Delete** — remove an attachment

### Channel
- **Get Many** — a project's discussion channels with your unread and mention counts
- **Get Overview** — message and thread counts plus the channel's files
- **Create** / **Update** / **Delete** — project owner only
- **Mark Read** — set your own read marker; nobody else is told

### Discussion Message
- **Get Many** — a project's messages, pinned first
- **Get** — one message with the newest 50 replies in its thread
- **Create** — post to a channel. A title is optional and usually left out.
- **Update** — edit the text, pin it, or change its status
- **Convert to Item** — turn a message into a work item, once
- **Delete** — removes the message, its thread and its attachments

### Thread Reply
- **Get Many** / **Create** / **Update** / **Delete**
- A reply can answer another reply (*Parent Reply ID*), and *Also in Channel* surfaces it in the channel for people who never opened the thread.

### Wiki Page
- **Get Many** / **Get** / **Search** — pages or decision records
- **Create** — optionally from one of the project's templates
- **Update** — content, tags, owner, review date, lock and visibility
- **Publish** — record a numbered snapshot, optionally scheduling the next review
- **Get Versions** — the snapshot history
- **Delete** — the page and its history; child pages move up a level

### Work Log
- **Get Many** — an item's time entries with their total
- **Create** — log time. Durations accept `90`, `90m`, `1h30` or `1,5h`.
- **Update** / **Delete**
- **Get Report** — a project's recorded time over a window, grouped, with an optional second grouping level

### Initiative
- **Get Many** / **Get** — initiatives you can reach, with a rollup per initiative
- **Create** / **Update** / **Delete**
- **Add Projects** / **Remove Projects** — change the membership without replacing it

> An initiative brackets **projects**, not items. To file an item under something larger, give it a parent epic with the item's *Parent Item ID*.

## Trigger

The **ProjectFlow Trigger** node registers a webhook on the selected project when the workflow is activated and removes it on deactivation. Supported events:

- `item.created`
- `item.updated`
- `item.moved`
- `item.deleted`
- `item.resolved`
- `item.reopened`

Incoming deliveries are verified via the `X-Webhook-Signature` header (HMAC-SHA256 of the body using the per-webhook secret).

## Caveats

- **Delete really deletes.** *Item → Delete* calls `DELETE /api/v1/items/:id`, which removes the item for good and strips it from other items' dependency lists. Up to 0.1.1 this operation was labelled "Delete (Archive)" and described as a soft delete, which it never was. Use *Archive* for the soft version.
- **Time tracking is off by default.** A project has to switch it on before any Work Log operation succeeds; otherwise the API answers *Time tracking is disabled for this project*. The report additionally needs the project's time report left enabled.
- **Search results are capped by the server** at 20 by default and 100 at most. *Return All* on *Item → Search* therefore means "up to 100", not "everything".
- **Areas on Item → Update are typed, not picked.** Update takes only an item ID, so there is no project in scope for the node to load the area list from. Paste the area IDs (project-defined UUIDs) instead.
- **Owner-only webhooks:** the trigger registers webhooks via `POST /api/v1/projects/:id/webhooks`, which ProjectFlow restricts to the **project owner**. The credential's token must belong to the owner, otherwise activation fails with 403.
- **Private IP protection:** ProjectFlow refuses to deliver webhooks to private/internal IPs (DNS-rebinding protection). A self-hosted n8n must be reachable on a public URL (e.g. via the n8n tunnel or a reverse proxy) to receive trigger events.

## Resources

- [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)

## License

[MIT](LICENSE)
