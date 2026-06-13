# Sales Support Tool - Quick Reference Guide

## What is this project?

**Sales Intelligence Platform** — An AI-powered B2B sales tool that:
1. **Discovers** companies matching search criteria
2. **Crawls** their websites and extracts structured data
3. **Enriches** with decision-maker contacts and signals
4. **Scores** by buying intent
5. **Enables outreach** via AI-generated campaigns

---

## Project Structure at a Glance

```
sales-support-tool/
├── agents/                          # AI agents (discovery, extraction, intent detection)
│   ├── base/agent.interface.ts     # Core Agent<T,U,E> interface
│   ├── discovery/                   # Find companies
│   ├── extraction/                  # Parse company data from HTML
│   ├── enrichment/                  # Extract contacts & enhance profiles
│   ├── intent/                      # Detect buying signals
│   ├── outreach/                    # Generate personalized messages
│   └── scoring/                     # Score leads
│
├── app/                             # Next.js App Router
│   ├── (auth)/                      # Login pages
│   ├── (dashboard)/                 # Protected app pages
│   ├── search/                      # Search creation + results
│   ├── companies/                   # Company explorer
│   ├── campaigns/                   # Campaign builder
│   ├── analytics/                   # Analytics dashboard
│   ├── admin/                       # Admin panel
│   └── api/v1/                      # REST API endpoints
│
├── components/                      # React components (UI)
│   ├── search/                      # Search UI
│   ├── companies/                   # Company list/detail
│   ├── results/                     # Result cards
│   ├── campaigns/                   # Campaign UI
│   ├── analytics/                   # Dashboard charts
│   ├── layout/                      # Navigation, headers
│   ├── shared/                      # Reusable components
│   └── ui/                          # UI primitives
│
├── services/                        # Business logic layers
│   ├── application/                 # High-level APIs (SearchApiService, etc.)
│   ├── domain/                      # Pure business logic
│   └── infrastructure/              # External integrations (OpenAI, Playwright, etc.)
│
├── repositories/                    # Data access layer
│   ├── interfaces/                  # Repository contracts
│   └── prisma/                      # Prisma implementations
│
├── lib/                             # Utilities & configuration
│   ├── api/                         # API helpers (handlers, responses, auth)
│   ├── auth/                        # NextAuth.js setup
│   ├── config/                      # Environment config
│   ├── db/                          # Database utilities
│   ├── logging/                     # Pino logger
│   ├── search/                      # Search utilities
│   ├── utils/                       # General utils (Result type, etc.)
│   └── validations/                 # Zod schemas
│
├── types/                           # TypeScript type definitions
│   ├── agents/                      # Agent input/output types
│   ├── api/                         # API types
│   ├── orchestration/               # Orchestrator types
│   └── ...
│
├── prompts/                         # LLM prompt templates
│   ├── discovery/
│   ├── extraction/
│   ├── enrichment/
│   ├── intent/
│   ├── outreach/
│   └── scoring/
│
├── prisma/
│   ├── schema.prisma                # Database schema
│   ├── migrations/                  # DB migration history
│   └── seed.ts                      # Seed data
│
├── tests/                           # Test files (Vitest)
│   ├── agents/
│   ├── services/
│   ├── repositories/
│   └── ...
│
└── docker-compose.yml               # PostgreSQL setup
```

---

## Core Database Models

### **Company** (Global Deduplication)
```
ID: UUID
Domain: String (normalized, unique key)
Name: String
WebsiteUrl: String
IntentScore: Decimal (0-1, higher = more intent)
LastCrawledAt: DateTime
FirstSeenAt: DateTime
```
→ Relationships: profiles, searchResults, intentSignals, campaignRecipients

### **CompanyProfile** (Versioned AI-Extracted Data)
```
ID: UUID
CompanyId: UUID (FK)
Version: Int (1, 2, 3, ...)
StructuredData: JSON
{
  name: String
  description: String
  industry: String
  products: [String]
  services: [String]
  targetCustomers: [String]
  estimatedCompanySize: String
  city: String
  country: String
  executives: [{name, title, email?}]
  decisionMaker: String
  decisionMakerEmail: String | null
  ...
}
```

