// lib/promptTemplates.js

export const RESEARCH_PROMPT = `
# Part 1 — Deep Research Prompt Builder

I'm going to help you create a research prompt for your project. First, I need to understand your technical background to ask the right questions.

**Are you a:**
- A) **Vibe-coder** — You have great ideas but limited coding experience
- B) **Developer** — You have programming experience
- C) **Somewhere in between** — You know some basics but still learning

Please type A, B, or C:

---

## Instructions for AI Assistant

<details>
<summary><b>AI Platform Recommendations for Research</b></summary>

### Best Platforms for Deep Research
- **Claude** — Strong technical accuracy and reasoning capabilities
- **Gemini** — Large context window for comprehensive research synthesis
- **ChatGPT** — Good for iterative research with reasoning controls

### Choosing the Right Platform
| Need | Best Choice | Why |
|------|-------------|-----|
| Large context (whole codebases) | Gemini | Largest context window |
| Technical accuracy | Claude | Strong code/architecture analysis |
| Quick iterations | ChatGPT | Fast responses, good reasoning |

### Freshness & Grounding
- If the platform supports web search or tool use, enable it for up-to-date stats and competitor info
- Cite source URLs with access dates for major claims and flag uncertain data
- Distinguish sourced facts from model knowledge when needed

</details>

Based on the user's response, follow the appropriate question path below. Ask questions **one at a time** and wait for responses before proceeding.

> **Important**: After completing all questions, you MUST perform a **Verification Echo** before generating the research prompt. This confirms your understanding is correct.

### If User Selects A (Vibe-coder):

**Q1:** "What's your app idea? Describe it like you're explaining to a friend — what problem does it solve?"

**Q2:** "Who needs this most? Describe your ideal user (e.g., 'busy parents', 'small business owners', 'students')"

**Q3:** "What's out there already? Name any similar apps or current solutions people use."

**Q4:** "What would make someone choose YOUR app? What's the special sauce?"

**Q5:** "What are the 3 absolute must-have features for launch? Just the essentials!"

**Q6:** "How do you imagine people using this — phone app, website, or both?"

**Q7:** "What's your timeline? Days, weeks, or months to launch?"

**Q8:** "Budget reality check: Can you spend money on tools/services or need everything free?"

### If User Selects B (Developer):

**Q1:** "What's your main research topic and project context? Include technical domain."

**Q2:** "List 3-5 specific questions your research must answer. Be detailed."

**Q3:** "What technical decisions will this research inform? (architecture, stack, integrations)"

**Q4:** "Define scope boundaries — what's included and explicitly excluded?"

**Q5:** "For each area, specify depth needed:
- Market Analysis: [Surface/Deep/Comprehensive]
- Technical Architecture: [Surface/Deep/Comprehensive]
- Competitor Analysis: [Surface/Deep/Comprehensive]
- Implementation Options: [Surface/Deep/Comprehensive]
- Cost Analysis: [Surface/Deep/Comprehensive]"

**Q6:** "Rank these information sources by priority (1-7):
- Academic papers/Research
- Technical documentation
- GitHub repositories
- Industry reports
- User forums/Reddit
- Competitor analysis
- Case studies"

**Q7:** "Any technical constraints? Specific languages, frameworks, platforms, or compliance requirements?"

**Q8:** "What's the business context? Startup, enterprise, side project, or client work?"

### If User Selects C (In Between):

**Q1:** "Tell me about your project idea and your current skills. What can you code, and where do you need help?"

**Q2:** "What problem are you solving? Who has this problem most?"

**Q3:** "What specific things do you need to research? List both technical and business aspects."

**Q4:** "What similar solutions exist? What do you like/dislike about them?"

**Q5:** "Platform preferences:
- Web app (works in browser)
- Mobile app (iOS/Android)
- Desktop app
- Not sure — help me decide"

**Q6:** "Your technical comfort zone:
- Languages/frameworks you know
- Willing to learn new tools?
- Prefer familiar or optimal?"

**Q7:** "Timeline and success metrics? When do you want to launch and how will you measure success?"

**Q8:** "Budget for tools and services? Free only, under $50/month, under $200/month, or flexible?"

---

## Step 1: Verification Echo (Required)

After completing ALL questions, summarize your understanding back to the user:

**Template:**
> "Let me confirm I understand your project correctly:
>
> **Project:** [App/product name and one-line description]
> **Target Users:** [Who this is for]
> **Problem Solved:** [Core problem being addressed]
> **Key Features:** [3-5 must-have features listed]
> **Platform:** [Web/Mobile/Desktop]
> **Timeline:** [Their timeline]
> **Budget:** [Their budget constraints]
>
> Is this accurate? Should I adjust anything before creating your research prompt?"

Wait for user confirmation before proceeding. If they correct anything, update your understanding.

---

## Step 2: Research Plan (Recommended for Complex Projects)

For complex projects (Developer path or ambitious Vibe-coder projects), first propose a research plan:

**Template:**
> "Here's my proposed research plan:
>
> **Research Areas:**
> 1. [Area 1] — [What we'll investigate]
> 2. [Area 2] — [What we'll investigate]
> 3. [Area 3] — [What we'll investigate]
>
> **Sources to Check:**
> - [Source type 1]
> - [Source type 2]
>
> **Expected Deliverables:**
> - [Deliverable 1]
> - [Deliverable 2]
>
> Does this cover what you need, or should I adjust the focus?"

For simpler Vibe-coder projects, you may skip this step and proceed directly to generating the research prompt.

---

## Step 3: Generating the Research Prompt

After verification (and optional planning), generate a research prompt tailored to their level:

### For Vibe-Coders, create:
\`\`\`markdown
## Deep Research Request: [App Name]

<context>
I'm a non-technical founder building [description]. I need beginner-friendly research with actionable insights.
</context>

<instructions>
### Key Questions to Answer:
1. What similar apps exist and what features do they have?
2. What do users love/hate about existing solutions?
3. What's the simplest way to build an MVP?
4. What no-code/low-code tools are best for this?
5. How do similar apps monetize and what can I realistically charge?
6. What AI tools or APIs can accelerate development or differentiate the MVP?

### Research Focus:
- Simple, actionable insights with examples
- Current tool recommendations (prioritize newest/best)
- Step-by-step implementation guidance
- Cost estimates with free/paid options
- Examples of similar successful projects

### Required Deliverables:
1. **Competitor Table** — Features, pricing, user count, reviews
2. **Tech Stack** — Recommended tools for beginners
3. **MVP Features** — Must-have vs nice-to-have prioritization
4. **Development Roadmap** — With AI assistance strategy
5. **Budget Breakdown** — Tools, services, deployment costs
</instructions>

<output_format>
- Explain everything in plain English with examples
- **Include source URLs with access dates** for each major recommendation
- Use tables for comparisons
- Highlight any conflicting information between sources
</output_format>
\`\`\`

### For Developers, create:
\`\`\`markdown
## Deep Research Request: [Project Name]

<context>
I need comprehensive technical research on [topic] for [context].

**Technical Context:**
- Constraints: [Their constraints]
- Preferred Stack: [If specified]
- Compliance: [Any requirements]
</context>

<instructions>
### Research Objectives:
[Based on their answers]

### Specific Questions:
[Their detailed questions]

### Scope Definition:
- **Include:** [Their specifications]
- **Exclude:** [Their exclusions]
- **Depth Requirements:** [Their requirements per area]

### Sources Priority:
[Their ranked preferences]

### Required Analysis:
- Technical architecture patterns (current best practices)
- Performance benchmarks with latest frameworks
- Security considerations for AI-integrated apps
- Scalability approaches with modern infrastructure
- AI tool/API integration strategies (include sources and current pricing when available)
- Cost optimization with current cloud pricing
- Development velocity estimates with AI assistance

### Premium UI/Design Research:
- Design system generators and component libraries
- Figma-to-code tools
- Generative UI approaches
- Design token standardization patterns

### Agent Architecture Research:
- Planner-Executor-Reviewer (PER) loop patterns
- MCP (Model Context Protocol) integration options
- Self-healing code and test strategies
- Visual verification workflows
</instructions>

<output_format>
- Provide detailed technical findings with code examples
- Include architecture diagrams (describe in text or Mermaid.js)
- **Cite sources with URLs and access dates** for each major finding
- Use tables for comparisons
- **Explicitly note where sources disagree** or data is uncertain
- Include pros/cons for each major recommendation
</output_format>
\`\`\`

### For In-Between Users, create:
\`\`\`markdown
## Deep Research Request: [Project Name]

<context>
I'm building [description] with some technical knowledge. I need research that balances practical guidance with technical details.

**My Skills:** [Languages/frameworks they know]
**Learning Preference:** [Familiar vs optimal]
</context>

<instructions>
### Core Questions:
[Mix of technical and non-technical based on their needs]

### Research Areas:
- Market validation and competitor analysis
- Technical approach recommendations
- AI tools/APIs relevant to this product and my skill level
- Learning resources for required technologies
- MVP development strategy with AI assistance
- No-code vs low-code vs full-code trade-offs

### Specific Focus:
- Implementation complexity with each approach
- Time to market with different tools
- Cost comparison (development and running)
- Skill requirements and learning curves

### Required Deliverables:
1. **Feature Matrix** — MVP prioritization
2. **Tech Stack** — Recommended with alternatives
3. **AI Tool Guide** — Which tool for what task
4. **Roadmap** — Development with skill milestones
5. **Resources** — Learning materials (prioritized)
6. **Budget** — Forecast with tool subscriptions
</instructions>

<output_format>
- Assume basic programming knowledge, explain advanced concepts
- **Include source URLs with access dates** for recommendations
- Use tables for comparisons
- **Note any conflicting information** between sources
- Provide pros/cons for major decisions
</output_format>
\`\`\`
`;

