# n8n-nodes-projectflow

This is an n8n community node package for **ProjectFlow**, a lean Kanban-based project management tool. It lets you manage items, comments and attachments, and react to item events from your n8n workflows.

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
- **Create** — pick a project, set title and optional fields (type, status, priority, value/effort, labels, areas, assignee, due date, draft)
- **Get** — fetch a single item by ID
- **Get Many** — list items of a project
- **Update** — patch any item field
- **Move** — change status and/or order (Kanban column)
- **Delete (Archive)** — soft-delete an item
- **Search** — full-text search within a project

### Comment
- **Get Many** — list comments of an item
- **Create** — add a comment / question / answer
- **Update** — edit a comment
- **Delete** — remove a comment

### Attachment
- **Upload** — attach a binary file to an item
- **Download** — download an attachment into a binary field
- **Delete** — remove an attachment

## Trigger

The **ProjectFlow Trigger** node registers a webhook on the selected project when the workflow is activated and removes it on deactivation. Supported events:

- `item.created`
- `item.updated`
- `item.moved`
- `item.deleted`

Incoming deliveries are verified via the `X-Webhook-Signature` header (HMAC-SHA256 of the body using the per-webhook secret).

## Caveats

- **Owner-only webhooks:** the trigger registers webhooks via `POST /api/v1/projects/:id/webhooks`, which ProjectFlow restricts to the **project owner**. The credential's token must belong to the owner, otherwise activation fails with 403.
- **Private IP protection:** ProjectFlow refuses to deliver webhooks to private/internal IPs (DNS-rebinding protection). A self-hosted n8n must be reachable on a public URL (e.g. via the n8n tunnel or a reverse proxy) to receive trigger events.

## Resources

- [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)

## License

[MIT](LICENSE)
