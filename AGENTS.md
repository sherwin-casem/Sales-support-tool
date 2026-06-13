# Sales Support Tool - Architecture & Codebase Overview

## Project Summary
**Sales Support Tool** is an AI-powered sales intelligence platform built with Next.js 15, TypeScript, and Prisma. It discovers, analyzes, and enriches company information using web crawling and LLM-powered agents, then enables outreach through email campaigns.

**Tech Stack:**
- Frontend: React 19, Next.js 15, TypeScript, Tailwind CSS
- Backend: Next.js API routes, Prisma 6.9 ORM
- Database: PostgreSQL (via Docker)
- AI: OpenAI API (company extraction, intent detection)
- Web: Playwright (website crawling), Node HTML Parser
- Testing: Vitest
- Logging: Pino

---

## High-Level Architecture

```
User Interface (Next.js Pages)
    ↓
API Routes (app/api/v1)
    ↓
Application Services (services/application)
    ↓
Search Orchestrator ← Agents (AI) + Infrastructure Services
    ↓
Domain Services (services/domain)
    ↓
Repositories (Prisma ORM)
    ↓
PostgreSQL Database
```

---

## Core Components

### 1. **Agents** (`/agents`)
AI-powered agents that handle specific business logic. All agents implement the `Agent<TInput, TOutput, TError>` interface.

#### Agent Types:
- **Discovery Agent** (`discovery/`)
  - `company-discovery.agent.ts`: Finds companies matching search criteria
  - `query-parser.agent.ts`: Parses natural language search queries
  
- **Extraction Agent** (`extraction/`)
  - `company-extraction.agent.ts`: Extracts structured company data (executives, products, etc.)
  
- **Enrichment Agent** (`enrichment/`)
  - `lead-enrichment.agent.ts`: Enriches company data with decision-maker contacts
  
- **Intent Signal Agent** (`intent/`)
  - `intent-signal.agent.ts`: Detects buying intent signals (hiring, funding, expansion)
  
- **Outreach Agent** (`outreach/`)
  - `outreach-message.agent.ts`: Generates AI-personalized outreach messages
  
- **Scoring Agent** (`scoring/`)
  - Scores leads based on intent and relevance

#### Shared Utilities:
- `base/agent.interface.ts`: Core interface all agents implement
- `shared/prompt-loader.ts`: Loads and manages prompt templates
- Agents use Result<T, E> pattern for error handling

---

### 2. **Application Services** (`/services/application`)
High-level orchestration and API services.

#### Key Services:
- **search-api.service.ts**: REST API for creating/retrieving searches
- **search-orchestrator.service.ts**: Main search pipeline orchestrator
  - Coordinates: Discovery → Crawl → Extract → Enrich → Intent Detection
  - Manages concurrency, error recovery, and stage transitions
  
- **company-api.service.ts**: Company CRUD operations
- **campaign-api.service.ts**: Email campaign management
- **outreach-message-api.service.ts**: Generate outreach messages
- **campaign-orchestrator.service.ts**: Manages campaign execution
- **lead-refresh.service.ts**: Scheduled lead re-enrichment
- **intent-detection-runner.service.ts**: Background intent signal detection
- **admin-api.service.ts**: Admin user/service management
- **analytics-api.service.ts**: Campaign analytics

#### Factory Pattern:
- `search-api.factory.ts`: Creates search API service instances
- `search-orchestrator.factory.ts`: Creates orchestrator with dependencies
- `company-api.factory.ts`: Creates company API service instances

---

### 3. **Domain Services** (`/services/domain`)
Business logic layer independent of frameworks.