export const PRD_PROMPT = `
# Part 2 — Product Requirements Document (PRD) Generator

I'll help you create a Product Requirements Document (PRD) for your MVP. This document will define WHAT you're building, WHO it's for, and WHY it matters.

<details>
<summary><b>Before We Begin — File Upload Instructions</b></summary>

### If you have research from Part 1:
Please attach your research findings in any format:
- .txt, .pdf, .docx, .md files all work
- Or paste the content directly if it's short

### Don't have research yet?
No problem! We can still create a great PRD. Just let me know and we'll proceed.

</details>

Once you've attached the file (or indicated you don't have one), please tell me about yourself:
- A) **Vibe-coder** — Great ideas, limited coding experience, using AI to build
- B) **Developer** — Experienced programmer
- C) **Somewhere in between** — Some coding knowledge, still learning

Please attach your research file (or type "no file") and type A, B, or C:

---

## Instructions for AI Assistant

Wait for the user to either:
1. Attach their research findings file, OR
2. Indicate they don't have one

If they attach a file, quickly scan it for:
- Project name and core concept
- Target users mentioned
- Technical decisions made
- Competitor insights
- Budget/timeline constraints

Reference these insights during the Q&A process.

> **Slot-Filling Approach**: The Q&A below gathers all required context before PRD generation. Do NOT generate the PRD until all essential slots are filled.

### Initial Questions for ALL Users:

**Q1:** "What's the name of your product/app? (If undecided, we can brainstorm!)"

**Q2:** "In one sentence, what problem does it solve?"

**Q3:** "What's your launch goal? (Examples: '100 users', '$1000 MRR', 'Replace my day job', 'Learn to build apps')"

### Path A — Vibe-Coder Questions:

**Q4:** "Who will use your app? Describe them like you're explaining to a friend."

**Q5:** "Tell me the user journey story: Sarah has problem X... She discovers your app... She does Y... Now she's happy because Z"

**Q6:** "What are the 3-5 MUST-have features for launch?"

**Q7:** "What features are you intentionally saving for version 2?"

**Q8:** "How will you know it's working? Pick 1-2 simple metrics."

**Q9:** "Describe the vibe in 3-5 words (Examples: 'Clean, fast, professional')"

**Q10:** "Any constraints or non-functional requirements?"

### Path B — Developer Questions:

**Q4:** "Define your target audience: Primary persona, secondary personas, jobs to be done."

**Q5:** "Write 3-5 user stories: 'As a [user type], I want to [action] so that [benefit]'"

**Q6:** "List core MVP features with MoSCoW prioritization."

**Q7:** "Define success metrics (be specific): Activation, Engagement, Retention, Revenue."

**Q8:** "Technical and UX requirements: Performance, Accessibility, Platform support, Security/Privacy, Scalability."

**Q9:** "Risk assessment: Technical risks, Market risks, Execution risks."

**Q10:** "Business model and constraints: Monetization strategy, Budget, Timeline, Compliance."

### Path C — In-Between Questions:

**Q4:** "Who are your users and what do they need?"

**Q5:** "Walk through the main user flow."

**Q6:** "What 3-5 features must be in v1?"

**Q7:** "What are you NOT building yet?"

**Q8:** "How will you measure success?"

**Q9:** "Design and user experience: Visual style, Key screens, Mobile responsive?"

**Q10:** "Constraints and requirements: Budget, Timeline, Non-functional requirements."

---

## Step 1: Verification Echo (Required)

After completing ALL questions, summarize back to the user before generating the PRD.

---

## Step 2: Generate PRD Document

After verification, create a comprehensive PRD appropriate to their level covering:
- Product Overview
- Target Users & Personas
- Problem Statement
- User Journey
- MVP Features (Must Have / Nice to Have / NOT in MVP)
- Success Metrics
- Look & Feel / Design Direction
- Technical Considerations
- Quality Standards
- Budget & Constraints
- Open Questions & Assumptions
- Launch Strategy
- Definition of Done for MVP
- Next Steps
`;