### **SearchJob** (Lifecycle Tracking)
```
ID: UUID
UserId: UUID (FK)
Query: String ("B2B SaaS companies in Europe hiring")
Criteria: JSON
Status: PENDING → DISCOVERING → CRAWLING → EXTRACTING → ENRICHING → COMPLETED/FAILED
CompanyLimit: Int | null (null = unlimited)
StartedAt, CompletedAt: DateTime
ErrorMessage: String | null
```

### **SearchResult** (Per-Lead Pipeline)
```
ID: UUID
SearchJobId: UUID (FK)
CompanyId: UUID (FK)
Stage: DISCOVERED → CRAWLING → CRAWLED → EXTRACTING → EXTRACTED → ENRICHING → ENRICHED
Rank: Int (rank within results)
DiscoverySource: String ("google", "linkedin", ...)
DiscoveryUrl: String
StageError: String | null
DiscoveredAt, CompletedAt: DateTime
```

### **Campaign** (Email Campaign)
```
ID: UUID
UserId: UUID (FK)
OrganizationId: UUID (FK)
Name: String
Status: DRAFT → SCHEDULED → RUNNING → PAUSED/COMPLETED/FAILED
Subject: String
BodyHtml, BodyText: String
ScheduledAt, StartedAt, CompletedAt: DateTime
```

### **CampaignRecipient** (Per-Email Tracking)
```
ID: UUID
CampaignId: UUID (FK)
CompanyId: UUID (FK)
ToEmail: String
ToName: String | null
Status: PENDING → SENT → DELIVERED → OPENED → CLICKED → REPLIED / BOUNCED
SentAt, DeliveredAt, OpenedAt, ClickedAt, RepliedAt, BouncedAt: DateTime
```

### **IntentSignal** (Buying Intent Detection)
```
ID: UUID
CompanyId: UUID (FK)
Type: HIRING | FUNDING | EXPANSION | PRODUCT_LAUNCH | OTHER
Title: String ("Expanding to APAC", "Series B Announced", ...)
Summary: String
SourceUrl: String | null
Confidence: Decimal (0.0 - 1.0)
DetectedAt: DateTime
ExpiresAt: DateTime | null
```

---

## Key API Endpoints

### Search
```
POST   /api/v1/search
       Create search, returns SearchJob (202 Accepted)
       Body: { query: "B2B SaaS", criteria?: {...}, companyLimit?: 100 }
       
GET    /api/v1/search/[id]
       Get search status + results
       Returns: { job: SearchJob, results: SearchResult[] }
```

### Companies
```
GET    /api/v1/companies
       List all companies (paginated)
       
GET    /api/v1/companies/[id]
       Get company details with latest profile
       Returns: { company: Company, profile: CompanyProfile, signals: IntentSignal[] }
       
POST   /api/v1/companies/[id]/refresh-schedule
       Schedule periodic re-enrichment
       Body: { intervalDays: 30 }
```

### Campaigns
```
POST   /api/v1/campaigns
       Create campaign
       Body: { name: String, subject: String, bodyText: String, bodyHtml?: String }
       
GET    /api/v1/campaigns/[id]
       Get campaign details
       
PUT    /api/v1/campaigns/[id]
       Update campaign
       
POST   /api/v1/campaigns/[id]/schedule
       Schedule campaign to run later
       Body: { scheduledAt: DateTime }
       
POST   /api/v1/campaigns/[id]/send
       Send campaign immediately
       
POST   /api/v1/campaigns/[id]/pause
       Pause running campaign
```

### Outreach Messages
```
POST   /api/v1/outreach/messages
       Generate personalized outreach message using AI
       Body: { companyId: UUID, tone?: "formal" | "casual", channel?: "EMAIL" | "WHATSAPP" }
       Returns: { subject: String, bodyText: String, bodyHtml?: String }
```

### Analytics
```
GET    /api/v1/analytics/campaigns
       Get campaign metrics (open rate, click rate, reply rate, etc.)
       Returns: { metrics: {...}, byStatus: {...} }
```

### Admin
```
GET    /api/v1/admin/users
       List users (admin only)
       
POST   /api/v1/admin/users
       Create user (admin only)
       
GET    /api/v1/admin/users/[id]
       Get user details (admin only)
       
PUT    /api/v1/admin/users/[id]
       Update user (admin only)
       
GET    /api/v1/admin/services
       Get available services catalog
```

