# Component Dependency Map

## Service Dependency Graph

```
                            ┌─────────────────────────────────────────────────────┐
                            │          API ROUTES (Next.js)                       │
                            │  /api/v1/{search,companies,campaigns,outreach}     │
                            └────────────────┬────────────────────────────────────┘
                                             │
                        ┌────────────────────┼────────────────────┐
                        │                    │                    │
              ┌─────────▼─────────┐ ┌───────▼──────────┐  ┌──────▼──────────┐
              │  SearchApiService │ │ CompanyApiService│  │CampaignApiService│
              │  - createSearch() │ │ - getCompany()   │  │ - createCampaign()
              │  - getSearch()    │ │ - listCompanies()│  │ - sendCampaign() │
              └────────┬──────────┘ └────────┬─────────┘  └─────┬────────────┘
                       │                     │                  │
                       │            ┌────────▼─────────┐        │
                       │            │ CompanyRepository│        │
                       │            └────────┬─────────┘        │
                       │                     │                  │
              ┌────────▼────────────────────┼──────────────────┼──────┐
              │                             │                  │      │
        ┌─────▼────────────────────────────────────────────────▼──┐   │
        │     SearchOrchestratorService (Main Orchestrator)       │   │
        │  - Coordinates 5-stage pipeline                        │   │
        │  - Error recovery & concurrency management             │   │
        └──┬──────────────────────────────────────────────────┬───┘   │
           │                                                  │       │
    ┌──────┴─────────────────────────────────────────────────┴───┐   │
    │                                                              │   │
    │  STAGE 1          STAGE 2          STAGE 3                 │   │
    │  DISCOVERY        CRAWLING         EXTRACTION              │   │
    │  ────────         ────────         ──────────              │   │
    │      │                 │                 │                 │   │
    ▼      ▼                 ▼                 ▼                 ▼   ▼
  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────────┐
  │ QueryParserAgent │  │CompanyDiscovery  │  │ WebsiteCrawlerService    │
  │                  │  │ Service          │  │ (Playwright Browser)     │
  │ LLM: Parse       │  │                  │  │                          │
  │ natural language │  │ Web search for   │  │ - Main page              │
  │                  │  │ companies        │  │ - /careers page          │
  └────────┬─────────┘  └────────┬─────────┘  │ - /team page             │
           │                     │            │ - PDF documents          │
           │    ┌────────────────┘            └────────────┬─────────────┘
           │    │                                          │
           │    └──────────────────────────────┬───────────┘
           │                                   │
           │   ┌─────────────────────────────────────────────────────┐
           │   │ STAGE 3: EXTRACTION (CompanyExtractionAgent)        │
           │   │                                                     │
           │   │ LLM processes HTML → Extracts:                      │
           │   │ - Company name, description, industry              │
           │   │ - Products, services, customers                    │
           │   │ - Executives, decision makers                      │
           │   │ - Company size, location                           │
           │   │ → Saves CompanyProfile (version 1)                 │
           │   └──────────────────────┬──────────────────────────────┘
           │                          │
           │   ┌──────────────────────▼──────────────────────────────┐
           │   │ STAGE 4: ENRICHMENT (LeadEnrichmentAgent)           │
           │   │                                                     │
           │   │ LLM processes profile → Extracts:                   │
           │   │ - Decision-maker names & titles                    │
           │   │ - Contact email addresses                          │
           │   │ - Social profiles                                  │
           │   │ → DecisionMakerContactService validates            │
           │   └──────────────────────┬──────────────────────────────┘
           │                          │
           │   ┌──────────────────────▼──────────────────────────────┐
           │   │ STAGE 5: INTENT DETECTION (Background, Async)       │
           │   │ IntentSignalAgent                                   │
           │   │                                                     │
           │   │ LLM detects:                                        │
           │   │ - Hiring signals (job postings)                    │
           │   │ - Funding announcements                            │
           │   │ - Expansion news                                   │
           │   │ - Product launches                                 │
           │   │ → Computes Company.intentScore                     │
           │   │ → Stores IntentSignal records                      │
           │   └──────────────────────┬──────────────────────────────┘
           │                          │
           └──────────────────────────┼──────────────────────────────┐
                                      │                             │
                        ┌─────────────▼──────────────┐    ┌─────────▼──────┐
                        │ Domain Services Layer      │    │ SearchRepository
                        │                            │    │                 │
                        │ - ProfileMergingService    │    │ - Save results  │
                        │ - CompanyDeduplicator      │    │ - Update status │
                        │ - ContactEnrichment        │    └─────────┬────────┘
                        │ - OutreachGapDetector      │              │
                        │ - TextCleaningService     │              │
                        │ - PromptSanitizer         │              │
                        └────────────┬──────────────┘              │
                                     │                             │
                                     └─────────────┬────────────────┘
                                                   │
                                    ┌──────────────▼──────────────┐
                                    │   CompanyRepository         │
                                    │   (Prisma ORM)              │
                                    │                             │
                                    │ - Upsert company record     │
                                    │ - Find by domain            │
                                    │ - Get with profiles         │
                                    └──────────────┬──────────────┘
                                                   │
                                    ┌──────────────▼──────────────┐
                                    │   PostgreSQL Database       │
                                    │                             │
                                    │ Tables:                     │
                                    │ - companies                 │
                                    │ - company_profiles          │
                                    │ - search_jobs               │
                                    │ - search_results            │
                                    │ - intent_signals            │
                                    │ - ...others                 │
                                    └─────────────────────────────┘
```

