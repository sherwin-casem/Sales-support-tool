# Sales Support Tool - Documentation Index

Welcome! This guide helps you navigate all available documentation for understanding this codebase.

## 📚 Documentation Files

### 1. **AGENTS.md** - Comprehensive Architecture Guide
**Best for:** Understanding the overall architecture, all components, data flow  
**Length:** ~1,800 lines  
**Contents:**
- Project summary & tech stack
- High-level architecture diagram
- Detailed breakdown of all 10 major components
- Database schema explanation
- Data flow for search and campaign execution
- Key design patterns used
- Configuration and security overview
- Performance optimizations

**Start here if:** You're new to the project and want complete understanding.

---

### 2. **PROJECT_QUICK_REFERENCE.md** - Developer Quick Lookup
**Best for:** Quick answers, common tasks, API endpoints, troubleshooting  
**Length:** ~800 lines  
**Contents:**
- Project summary in one paragraph
- Directory structure overview
- Database models quick reference
- All API endpoints listed
- Search pipeline overview
- Common task examples (create search, campaign, etc.)
- Setup instructions
- Technology stack table
- Useful commands

**Start here if:** You need to find something quickly or are looking up specific information.

---

### 3. **COMPONENT_MAP.md** - Dependency Diagrams & Connections
**Best for:** Understanding how components connect, data flow visualizations  
**Length:** ~600 lines  
**Contents:**
- Service dependency graph (detailed diagram)
- Campaign execution flow
- Data model relationships
- Authentication & authorization flow
- Error handling pattern
- File organization by feature
- Configuration hierarchy
- Summary component table

**Start here if:** You want to understand how components interact or debug a specific flow.

---

### 4. **This File (DOCUMENTATION_INDEX.md)** - Navigation Guide
**Best for:** Finding the right documentation file  
**Length:** ~200 lines  
**Contents:**
- Overview of all documentation
- Which doc to read for different questions
- FAQ linking to relevant sections
- Learning paths for different roles

---

## 🎯 How to Use These Docs

### By Role

#### **Frontend Developer**
1. Read PROJECT_QUICK_REFERENCE.md (Project overview, structure)
2. Check COMPONENT_MAP.md (UI Component connections)
3. Review app/ and components/ directories
4. Study AGENTS.md → Sections 7 (UI Components) & 6 (API Routes)

#### **Backend Developer**
1. Read AGENTS.md (Complete architecture)
2. Study COMPONENT_MAP.md (Service dependencies)
3. Review services/ and repositories/ directories
4. Look at one end-to-end flow in detail

#### **DevOps/Infrastructure**
1. Check PROJECT_QUICK_REFERENCE.md (Setup, deployment)
2. Review Deployment section in AGENTS.md
3. Check docker-compose.yml and vercel.json
4. Study environment configuration in AGENTS.md

#### **Product Manager/Stakeholder**
1. Read PROJECT_QUICK_REFERENCE.md (What is this project? Core functionality)
2. Check AGENTS.md → Section "Core Components" overview
3. Review "Workflow Examples" in PROJECT_QUICK_REFERENCE.md

#### **QA/Tester**
1. Read PROJECT_QUICK_REFERENCE.md (What does it do? Workflows)
2. Check COMPONENT_MAP.md (Component table at end)
3. Review API endpoints in PROJECT_QUICK_REFERENCE.md
4. Look at test structure in AGENTS.md

---

### By Question

#### **"What does this project do?"**
→ PROJECT_QUICK_REFERENCE.md → "What is this project?" section

#### **"How do I run the project locally?"**
→ PROJECT_QUICK_REFERENCE.md → "Development Setup" section

#### **"How does search work?"**
→ AGENTS.md → "Data Flow: Search Execution" section  
→ COMPONENT_MAP.md → "Service Dependency Graph"

#### **"How are companies deduplicated?"**
→ AGENTS.md → "Database Schema" → Company section  
→ COMPONENT_MAP.md → "Data Model Relationships"

#### **"What's the database schema?"**
→ AGENTS.md → "Database Schema" section  
→ COMPONENT_MAP.md → "Data Model Relationships" section  
→ prisma/schema.prisma (actual schema file)

#### **"What are all the API endpoints?"**
→ PROJECT_QUICK_REFERENCE.md → "Key API Endpoints" section  
→ AGENTS.md → "API Routes" section

#### **"How do agents work?"**
→ AGENTS.md → "Agents" component section  
→ agents/base/agent.interface.ts (interface)

#### **"How do I add a new feature?"**
→ AGENTS.md → "Common Workflows" section

#### **"What's the authentication flow?"**
→ COMPONENT_MAP.md → "Authentication & Authorization Flow"  
→ AGENTS.md → "Security Considerations" section

#### **"What are the key design patterns?"**
→ AGENTS.md → "Key Design Patterns" section  
→ COMPONENT_MAP.md → "Error Handling Pattern"

#### **"How is data modeled?"**
→ AGENTS.md → "Database Models" section  
→ COMPONENT_MAP.md → "Data Model Relationships"

#### **"What's the performance strategy?"**
→ AGENTS.md → "Performance Optimizations" section

#### **"How do I troubleshoot issues?"**
→ PROJECT_QUICK_REFERENCE.md → "Troubleshooting" section  
→ AGENTS.md → "Troubleshooting" section

#### **"What commands do I need?"**
→ PROJECT_QUICK_REFERENCE.md → "Useful Commands" section

---

## 🚀 Learning Paths