### Webhooks
```
POST   /api/v1/webhooks/resend
       Handle email delivery events from Resend
       Auto-updates CampaignRecipient status
```

---

## Search Pipeline Execution

```
User initiates search:  POST /api/v1/search
↓
SearchApiService.createSearch() → Create SearchJob (PENDING)
↓
SearchOrchestratorService.run()
│
├─ STAGE 1: DISCOVERY (DISCOVERING)
│  ├─ QueryParserAgent: Parse "B2B SaaS hiring"
│  ├─ CompanyDiscoveryAgent: Find matching companies
│  └─ Save discovered companies to DB
│
├─ STAGE 2: CRAWLING (CRAWLING)
│  ├─ WebsiteCrawlerService (Playwright)
│  ├─ Crawl homepage, /careers, /about, /team
│  └─ Extract HTML/text content
│
├─ STAGE 3: EXTRACTION (EXTRACTING)
│  ├─ CompanyExtractionAgent (OpenAI LLM)
│  ├─ Extract: name, products, services, executives, size, industry
│  ├─ Save to CompanyProfile (version 1)
│  └─ Compute completeness score
│
├─ STAGE 4: ENRICHMENT (ENRICHING)
│  ├─ LeadEnrichmentAgent (OpenAI LLM)
│  ├─ Extract decision-maker contacts
│  ├─ Validate email formats
│  └─ Check for outreach gaps
│
└─ STAGE 5: INTENT DETECTION (async, background)
   ├─ IntentSignalAgent (OpenAI LLM)
   ├─ Detect: Hiring (job postings), Funding (announcements), Expansion
   ├─ Store signals in intent_signals table
   └─ Update Company.intentScore
   
↓
SearchJob status → COMPLETED
↓
User retrieves results: GET /api/v1/search/[id]
```

**Configuration:**
- Default concurrency: 3 companies processed in parallel
- Configurable in `lib/config/pipeline.config.ts`

---

## Agents Overview

### 1. **QueryParserAgent**
- **Input:** Natural language query ("B2B SaaS hiring")
- **Output:** Parsed criteria (industry, location, keywords, etc.)
- **Used by:** SearchOrchestrator → CompanyDiscoveryAgent

### 2. **CompanyDiscoveryAgent**
- **Input:** Parsed query + criteria
- **Output:** List of discovered companies with domains
- **Used by:** SearchOrchestrator (Stage 1)

### 3. **CompanyExtractionAgent**
- **Input:** HTML/text content from crawled website
- **Output:** Structured company data (JSON)
- **Used by:** SearchOrchestrator (Stage 3)
- **Fields extracted:** Products, services, executives, industry, size, description

### 4. **LeadEnrichmentAgent**
- **Input:** Company profile
- **Output:** Decision-maker contacts with emails
- **Used by:** SearchOrchestrator (Stage 4)

### 5. **IntentSignalAgent**
- **Input:** Company profile + website content
- **Output:** Buying signals with confidence scores
- **Used by:** IntentDetectionRunner (Stage 5, async)
- **Signal types:** HIRING, FUNDING, EXPANSION, PRODUCT_LAUNCH

### 6. **OutreachMessageAgent**
- **Input:** Company profile + tone preference
- **Output:** Personalized email subject + body
- **Used by:** OutreachMessageApiService
- **Supports:** EMAIL, WHATSAPP channels

### 7. **ScoringAgent** (if available)
- **Input:** Company profile + intent signals
- **Output:** Lead score (0-100)
- **Used by:** Lead ranking/filtering

---

## Common Tasks

### How to create a search?
```bash
curl -X POST http://localhost:3000/api/v1/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "B2B SaaS companies in US hiring engineers",
    "companyLimit": 50,
    "criteria": {
      "industry": "Software",
      "location": "United States"
    }
  }'
```

### How to check search progress?
```bash
curl http://localhost:3000/api/v1/search/[searchJobId]
```

### How to create a campaign?
```bash
curl -X POST http://localhost:3000/api/v1/campaigns \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Q1 Expansion",
    "subject": "Interested in partnering?",
    "bodyText": "Hi {{name}}, we help companies like yours...",
    "bodyHtml": "<p>Hi {{name}}, ...</p>"
  }'
```