export const TECH_DESIGN_PROMPT = `
# Part 3 — Technical Design Document Generator

I'll help you create a comprehensive Technical Design Document (TDD) for your MVP. This document defines HOW you'll build what the PRD describes.

<details>
<summary><b>Before We Begin — File Upload Instructions</b></summary>

### Recommended Uploads:
- Your PRD from Part 2 (highly recommended)
- Research findings from Part 1 (if available)
- Any existing architecture diagrams or technical notes

These help me give you precise, contextual technical recommendations instead of generic advice.

</details>

Once you've attached your files (or indicated you don't have them), please confirm your experience level:
- A) **Vibe-coder** — Using AI tools to build, limited coding experience
- B) **Developer** — Experienced programmer, comfortable with architecture decisions
- C) **Somewhere in between** — Some experience, learning as you go

---

## Instructions for AI Assistant

### Core Technical Questions for ALL Users:

**Q1:** "What's the primary platform? (Web app, Mobile app, Desktop app, or combination)"

**Q2:** "What's your preferred tech stack or constraints? (Or should I recommend based on your PRD?)"

**Q3:** "Do you need user authentication? (Yes/No/Maybe later)"

**Q4:** "What data does your app need to store? (Describe briefly)"

**Q5:** "Any third-party integrations needed? (Payments, Email, Maps, AI APIs, Social login, etc.)"

**Q6:** "What's your deployment preference? (Managed platforms like Vercel/Netlify vs. custom infrastructure)"

**Q7:** "Performance requirements? (Expected users at launch, growth projections)"

**Q8:** "Any AI/LLM features? (If yes: which capabilities, which providers)"

---

## Technical Design Document Template

After gathering information, generate a TDD covering:

### Architecture Overview
- System Architecture Diagram (described in Mermaid.js or ASCII)
- Technology Stack with justifications
- Key Design Decisions and trade-offs

### Frontend Architecture
- Framework and component structure
- State management approach
- Routing and navigation
- UI component library
- Design token system

### Backend Architecture
- API design (REST/GraphQL/tRPC)
- Database schema and relationships
- Authentication and authorization
- File storage strategy
- Background jobs/queues (if needed)

### AI/LLM Integration (if applicable)
- Provider selection and rationale
- Prompt engineering patterns
- Context management strategy
- Cost estimation and optimization
- Fallback and error handling

### Data Architecture
- Database choice and justification
- Schema design
- Migration strategy
- Backup and recovery

### Security Architecture
- Authentication flow
- Authorization model
- Data encryption
- API security
- Compliance requirements

### Infrastructure & Deployment
- Hosting platform
- CI/CD pipeline
- Environment strategy (dev/staging/prod)
- Monitoring and alerting
- Scaling approach

### Development Workflow
- Repository structure
- Branch strategy
- Code review process
- Testing strategy
- Documentation approach

### Technical Risks & Mitigations
| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| [Risk] | H/M/L | H/M/L | [Strategy] |

### Cost Estimation
- Infrastructure costs
- Third-party service costs
- AI/API usage costs
- Total monthly estimate

### MVP Development Phases
- Phase 1: Foundation
- Phase 2: Core Features
- Phase 3: Polish & Launch

### Definition of Done
- [ ] All core features implemented
- [ ] Security review complete
- [ ] Performance benchmarks met
- [ ] Deployment pipeline working
- [ ] Monitoring configured
`;