#### Modules:
- **company/**: Company deduplication by domain
- **enrichment/**: Profile merging, contact extraction, outreach gap detection
- **content/**: Prompt sanitization, text processing
- **crawler/**: Website crawling utilities

#### Key Responsibilities:
- Profile merging across multiple crawl attempts
- Decision-maker contact enrichment
- Data validation and sanitization
- Deduplication of companies

---

### 4. **Infrastructure Services** (`/services/infrastructure`)
Low-level integrations with external systems.

#### Modules:
- **ai/**: OpenAI integration
  - `company-extraction.service.ts`: LLM-based extraction
  - `lead-enrichment.service.ts`: Contact/intent enrichment via LLM
  - `query-parser.service.ts`: Parse natural language queries
  
- **crawler/**: Website crawling
  - `website-crawler.service.ts`: Playwright-based crawler
  
- **discovery/**: Company discovery
  - `company-discovery.service.ts`: Web search discovery
  
- **content/**: Content processing
  - `text-cleaning.service.ts`: HTML → LLM-ready text
  
- **database/**: Prisma queries (domain-specific)

---

### 5. **Repositories** (`/repositories`)
Data access layer.

#### Structure:
- **interfaces/**: Repository interfaces (company, search, etc.)
- **prisma/**: Prisma implementations
  - `company.repository.ts`: Company CRUD + queries
  - `search.repository.ts`: Search job + results queries

#### Key Tables:
- `Company`: Deduplicated company records by domain
- `CompanyProfile`: Versioned AI-extracted structured data
- `SearchJob`: User search request lifecycle
- `SearchResult`: Links companies to searches, tracks per-lead pipeline
- `User`, `Organization`: Auth & multi-tenancy
- `Campaign`, `CampaignRecipient`: Email campaigns
- `IntentSignal`: Detected buying signals
- `OutreachMessage`: Generated messages (drafts)
- `LeadRefreshSchedule`: Scheduled re-enrichment

---

### 6. **API Routes** (`/app/api`)

#### Authentication
- `auth/[...nextauth]/route.ts`: NextAuth.js authentication

#### V1 API Endpoints
**Search:**
- `POST /api/v1/search`: Create new search
- `GET /api/v1/search/[id]`: Get search status + results

**Companies:**
- `GET /api/v1/companies`: List companies
- `GET /api/v1/companies/[id]`: Company details + profile
- `POST /api/v1/companies/[id]/refresh-schedule`: Schedule re-enrichment

**Campaigns:**
- `POST /api/v1/campaigns`: Create campaign
- `GET/PUT /api/v1/campaigns/[id]`: View/update campaign
- `POST /api/v1/campaigns/[id]/schedule`: Schedule campaign
- `POST /api/v1/campaigns/[id]/send`: Send immediately
- `POST /api/v1/campaigns/[id]/pause`: Pause campaign

**Outreach:**
- `POST /api/v1/outreach/messages`: Generate outreach message

**Analytics:**
- `GET /api/v1/analytics/campaigns`: Campaign metrics

**Admin:**
- `GET/POST /api/v1/admin/users`: User management
- `GET/PUT /api/v1/admin/users/[id]`: User details
- `GET /api/v1/admin/services`: Manage services catalog

**Webhooks:**
- `POST /api/v1/webhooks/resend`: Handle email delivery webhooks

**Cron:**
- `GET /api/cron/refresh-leads`: Trigger scheduled lead refresh

---

### 7. **UI Components** (`/components`)

#### Structure:
- **layout/**: Header, sidebar, navigation
- **search/**: Search form, filters
- **results/**: Search results display, company cards
- **companies/**: Company list, detail views
- **leads/**: Lead scoring, qualification UI
- **outreach/**: Message generation, preview
- **campaigns/**: Campaign builder, scheduling
- **analytics/**: Dashboard charts, metrics
- **shared/**: Reusable buttons, modals, inputs
- **ui/**: Headless UI primitives
- **providers/**: React context providers

#### Pages (`/app`):
- `(auth)/`: Login pages
- `(dashboard)/`: Protected dashboard layout
- `search/`: Search creation + results
- `companies/`: Company explorer
- `campaigns/`: Campaign management
- `analytics/`: Analytics dashboard
- `admin/`: Admin panel (users, services)

---

### 8. **Database Schema** (`/prisma/schema.prisma`)

#### Key Models:

**Organization & Users:**
- `Organization`: Multi-tenant container
- `User`: User accounts with roles (ADMIN, MANAGER, SALES_REP)

**Company Data:**
- `Company`: Global company record by domain
- `CompanyProfile`: Versioned extracted data (JSON)

**Search Pipeline:**
- `SearchJob`: User search request with lifecycle (PENDING → DISCOVERING → CRAWLING → EXTRACTING → ENRICHING → COMPLETED/FAILED)
- `SearchResult`: Maps company to search, tracks stage (DISCOVERED → CRAWLED → EXTRACTED → ENRICHED)

**Intent & Outreach:**
- `IntentSignal`: Buying signals (HIRING, FUNDING, EXPANSION, PRODUCT_LAUNCH, OTHER)
- `OutreachMessage`: Generated message drafts

**Campaigns:**
- `Campaign`: Email campaign (DRAFT, SCHEDULED, RUNNING, PAUSED, COMPLETED, FAILED)
- `CampaignRecipient`: Per-recipient status (PENDING, SENT, DELIVERED, OPENED, CLICKED, REPLIED, BOUNCED)

**Scheduling:**
- `LeadRefreshSchedule`: Trigger periodic re-enrichment

---

### 9. **Utilities & Libraries** (`/lib`)

#### Config:
- `env.ts`: Environment variables
- `crawler.config.ts`: Crawler settings (timeouts, user agents)
- `pipeline.config.ts`: Pipeline concurrency limits
- `openai.client.ts`: OpenAI client initialization
- `outreach.config.ts`: Outreach templates
- `discovery-blocklist.ts`: Domains to skip in discovery

#### API:
- `handler.ts`: Generic API handler wrapper
- `http-response.ts`: JSON response builder
- `parse-request.ts`: Request body parsing + validation
- `auth.ts`: Extract authenticated user
- `rate-limit.ts`: Rate limiting utilities
- `sanitize-profile.ts`: Remove sensitive data

#### Auth:
- `auth.ts`: Prisma adapter, session config
- `permissions.ts`: Role-based access control
- `client-auth.ts`: Browser auth utilities

#### Search:
- `company-limit.ts`: Company result limits logic

#### Logging:
- `logger.ts`: Pino logger singleton

#### Utils:
- `result.ts`: Result<T, E> type (Ok/Err pattern)
- `concurrency.ts`: Concurrent execution with limits

#### Validations:
- `company-extraction.schema.ts`: Zod schemas for extraction validation
- `api/search.schema.ts`: Search request validation

---

### 10. **Types** (`/types`)

#### Structure:
- `agents/`: Agent input/output types
- `api/`: API request/response types
- `auth/`: Auth types
- `content/`: Text content types
- `crawler/`: Crawler configuration
- `domain/`: Business domain types
- `orchestration/`: Orchestrator types
- `repositories/`: Repository types
- `results/`: Result/error types
- `shared/`: Common types

---

## Data Flow: Search Execution

### 1. **User Initiates Search**
```
POST /api/v1/search
→ SearchApiService.createSearch()
→ Create SearchJob (PENDING)
→ Return 202 with job ID
```

### 2. **Pipeline Stages** (via search orchestrator)

**Stage 1: Discovery** (DISCOVERING)
- QueryParserAgent: Parse natural language
- CompanyDiscoveryAgent: Find matching companies
- Output: List of companies with domains

**Stage 2: Crawling** (CRAWLING)
- WebsiteCrawlerService: Crawl each domain
- Output: Raw HTML content per company

**Stage 3: Extraction** (EXTRACTING)
- CompanyExtractionAgent: LLM extracts structured data
- Saves to `CompanyProfile` versioned table
- Output: {name, products, industry, executives, etc.}

**Stage 4: Enrichment** (ENRICHING)
- LeadEnrichmentAgent: Find decision-maker contacts
- DecisionMakerContactService: Extract emails
- Output: Enhanced profile with contacts

**Stage 5: Intent Detection** (Optional, async)
- IntentSignalAgent: Detect buying signals
- Compute `intentScore` on Company
- Output: Intent signals stored in DB

### 3. **Results Retrieval**
```
GET /api/v1/search/[id]
→ SearchApiService.getSearch()
→ Return SearchJob status + SearchResults
```

---

## Campaign Execution Flow

### 1. **Create Campaign**
```
POST /api/v1/campaigns
→ CampaignApiService.create()
→ Save Campaign (DRAFT)
```

### 2. **Add Recipients**
- Typically from SearchResults or manual company selection
- Creates CampaignRecipient records (PENDING)

### 3. **Generate Outreach (Optional)**
```
POST /api/v1/outreach/messages
→ OutreachMessageAgent (if Parijat subscription available)
→ Store draft in OutreachMessage table
```

### 4. **Schedule/Send**
```
POST /api/v1/campaigns/[id]/schedule
→ Set scheduledAt, update status → SCHEDULED

POST /api/v1/campaigns/[id]/send
→ CampaignOrchestratorService.send()
→ Call email provider (Resend)
→ Update CampaignRecipient.sentAt + status
```

### 5. **Webhook Handling**
```
POST /api/v1/webhooks/resend
→ Update CampaignRecipient status
→ Track: DELIVERED, OPENED, CLICKED, REPLIED, BOUNCED
```

---

## Key Design Patterns

### 1. **Result Type**
```typescript
type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };
```
All async operations return Result, no thrown exceptions.

### 2. **Agent Interface**
```typescript
interface Agent<TInput, TOutput, TError> {
  execute(input: TInput): Promise<Result<TOutput, TError>>;
}
```
All AI agents follow this contract.

### 3. **Service Layer**
- **Application Services**: Coordinate across repositories & infrastructure
- **Domain Services**: Pure business logic
- **Infrastructure Services**: External integrations

### 4. **Factory Pattern**
Services instantiated via factories (dependency injection).

### 5. **Repository Pattern**
Data access abstracted via interfaces.

### 6. **Error Handling**
- Custom error types (AgentError, ValidationError, etc.)
- Errors propagate as Result.error, never thrown
- Comprehensive error messages for debugging

---

## Database Indexes

Key indexes for performance:
- `companies(normalizedDomain)`: Deduplication key
- `companies(intentScore)`: Sorting by intent
- `search_results(searchJobId, stage)`: Pipeline progress tracking
- `search_results(searchJobId, rank)`: Result ranking
- `company_profiles(companyId, extractedAt)`: Latest profile retrieval
- `campaign_recipients(campaignId, status)`: Campaign progress
- `lead_refresh_schedules(enabled, nextRunAt)`: Scheduled task discovery

---

## Environment Configuration

Key environment variables:
- `DATABASE_URL`: Postgres connection
- `DIRECT_URL`: Direct Postgres (for Prisma migrations)
- `OPENAI_API_KEY`: OpenAI API key
- `NEXTAUTH_SECRET`: Session encryption
- `NEXTAUTH_URL`: Auth redirect URL
- Various rate limits, crawler config, email provider keys

---

## Testing

- **Test Framework**: Vitest
- **Test Locations**: `/tests` mirrors source structure
- **Coverage Areas**: Agents, services, repositories, components

---

## Deployment

- **Hosting**: Vercel (via `vercel.json`)
- **Database**: Docker Compose for local, managed Postgres for production
- **Build**: `npm run build` → `npm start`

---

## Common Workflows

### Add a New Search Stage
1. Create agent in `/agents`
2. Implement `Agent<Input, Output>` interface
3. Add stage to orchestrator
4. Update SearchResultStage enum in schema
5. Add error handling in orchestrator

### Add API Endpoint
1. Create route file in `/app/api/v1`
2. Use `withApiHandler` wrapper
3. Validate request with Zod schema
4. Call application service
5. Return `jsonResponse`

### Query Companies
1. Use `CompanyRepository` from factory
2. Methods: `findByDomain`, `findWithLatestProfile`, `upsert`
3. Results include joined CompanyProfile + related data

### Extend CompanyProfile Structure
1. Update Zod schema in validations
2. Update CompanyExtractionAgent prompt
3. Migrate schema.prisma if changing structure
4. Update extraction logic

---

## Security Considerations

- **Middleware** (`middleware.ts`): Sets security headers (CSP, HSTS, X-Frame-Options, etc.)
- **Auth**: NextAuth.js session-based, with role-based access control
- **API**: Requires `getAuthenticatedUserId()` check
- **Data**: Sensitive data sanitized before API responses
- **Validation**: All inputs validated with Zod

---

## Performance Optimizations

- **Concurrency**: Configurable concurrent agent execution (default 3)
- **Caching**: Company profiles cached, minimal re-crawls
- **Indexing**: Strategic DB indexes on search, status, timestamps
- **Lazy Loading**: Components lazy-loaded in Next.js
- **Streaming**: Search results streamed as discovered

---

## Troubleshooting

### Search Stuck in DISCOVERING
- Check OpenAI API rate limits
- Verify DATABASE_URL connectivity
- Check discovery-blocklist config

### Companies Not Found
- Check crawler blocklist domains
- Verify discovery service config (model, limits)
- Check Playwright browser compatibility

### Campaign Not Sending
- Verify email provider API key
- Check CampaignRecipient email validity
- Review outreach-gaps detection

---

## Future Enhancement Ideas

1. **Multi-language Support**: Translation agents
2. **Advanced Scoring**: ML-based lead scoring
3. **Webhook Management**: User-configurable webhooks
4. **Bulk Operations**: Batch import/export
5. **Real-time Updates**: WebSockets for live search progress
6. **Custom Agents**: User-defined agent workflows
7. **B2B Data Enrichment**: Third-party data providers
8. **Email Verification**: Advanced email validation