## Campaign Flow

```
┌──────────────────────────────────────────────────────────────┐
│ User creates campaign                                         │
│ POST /api/v1/campaigns                                       │
└─────────────────────────┬──────────────────────────────────────┘
                          │
          ┌───────────────▼──────────────────┐
          │ CampaignApiService               │
          │ .create(request)                 │
          └───────────────┬──────────────────┘
                          │
          ┌───────────────▼──────────────────┐
          │ CampaignRepository               │
          │ .create(campaign)                │
          │ (Status: DRAFT)                  │
          └───────────────┬──────────────────┘
                          │
                          │ Add recipients (from SearchResults)
                          │
          ┌───────────────▼──────────────────────────────┐
          │ CampaignRecipientRepository                  │
          │ .create(recipient) x N                       │
          │ (Status: PENDING per email)                  │
          └───────────────┬──────────────────────────────┘
                          │
                          │ Optional: Generate AI messages
                          │ POST /api/v1/outreach/messages
                          │
          ┌───────────────▼──────────────────────────────┐
          │ OutreachMessageApiService                    │
          │ .generateMessage(company, tone)              │
          │                                              │
          │ → OutreachMessageAgent (OpenAI LLM)          │
          │   Generates personalized subject + body      │
          │                                              │
          │ → Stores in OutreachMessage table (draft)   │
          └───────────────┬──────────────────────────────┘
                          │
                          │ User: Schedule or Send
                          │
          ┌───────────────▼──────────────────┐
          │ CampaignOrchestratorService       │
          │ .send(campaignId)                 │
          │ (Status: RUNNING)                 │
          └───────────────┬──────────────────┘
                          │
          ┌───────────────▼──────────────────────────────┐
          │ For each CampaignRecipient:                  │
          │ - Call Resend API (email provider)           │
          │ - Update sentAt timestamp                    │
          │ - Update status: PENDING → SENT              │
          │ - Store provider ID for tracking             │
          └───────────────┬──────────────────────────────┘
                          │
                          │ Email sent
                          │
          ┌───────────────▼──────────────────────────────┐
          │ Email Delivery Events                        │
          │ (Resend Webhooks)                            │
          │                                              │
          │ → POST /api/v1/webhooks/resend               │
          │   Updates CampaignRecipient status:          │
          │   - DELIVERED                                │
          │   - OPENED (tracked pixel)                   │
          │   - CLICKED (link tracking)                  │
          │   - REPLIED (email received)                 │
          │   - BOUNCED (delivery failed)                │
          │                                              │
          │ → Updates Campaign.completedAt when done     │
          └───────────────┬──────────────────────────────┘
                          │
          ┌───────────────▼──────────────────┐
          │ Analytics Dashboard               │
          │ GET /api/v1/analytics/campaigns  │
          │                                  │
          │ Shows:                          │
          │ - Open rate                     │
          │ - Click rate                    │
          │ - Reply rate                    │
          │ - Bounce rate                   │
          │ - Performance over time         │
          └──────────────────────────────────┘
```