### Path 1: Complete Understanding (2-3 hours)
1. Read AGENTS.md completely
2. Study COMPONENT_MAP.md for visual understanding
3. Review PROJECT_QUICK_REFERENCE.md for quick lookups
4. Explore key files mentioned in AGENTS.md:
   - services/application/search-orchestrator.service.ts
   - agents/base/agent.interface.ts
   - prisma/schema.prisma
5. Run the project locally and create a test search

### Path 2: Quick Start (30 minutes)
1. Read PROJECT_QUICK_REFERENCE.md → Project summary & structure
2. Skim AGENTS.md → High-level architecture section
3. Check COMPONENT_MAP.md → Key components table
4. You're ready to start contributing!

### Path 3: Deep Dive - Search Feature (1 hour)
1. AGENTS.md → "Data Flow: Search Execution" section
2. COMPONENT_MAP.md → "Service Dependency Graph" diagram
3. Read these files:
   - app/api/v1/search/route.ts (entry point)
   - services/application/search-orchestrator.service.ts
   - agents/discovery/company-discovery.agent.ts
   - agents/extraction/company-extraction.agent.ts
   - services/domain/enrichment/profile-merge.service.ts

### Path 4: Deep Dive - Campaign Feature (45 minutes)
1. PROJECT_QUICK_REFERENCE.md → "Campaign Execution Flow" section
2. COMPONENT_MAP.md → "Campaign Flow" diagram
3. Read these files:
   - app/api/v1/campaigns/route.ts
   - services/application/campaign-api.service.ts
   - services/application/campaign-orchestrator.service.ts
   - agents/outreach/outreach-message.agent.ts

### Path 5: Deep Dive - Database (30 minutes)
1. AGENTS.md → "Database Schema" section
2. COMPONENT_MAP.md → "Data Model Relationships" diagram
3. Read prisma/schema.prisma in full
4. Review repositories/prisma/ directory

### Path 6: Security & Auth (30 minutes)
1. AGENTS.md → "Security Considerations" section
2. COMPONENT_MAP.md → "Authentication & Authorization Flow"
3. Review middleware.ts
4. Check lib/auth/ and lib/security/ directories

---

## 📊 Document Quick Stats

| Document | Lines | Topics | Best For |
|----------|-------|--------|----------|
| AGENTS.md | ~1,800 | Architecture, all components, workflows | Complete understanding |
| PROJECT_QUICK_REFERENCE.md | ~800 | Quick lookups, API, setup | Quick reference |
| COMPONENT_MAP.md | ~600 | Dependencies, flows, diagrams | Visual understanding |

**Total Documentation:** ~3,200 lines  
**Generated:** 2026-06-12

---

## 🔗 Key File References

### Most Important Files to Understand
1. **prisma/schema.prisma** - Database schema (entire data model)
2. **services/application/search-orchestrator.service.ts** - Main orchestration logic
3. **agents/base/agent.interface.ts** - How all AI agents work
4. **app/api/v1/search/route.ts** - Search API entry point
5. **middleware.ts** - Security headers and authentication

### Additional Key Files
- **lib/utils/result.ts** - Result<T, E> pattern (used everywhere)
- **repositories/interfaces/** - Data access contracts
- **types/agents/** - Type definitions for agents
- **services/domain/** - Pure business logic
- **services/infrastructure/** - External integrations

---

## ❓ FAQ

### Q: I'm new to this project. Where should I start?
**A:** Read AGENTS.md sections 1-3 (Summary, Architecture, Components). Takes ~20 minutes.

### Q: I need to fix a bug in the search pipeline. Where do I look?
**A:** 
1. Check COMPONENT_MAP.md "Service Dependency Graph"
2. Review AGENTS.md "Data Flow: Search Execution"
3. Examine services/application/search-orchestrator.service.ts

### Q: How do I add a new API endpoint?
**A:** AGENTS.md → "Common Workflows" → "Add API Endpoint" section

### Q: Where's the database schema?
**A:** 
- Complete explanation: AGENTS.md → "Database Schema"
- Visual relationships: COMPONENT_MAP.md → "Data Model Relationships"
- Source file: prisma/schema.prisma

### Q: What are all the environment variables?
**A:** Check .env.example (if exists) or AGENTS.md → "Environment Configuration" section

### Q: How do tests work?
**A:** AGENTS.md → "Testing" section, then check /tests directory

### Q: How is the app deployed?
**A:** AGENTS.md → "Deployment" section and AGENTS.md → "Environment Configuration"

### Q: What's the data flow from user search to results?
**A:** AGENTS.md → "Data Flow: Search Execution" section OR COMPONENT_MAP.md → "Service Dependency Graph"

### Q: How do campaigns work?
**A:** AGENTS.md → "Campaign Execution Flow" section OR COMPONENT_MAP.md → "Campaign Flow"

### Q: What security features are implemented?
**A:** AGENTS.md → "Security Considerations" section

---

## 🛠️ Maintenance

These documents are **living documentation** and should be updated when:
- Architecture changes
- New components are added
- Database schema is modified
- Major workflows change
- New patterns are introduced

**Last Updated:** 2026-06-12  
**Maintained By:** Development Team  
**Repository:** https://github.com/yourusername/Sales-support-tool

---

## 📞 Getting Help

If you can't find something in the documentation:

1. **Search the docs** - Use Ctrl+F in your editor
2. **Check the code** - The source is the truth
3. **Review examples** - Look at existing similar code
4. **Ask the team** - Reach out to other developers
5. **Update the docs** - Add what you learned!

---

**Happy coding! 🚀**