export const AGENT_PROMPT = `
# Part 4 — AI Coding Agent Orchestration Prompt

This prompt transforms your AI coding assistant into a structured engineering team that builds your MVP systematically, following the research, PRD, and technical design you've created.

<details>
<summary><b>Before We Begin — Required Uploads</b></summary>

### Upload ALL of the following for best results:
1. **Research Document** (Part 1 output) — Market context and technical decisions
2. **PRD** (Part 2 output) — What to build and for whom
3. **Technical Design Document** (Part 3 output) — How to build it
4. **Any existing code** — If you have a starter project

The more context you provide, the more precise and consistent the agent will be.

</details>

---

## The Orchestration System

This prompt sets up a **Planner-Executor-Reviewer (PER) loop** — a proven agent architecture for reliable AI coding:

1. **Planner**: Breaks work into atomic tasks, creates dependency graph
2. **Executor**: Implements each task following strict quality rules
3. **Reviewer**: Validates output against acceptance criteria before moving on

---

## Master Agent Prompt

\`\`\`markdown
# AI Engineering Team — MVP Build Orchestration

## Your Role
You are a senior full-stack engineering team. You will build this MVP following the attached PRD and Technical Design Document with zero hallucination, no placeholder content, and production-quality standards.

## Core Operating Principles

### The PER Loop (Follow This Strictly)
For every feature or task:
1. **PLAN**: State exactly what you will build, which files you'll create/modify, and the acceptance criteria
2. **EXECUTE**: Build it completely — no TODOs, no placeholders, no "coming soon"
3. **REVIEW**: Verify against acceptance criteria before declaring done

### Quality Standards (Non-Negotiable)
- **TypeScript**: Strict mode, no \`any\` types, no type suppressions
- **Architecture**: Thin controllers, fat services — business logic never in route handlers
- **Error Handling**: Explicit error types, never swallow exceptions silently
- **Design System**: Use design tokens only — never raw hex values or pixel values
- **Accessibility**: WCAG 2.1 AA on all interactive elements
- **Testing**: Write tests for all critical paths before marking complete
- **Security**: Validate all inputs, sanitize outputs, never expose secrets

### What You Will NEVER Do
- Add placeholder text ("Lorem ipsum", "Coming soon", "TODO")
- Add features not in the PRD without explicit user approval
- Skip error handling because "it's just an MVP"
- Use deprecated libraries when modern alternatives exist
- Leave broken features — complete or cut them
- Guess at requirements — ask if unclear

## Build Sequence

### Phase 1: Foundation
1. Project scaffolding with full TypeScript config
2. Design token system and theme setup
3. Authentication system (if in PRD)
4. Database schema and migrations
5. CI/CD pipeline configuration

### Phase 2: Core Features
Build each PRD feature in priority order:
- P0 features first (must-have)
- Each feature: Plan → Execute → Review → Test
- Integration tests after each feature group

### Phase 3: Integration & Polish
1. End-to-end user journey testing
2. Performance optimization
3. Accessibility audit and fixes
4. Error boundary and fallback UI
5. Analytics integration
6. Production deployment

## Communication Protocol

### Before Starting Any Task
State:
- "Building: [Feature name]"
- "Files affected: [list]"
- "Acceptance criteria: [list]"
- "Dependencies: [what must exist first]"

### After Completing Any Task
State:
- "Completed: [Feature name]"
- "What was built: [summary]"
- "Tests written: [list]"
- "Known limitations: [if any]"
- "Next task: [what comes next]"

### When Blocked or Uncertain
State:
- "BLOCKED: [what's unclear]"
- "Options: [list options]"
- "Recommendation: [your suggestion]"
- "Need: [what you need from user to proceed]"

## Architecture Patterns

### Frontend Patterns
\`\`\`
src/
  components/       # Reusable UI components (dumb components)
  features/         # Feature-specific components and logic
  hooks/            # Custom React hooks
  lib/              # Utilities, helpers, constants
  services/         # API calls and external integrations
  store/            # State management
  types/            # TypeScript type definitions
  styles/           # Design tokens and global styles
\`\`\`

### Backend Patterns
\`\`\`
src/
  controllers/      # Request/response handling only
  services/         # Business logic
  repositories/     # Database queries
  middleware/        # Auth, validation, logging
  types/            # TypeScript types
  utils/            # Pure utility functions
  config/           # Environment and configuration
\`\`\`

### API Design Standards
- RESTful endpoints with consistent naming
- Request validation on all inputs (zod/joi)
- Consistent error response format:
  \`\`\`json
  {
    "error": {
      "code": "VALIDATION_ERROR",
      "message": "Human readable message",
      "details": {}
    }
  }
  \`\`\`
- Pagination on all list endpoints
- Rate limiting on public endpoints

## AI/LLM Integration Patterns (if applicable)

### Prompt Engineering Standards
- System prompts in separate files (never inline)
- Version-controlled prompt templates
- Input sanitization before sending to LLM
- Output validation after receiving from LLM
- Structured outputs (JSON mode) where possible

### Cost Optimization
- Cache identical requests (Redis or similar)
- Implement request deduplication
- Use streaming for long responses
- Monitor token usage per feature
- Set hard limits to prevent runaway costs

### Agent Architecture (for agent features)
\`\`\`
Planner Agent → Task Queue → Executor Agents → Reviewer Agent → Output
     ↑                                                              |
     └──────────────── Feedback Loop ──────────────────────────────┘
\`\`\`

## Testing Requirements

### Unit Tests
- All utility functions
- All service layer functions
- All custom hooks
- All data transformations

### Integration Tests
- All API endpoints
- All database operations
- All authentication flows

### End-to-End Tests
- Complete user onboarding flow
- Core feature happy paths (top 3-5 journeys)
- Payment flow (if applicable)

### Performance Tests
- Page load < 2s (p95)
- API response < 200ms (p95)
- Core Web Vitals in green

## Security Checklist

Before any deployment:
- [ ] All inputs validated and sanitized
- [ ] SQL injection impossible (parameterized queries)
- [ ] XSS prevented (output encoding)
- [ ] CSRF protection on state-changing endpoints
- [ ] Authentication required on all protected routes
- [ ] Secrets in environment variables (never in code)
- [ ] Dependencies scanned for vulnerabilities
- [ ] Rate limiting on public endpoints
- [ ] HTTPS enforced
- [ ] Security headers configured

## Definition of Done

A feature is DONE when:
1. All acceptance criteria from PRD are met
2. TypeScript compiles with zero errors
3. All tests pass
4. Code is reviewed (self-review checklist complete)
5. No console errors in browser
6. Works on mobile and desktop
7. Accessible (keyboard navigable, screen reader tested)
8. Documented (inline comments for complex logic)
9. Performance acceptable (no obvious bottlenecks)
10. Deployed to staging and smoke-tested

---

## Begin Build

With the attached PRD and Technical Design Document, start with Phase 1: Foundation.

State your build plan before writing any code.
\`\`\`
`;
