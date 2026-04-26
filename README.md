# Duply — for Pipedrive

Clone Pipedrive CRM setups (pipelines, custom fields, activity types) in seconds.

Built for agencies and consultants who sell pre-configured Pipedrive workspaces and need to replicate the same structure across multiple client accounts.

![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square)
![Tailwind](https://img.shields.io/badge/Tailwind-3-06B6D4?style=flat-square)

---

## How it works

1. **Export** — connect your template Pipedrive account and save its structure as a JSON template
2. **Edit** — rename, add or remove pipelines, stages, custom fields and activity types
3. **Clone** — connect a client account and replicate the full structure in one click, with a live log

The cloner maps IDs correctly between accounts (pipelines → stages → custom fields → enum options → activity types), so nothing breaks.

---

## Getting started

**Requirements:** Node.js 18+

```bash
git clone https://github.com/kiraiSky/duply.git
cd duply
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Export a template

```bash
# CLI (optional)
PIPEDRIVE_TOKEN=your_token PIPEDRIVE_DOMAIN=yourcompany npm run export-tpl templates/my-crm.json
```

Or use the web UI at `/export`.

### Clone to a client

```bash
PIPEDRIVE_TOKEN=client_token PIPEDRIVE_DOMAIN=clientdomain npm run clone-tpl templates/my-crm.json
```

Or use the web UI at `/clone`.

---

## Project structure

```
├── app/
│   ├── components/         # Sidebar, TopBar, Button, Badge, Logo
│   ├── api/
│   │   ├── export/         # POST — exports Pipedrive account → JSON template
│   │   ├── clone/          # POST — clones template → client account (SSE stream)
│   │   └── templates/      # GET list, GET/PUT/DELETE by name
│   ├── export/             # Export page
│   ├── templates/          # Template list + preview + edit
│   └── clone/              # Clone page with live log
├── src/
│   ├── pipedrive/client.ts # HTTP client with rate-limit retry and pagination
│   ├── exporter.ts         # Account → template JSON
│   ├── cloner.ts           # Template JSON → new account (with ID remapping)
│   ├── template/schema.ts  # Zod schema
│   └── cli/                # export.ts / clone.ts CLI entry points
└── templates/              # Saved template files (gitignored)
```

---

## Design system

- **Font:** Plus Jakarta Sans (substitute for Pipedrive's Aktiv Grotesk)
- **Primary:** `#25c466` (Pipedrive green)
- **Sidebar:** `#1d2b3a` (navy)
- **Icons:** Lucide (inline SVG)
- **Components:** `pm-card`, `pm-input`, `Button`, `Badge` — all driven by CSS custom properties in `globals.css`

---

## Roadmap

### v0.2 — SaaS Foundation
- [ ] Authentication (NextAuth or Clerk) with email/password
- [ ] Multi-tenant workspaces — each user sees only their own templates
- [ ] Plans: Free (3 templates) / Pro (unlimited)
- [ ] Pipedrive OAuth — clients authorize without pasting API tokens

### v0.3 — Reliability
- [ ] Async job queue (BullMQ + Redis) — cloning runs in background
- [ ] Per-step retry — failed jobs resume from the failed step, not from scratch
- [ ] Persistent clone history with logs per template
- [ ] Idempotency — detect existing pipelines/fields before recreating (prevent duplicates)

### v0.4 — Product
- [ ] Template marketplace — public shareable templates with a slug (`duply.app/t/crm-imobiliario`)
- [ ] Categories: Sales, Real Estate, Agencies, SaaS, etc.
- [ ] Partial cloning — choose which pipelines/fields to clone via checkboxes
- [ ] Template versioning — history of changes with rollback

### v0.5 — Scale
- [ ] Public API — `POST /api/v1/clone` for integrators and resellers
- [ ] API keys per workspace + webhooks on clone completion
- [ ] White-label — resell the tool with a custom logo and domain
- [ ] Admin panel to manage client accounts

### Backlog
- [ ] Improve custom field group export fidelity — resolve `field_group_id` to real group name in all accounts (avoid fallback labels like `Grupo 4`)
- [ ] HubSpot and Salesforce support
- [ ] Scheduled re-sync — keep client accounts in sync with the template on a schedule
- [ ] Diff view — show what changed between template and client account before applying

---

## Notes

- `templates/` is gitignored — it may contain client data and API tokens in file names
- The Pipedrive API has a rate limit (~100 req/10s on standard plans); the client handles `429` with exponential backoff automatically
- Custom field `key` values (Pipedrive's internal hash) cannot be forced — the cloner saves a `ref → {id, key}` mapping per cloning job

---

## License

MIT