## Data Model Relationships

```
Organization
  ├── 1:N Users
  │   ├── 1:N SearchJobs
  │   │   └── 1:N SearchResults
  │   │       └── N:1 Company
  │   │           ├── 1:N CompanyProfiles (versioned)
  │   │           └── 1:N IntentSignals
  │   │
  │   ├── 1:N Campaigns
  │   │   └── 1:N CampaignRecipients
  │   │       └── N:1 Company
  │   │
  │   ├── 1:N OutreachMessages
  │   │   └── N:1 Company
  │   │
  │   └── 1:N LeadRefreshSchedules
  │       └── N:1 Company
  │
  └── Global Company Registry
      ├── Companies (normalized by domain)
      │   ├── 1:N CompanyProfiles (version history)
      │   ├── 1:N SearchResults (appears in multiple searches)
      │   ├── 1:N IntentSignals
      │   └── 1:N CampaignRecipients
      │
      └── Shared across all organizations


Key Deduplication Strategy:
  - Company.normalizedDomain is UNIQUE
  - Multiple users/orgs can reference same company
  - CompanyProfile versioned (v1, v2, v3...)
  - Latest profile retrieved by: 
    ORDER BY extractedAt DESC LIMIT 1
```

## Authentication & Authorization Flow

```
Browser
  │
  ├─→ POST /auth/signin
  │   └─→ NextAuth.js Handler
  │       ├─→ Verify credentials
  │       ├─→ Find/Create User in DB
  │       ├─→ Generate session token
  │       └─→ Set secure session cookie
  │
  ├─→ Subsequent Requests (with session cookie)
  │   ├─→ getAuthenticatedUserId(request)
  │   │   ├─→ Verify session token
  │   │   └─→ Return userId
  │   │
  │   └─→ Middleware checks authorization
  │       ├─→ Verify user.role
  │       ├─→ Admin routes: require ADMIN role
  │       ├─→ Manager routes: require MANAGER+ role
  │       └─→ Sales reps: access own data only
  │
  └─→ API Response (with security headers via middleware.ts)
      ├─→ X-Content-Type-Options: nosniff
      ├─→ X-Frame-Options: DENY
      ├─→ Referrer-Policy: strict-origin-when-cross-origin
      ├─→ Permissions-Policy: camera=(), microphone=(), geolocation=()
      └─→ HSTS: max-age=63072000 (production only)
```

## Error Handling Pattern

```
All services return Result<T, E> (never throw):

  Result<SearchJob, SearchOrchestratorError>
      │
      ├─→ Ok({ job, results })  ✓
      │
      └─→ Err({
          code: "DISCOVERY_FAILED" | "CRAWL_FAILED" | "EXTRACTION_FAILED" ...
          message: "Human-readable error message"
          cause?: underlying_error  // Optional root cause
        })

Usage:
  const result = await orchestrator.run(input);
  
  if (!result.ok) {
    // Handle error
    logger.error(`Pipeline failed: ${result.error.message}`);
    return jsonResponse(result, 400);
  }
  
  // Use result.value
  const { job, results } = result.value;
```

## File Organization by Feature

