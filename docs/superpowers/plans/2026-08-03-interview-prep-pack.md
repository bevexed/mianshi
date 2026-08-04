# 2026-08-04 Interview Prep Pack Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a date-scoped, four-hour interview preparation pack and post-interview review for the 2026-08-04 full-stack interview.

**Architecture:** Keep every deliverable inside `面试冲刺/2026-08-04/`. Separate orientation, project evidence, technical answers, rehearsal, final checks, and the post-interview review into focused Markdown files; link to existing knowledge-base articles instead of duplicating long tutorials.

**Tech Stack:** Markdown, repository-relative links, shell-based structural and link validation.

## Global Constraints

- Output directory: `面试冲刺/2026-08-04/` at the repository root.
- Do not modify existing topic articles or the user's unrelated working-tree changes.
- Do not invent project scale, performance metrics, responsibilities, or production experience.
- Mark unverified personal facts as `【需本人确认】`.
- Prioritize Vue, TypeScript, NestJS, MySQL, Redis, MongoDB selection, AI API integration, and routine Web security.
- Keep Java limited to honest capability boundaries and a transition back to the NestJS strength area.
- Stop introducing new material after 15:00 on interview day.

---

### Task 1: Orientation and Opening Answers

**Files:**
- Create: `面试冲刺/2026-08-04/00-先看这里.md`
- Create: `面试冲刺/2026-08-04/01-岗位画像与应对策略.md`
- Create: `面试冲刺/2026-08-04/02-自我介绍.md`

**Interfaces:**
- Consumes: Confirmed interview time, role emphasis, and candidate capability boundaries from the design spec.
- Produces: The master four-hour schedule and the positioning language referenced by later rehearsal files.

- [ ] **Step 1: Create the directory and write the master schedule**

Write a 260-minute plan: 40 minutes positioning, 70 minutes projects, 70 minutes technical answers, 50 minutes mock interview, and 30 minutes targeted repair/checks. State that any overflow must come from reading depth, not sleep or the final pre-interview buffer.

- [ ] **Step 2: Write the role map**

Include confirmed strengths, likely risks, answer order, topics not to volunteer, and the one-sentence positioning: mature front-end delivery plus demonstrated Node.js back-end and deployment ownership.

- [ ] **Step 3: Write 30-second and 60-second introductions**

Both versions must distinguish mature front-end experience from developing full-stack depth, mention the NestJS task system, and avoid claiming mature Java or MongoDB production ownership.

- [ ] **Step 4: Run structural checks for Task 1**

Run:

```bash
test -s '面试冲刺/2026-08-04/00-先看这里.md'
test -s '面试冲刺/2026-08-04/01-岗位画像与应对策略.md'
test -s '面试冲刺/2026-08-04/02-自我介绍.md'
```

Expected: all commands exit 0.

### Task 2: Project Evidence and Pressure Questions

**Files:**
- Create: `面试冲刺/2026-08-04/03-NestJS采集项目主线.md`
- Create: `面试冲刺/2026-08-04/04-前端项目备选故事.md`
- Create: `面试冲刺/2026-08-04/06-短板与高压问题.md`

**Interfaces:**
- Consumes: Positioning and introductions from Task 1; personal-project evidence already present under `98-项目深挖/`.
- Produces: Rehearsal-ready project narratives and boundary answers used by the mock interview.

- [ ] **Step 1: Write the NestJS project narrative**

Cover background, personal responsibility, queue choice, idempotency, retry, resume, concurrency, database checkpointing, observability, trade-offs, and follow-up questions. Use `【需本人确认】` for any unverifiable result or ownership detail.

- [ ] **Step 2: Write two front-end backup stories**

Use the Next.js platform as the primary backup and a complex front-end/engineering example as the secondary backup. Each story must include a 60-second answer, likely follow-ups, and a list of facts to verify before speaking.

- [ ] **Step 3: Write gap and pressure answers**

Cover MongoDB, Express/Koa, Java, security scope, AI API experience, the shift toward full stack, eight years versus a three-to-five-year role, job-change motivation, and an unknown-technology answer template.

- [ ] **Step 4: Run factual-boundary checks**

Run:

```bash
rg -n '【需本人确认】|MongoDB|Java|Koa|全栈|8 年' '面试冲刺/2026-08-04/'
```

Expected: matches appear in the relevant project or pressure-answer files; no invented numeric result is introduced.

### Task 3: Technical Answer Deck and Shortest Reading Index

**Files:**
- Create: `面试冲刺/2026-08-04/05-核心技术速答.md`
- Create: `面试冲刺/2026-08-04/09-知识库最短索引.md`

**Interfaces:**
- Consumes: Existing Vue, TypeScript, NestJS, database, security, AI, performance, and project-deep-dive articles.
- Produces: Concise spoken answers and a verified reading route used during the 70-minute technical block.

- [ ] **Step 1: Write spoken-answer cards**

For each topic, lead with a 20-to-40-second answer and follow with at most three likely follow-ups. Cover Vue 3 reactivity and Composition API, TypeScript engineering, NestJS request lifecycle and DI, BullMQ reliability, MySQL indexes/transactions, Redis cache/locks, MongoDB selection, AI streaming and safety, Web security, performance, and deployment troubleshooting.

- [ ] **Step 2: Write the shortest reading index**

Group links into “must read”, “read only if stuck”, and “skip tomorrow”. Use paths that resolve from `面试冲刺/2026-08-04/` to existing repository files.

- [ ] **Step 3: Validate local Markdown links**

Run a small read-only script that extracts non-HTTP Markdown links from all date-scoped interview Markdown files, strips anchors, URL-decodes paths, resolves them relative to each source file, and fails if any target does not exist.

Expected: prints `all local links exist` and exits 0.

### Task 4: Mock Interview and Final Checklist

**Files:**
- Create: `面试冲刺/2026-08-04/07-模拟面试.md`
- Create: `面试冲刺/2026-08-04/08-反问薪资与检查清单.md`
- Create: `面试冲刺/2026-08-04/10-本次面试复盘.md`
- Create: `面试冲刺/2026-08-04/练习记录.md`

**Interfaces:**
- Consumes: Opening answers, project narratives, technical cards, and boundary language from Tasks 1-3.
- Produces: A complete 50-minute rehearsal sequence and the final interview-day control sheet.

- [ ] **Step 1: Write a realistic mock sequence**

Organize questions in interview order: introduction, project depth, Vue/TypeScript, NestJS/queue, database, AI, security/performance, pressure questions, and candidate questions. Put reference points under collapsible `<details>` blocks so the candidate answers before reading.

- [ ] **Step 2: Write the final control sheet**

Include interviewer questions, the 25K-28K salary range with total-package caveats, equipment/network checks, water and notifications, a 15:00 stop-learning rule, and a three-minute breathing reset.

- [ ] **Step 3: Write the rehearsal record**

Provide checkboxes for two introduction repetitions, two project repetitions, one mock interview, the three most blocked questions, factual confirmations, and the final one-page review.

- [ ] **Step 4: Record the post-interview review**

Separate confirmed in-interview answers from answers researched afterward. Record the actual technical questions, the resume-stability risk, concise next-time answers, and any facts that still require personal confirmation.

- [ ] **Step 5: Verify the complete pack**

Run:

```bash
find '面试冲刺/2026-08-04' -maxdepth 1 -type f -name '*.md' | sort
rg -n '待补全文|未完成答案|临时占位符' '面试冲刺/2026-08-04' || true
git diff --check
git status --short
```

Expected: exactly 12 Markdown files; no accidental placeholder tokens; no whitespace errors; only the intended date-scoped directory plus pre-existing user changes remain uncommitted.
