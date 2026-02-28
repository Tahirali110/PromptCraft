/**
 * lib/zipExport.ts
 * Generates a ZIP archive from OrchestrationResult.
 * Web: triggers browser download. Native: saves to cache + shares.
 */
import JSZip from 'jszip';
import { Platform } from 'react-native';
import type { OrchestrationResult } from './orchestrator';

export const MASTER_PROMPT = `# AI Coding Agent — MVP Build Instructions

You are a senior full-stack engineering team. Your task is to build the MVP described in the attached documents. Follow these instructions exactly.

## Context Documents (all attached)

| File | What it contains |
|------|-----------------|
| 1-Research.md | Market research, competitor analysis, tech landscape, user personas |
| 2-PRD.md | Product requirements, user stories, features, success metrics |
| 3-TechDesign.md | Architecture decisions, tech stack, data model, API design |
| AGENTS.md | Orchestration rules, quality standards, build sequence |

## Your Execution Steps

### Step 1 — Read & Understand (do NOT write code yet)
1. Read ALL four documents completely before writing any code.
2. After reading, output a short summary:
   - Product name and one-line description
   - Target users
   - Core features (from PRD)
   - Chosen tech stack (from TechDesign)
   - Any ambiguities or blockers

### Step 2 — Confirm Before Building
Ask the user: "I have read all documents. Here is my build plan: [your plan]. Should I proceed?"
Wait for confirmation.

### Step 3 — Phase 1: Foundation
1. Scaffold the project using the tech stack in 3-TechDesign.md
2. Set up design tokens, theme, and base layout
3. Configure authentication (if in PRD)
4. Set up database schema and migrations
5. Commit checkpoint: "Phase 1 complete — foundation ready"

### Step 4 — Phase 2: Core Features
For each feature listed in 2-PRD.md (P0 first):
1. **PLAN**: State what you will build, which files change, and acceptance criteria
2. **EXECUTE**: Implement fully — no TODOs, no placeholders
3. **REVIEW**: Self-check against acceptance criteria
4. Commit checkpoint after each feature

### Step 5 — Phase 3: Polish & Launch
1. End-to-end user flow testing
2. Error handling and loading states
3. Mobile responsiveness
4. Performance check (no obvious bottlenecks)
5. Final commit: "MVP complete — ready for launch"

## Non-Negotiable Rules
- No placeholder text ("Lorem ipsum", "TODO", "Coming soon")
- No features beyond what is in the PRD without user approval
- TypeScript strict mode, no \`any\` types
- Every API endpoint must have input validation
- Every error must be handled and shown to the user

## Start Now
Read all attached documents, then output your Step 1 summary.
`;

export async function exportAsZip(result: OrchestrationResult): Promise<void> {
  const zip = new JSZip();

  // Add each step as a Markdown file
  const fileNames = ['1-Research.md', '2-PRD.md', '3-TechDesign.md', 'AGENTS.md'];
  result.steps.forEach((step, i) => {
    zip.file(fileNames[i], step.content);
  });

  // Add master prompt
  zip.file('master_prompt.txt', MASTER_PROMPT);

  const slug = result.idea
    .slice(0, 30)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const fileName = `promptcraft-${slug}-${new Date(result.timestamp).toISOString().slice(0, 10)}.zip`;

  if (Platform.OS === 'web') {
    // Web: generate blob + anchor click
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  } else {
    // Native: generate base64 directly to avoid Blob support issues in some environments
    const base64 = await zip.generateAsync({ type: 'base64' });

    const FileSystemModule = require('expo-file-system/legacy');
    const SharingModule = require('expo-sharing');
    const FileSystem = FileSystemModule.default || FileSystemModule;
    const Sharing = SharingModule.default || SharingModule;

    const path = `${FileSystem.cacheDirectory}${fileName}`;
    if (path) {
      await FileSystem.writeAsStringAsync(path, base64, {
        encoding: 'base64',
      });
    }

    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(path, { mimeType: 'application/zip' });
    } else {
      throw new Error('Sharing is not available on this device.');
    }
  }
}