```
SEARCH FEATURE
├── /app/search/page.tsx                      - UI page
├── /app/api/v1/search/route.ts               - API endpoint
├── /services/application/search-api.service.ts
├── /services/application/search-orchestrator.service.ts
├── /services/infrastructure/discovery/company-discovery.service.ts
├── /services/infrastructure/crawler/website-crawler.service.ts
├── /services/infrastructure/ai/company-extraction.service.ts
├── /agents/discovery/query-parser.agent.ts
├── /agents/discovery/company-discovery.agent.ts
├── /agents/extraction/company-extraction.agent.ts
├── /agents/enrichment/lead-enrichment.agent.ts
├── /repositories/interfaces/search.repository.interface.ts
├── /repositories/prisma/search.repository.ts
├── /types/agents/query-parser.types.ts
├── /types/agents/company-extraction.types.ts
├── /types/orchestration/search-orchestrator.types.ts
└── /prompts/discovery/, /extraction/, /enrichment/

CAMPAIGN FEATURE
├── /app/campaigns/page.tsx                   - UI page
├── /app/api/v1/campaigns/route.ts            - API endpoints
├── /services/application/campaign-api.service.ts
├── /services/application/campaign-orchestrator.service.ts
├── /agents/outreach/outreach-message.agent.ts
├── /repositories/interfaces/campaign.repository.interface.ts
├── /repositories/prisma/campaign.repository.ts
├── /lib/config/outreach.config.ts
└── /prompts/outreach/

COMPANY FEATURE
├── /app/companies/page.tsx                   - UI page
├── /app/api/v1/companies/route.ts            - API endpoints
├── /services/application/company-api.service.ts
├── /services/domain/company/company-deduplicator.service.ts
├── /repositories/interfaces/company.repository.interface.ts
├── /repositories/prisma/company.repository.ts
└── /types/domain/company.types.ts

INTENT DETECTION FEATURE
├── /services/application/intent-detection-runner.service.ts
├── /agents/intent/intent-signal.agent.ts
├── /agents/scoring/scoring.agent.ts
├── /prompts/intent/, /scoring/
└── /types/agents/intent-signal.types.ts
```

## Configuration Hierarchy

```
Environment (.env.local)
  │
  ├─→ lib/config/env.ts
  │   (Validates & exports all env vars)
  │
  ├─→ Individual config files
  │   ├─→ lib/config/pipeline.config.ts (concurrency, timeouts)
  │   ├─→ lib/config/crawler.config.ts (user agents, paths)
  │   ├─→ lib/config/openai.client.ts (model selection, params)
  │   ├─→ lib/config/outreach.config.ts (tone templates, defaults)
  │   ├─→ lib/config/discovery-blocklist.ts (domains to skip)
  │   └─→ lib/config/client-auth.ts (auth settings)
  │
  └─→ Used by services
      (Services read from config singletons)
```

---

## Summary Table: Key Components & Their Roles

| Component | Type | Purpose | Key Files |
|-----------|------|---------|-----------|
| **SearchOrchestrator** | Service | Coordinates 5-stage search pipeline | `/services/application/search-orchestrator.service.ts` |
| **QueryParserAgent** | Agent | Parses natural language queries | `/agents/discovery/query-parser.agent.ts` |
| **CompanyDiscoveryAgent** | Agent | Finds companies matching criteria | `/agents/discovery/company-discovery.agent.ts` |
| **WebsiteCrawler** | Service | Crawls websites with Playwright | `/services/infrastructure/crawler/website-crawler.service.ts` |
| **CompanyExtractionAgent** | Agent | LLM extracts structured data | `/agents/extraction/company-extraction.agent.ts` |
| **LeadEnrichmentAgent** | Agent | LLM finds decision-maker contacts | `/agents/enrichment/lead-enrichment.agent.ts` |
| **IntentSignalAgent** | Agent | LLM detects buying signals | `/agents/intent/intent-signal.agent.ts` |
| **OutreachMessageAgent** | Agent | LLM generates personalized emails | `/agents/outreach/outreach-message.agent.ts` |
| **CampaignOrchestrator** | Service | Manages campaign execution & tracking | `/services/application/campaign-orchestrator.service.ts` |
| **CompanyRepository** | Repository | Data access for Company model | `/repositories/prisma/company.repository.ts` |
| **SearchRepository** | Repository | Data access for SearchJob/SearchResult | `/repositories/prisma/search.repository.ts` |
| **CompanyDeduplicator** | Domain Service | Prevents duplicate companies | `/services/domain/company/company-deduplicator.service.ts` |
| **ProfileMergingService** | Domain Service | Merges extracted profiles | `/services/domain/enrichment/profile-merge.service.ts` |

---

**Generated:** 2026-06-12  
**Last Updated:** As documented  
**Architecture Version:** 1.0