### How to generate an AI message?
```bash
curl -X POST http://localhost:3000/api/v1/outreach/messages \
  -H "Content-Type: application/json" \
  -d '{
    "companyId": "[companyId]",
    "tone": "formal"
  }'
```

### How to send a campaign?
```bash
curl -X POST http://localhost:3000/api/v1/campaigns/[campaignId]/send
```

---

## Development Setup

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- OpenAI API key

### Local Development
```bash
# Install dependencies
npm install

# Start PostgreSQL
npm run db:up

# Run migrations
npm run db:migrate

# Seed database (optional)
npm run db:seed

# Start dev server
npm run dev

# Open http://localhost:3000
```

### Database
```bash
npm run db:studio          # Open Prisma Studio (GUI)
npm run db:migrate         # Run pending migrations
npm run db:reset           # Reset database (⚠️ destructive)
npm run db:seed            # Seed sample data
```

### Testing
```bash
npm test                   # Run all tests
npm test:watch             # Watch mode
```

### Building
```bash
npm run build              # Production build
npm start                  # Start production server
```

---

## Key Technologies

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Next.js 15, Tailwind CSS |
| Backend | Next.js API Routes, TypeScript |
| Database | PostgreSQL, Prisma 6 ORM |
| AI/ML | OpenAI API (GPT-4, GPT-3.5) |
| Web Scraping | Playwright, Node HTML Parser |
| Logging | Pino |
| Validation | Zod |
| Testing | Vitest |
| Auth | NextAuth.js v5 |

---

## Important Configuration Files

- `.env.local` - Environment variables (not in repo, local only)
- `prisma/schema.prisma` - Database schema
- `lib/config/pipeline.config.ts` - Search pipeline settings
- `lib/config/crawler.config.ts` - Website crawler settings
- `lib/config/openai.client.ts` - LLM configuration
- `tsconfig.json` - TypeScript config
- `next.config.ts` - Next.js config

---

## Security Features

- ✅ NextAuth.js for authentication
- ✅ Role-based access control (ADMIN, MANAGER, SALES_REP)
- ✅ Security headers via middleware
- ✅ Input validation (Zod)
- ✅ Data sanitization
- ✅ HTTPS enforcement in production
- ✅ Rate limiting utilities

---

## Performance Considerations

- **Company deduplication:** By normalized domain (prevents duplicates)
- **Profile versioning:** Stores multiple versions to track data evolution
- **Indexed queries:** Strategic indexes on status, timestamps, scores
- **Concurrent processing:** Configurable parallelism (default 3)
- **Lazy loading:** React components lazy-loaded
- **Caching:** Company profiles cached, minimal re-crawls

---

## Troubleshooting

### Search stuck in DISCOVERING?
- Check OpenAI API key
- Verify database connectivity
- Check discovery service logs

### Companies not being crawled?
- Domain in discovery blocklist?
- Website blocking Playwright?
- Check crawler timeout settings

### Campaign not sending?
- Verify email provider API key
- Check email validation
- Review campaign recipient status

### Performance slow?
- Check database indexes
- Monitor concurrent agent execution
- Review API rate limits

---

## Learning Path

1. **Start here:** Read `AGENTS.md` (full architecture)
2. **Explore:** Look at `services/application/search-orchestrator.service.ts`
3. **Understand agents:** Check `agents/*/` directories
4. **Database:** Review `prisma/schema.prisma`
5. **API:** Explore `app/api/v1/`
6. **Frontend:** Check `app/(dashboard)/` pages
7. **Tests:** Review `tests/` for examples

---

## Useful Commands

```bash
# Development
npm run dev                    # Start dev server with hot reload
npm test:watch                # Run tests in watch mode

# Database
npm run db:studio             # Open Prisma GUI
npm run db:migrate            # Run migrations
npm run db:push               # Push schema changes

# Production
npm run build                 # Build for production
npm start                     # Start production server

# Maintenance
npm run db:reset              # ⚠️  Reset database
npm run db:seed               # Seed with sample data
```

---

## License & Support

This is an internal project. For issues or questions, contact the development team.

**Last Updated:** June 12, 2026
