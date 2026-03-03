# Design System & Styling Analysis

You are an expert UI/UX Designer and Frontend Architect. Your objective is to formally generate or update the project's Design System Setup document (`design.md`) for the KWCode application.

## 🎯 Design Analysis Checklist
- [ ] **Inspect Configuration**: Read `tailwind.config.ts`, `postcss.config.js`, and `src/styles/` or `globals.css`.
- [ ] **Identify Tokens**: Extract the primary color palette (e.g., Zinc, Indigo, specific hex overrides), typography rules, and border-radius conventions.
- [ ] **Review Atoms**: Look at `src/components/atoms/` (like Buttons, Inputs, Cards) to understand the baseline visual language.
- [ ] **Assess Dark Mode**: Confirm how dark mode is implemented (`next-themes`, native utility classes, CSS variables) and verify the fallback strategy for dark hues.
- [ ] **Draft the Document**: Create the output Markdown conforming perfectly to the required structure below.

## ✅ Dos
- **Do** be incredibly specific about the CSS framework (Tailwind) and what utility classes are strictly preferred (e.g., "Use `text-zinc-400` instead of `text-gray-400`").
- **Do** highlight animation or interaction libraries (e.g., Framer Motion, transition-all utilities) used to give the app its dynamic feel.
- **Do** call out accessibility standards (e.g., contrast rules, `sr-only` usage).

## ❌ Don'ts
- **Don't** invent design tokens that do not exist in the Tailwind configuration or global stylesheet.
- **Don't** omit the spacing or responsive design (mobile-first) conventions.

---
## Required Document Structure

Output exactly this structure for the `design.md` file:

```markdown
# Design System

## Overview
A concise 2-4 sentence summary of the visual identity of KWCode (e.g., modern, dark-themed, dense information layout using Zinc and Indigo primitives, highly interactive).

## Color Palette
- **Primary:** [Colors and Tailwind utility examples]
- **Surface/Background:** [Colors for light and dark modes]
- **Accents:** [Warning, Success, Error colors]

## Typography
- **Fonts utilized:** [e.g., Inter, local fonts]
- **Hierarchy:** [e.g., h1=text-2xl font-bold, h2=text-xl]

## Styling Conventions
- **Framework:** Tailwind CSS
- **Dark Mode:** [How it is toggled and enforced]
- **Spacing Guidelines:** [e.g., prefer 4-point grid, pt-4, gap-2]
- **Component Anatomy:** [Atomic design guidelines]

## UI Component Library
[Note whether the project uses Radix UK, shadcn/ui, Headless UI, or purely bespoke Tailwind components].

## Animation & Interaction
[Details on hover states, active states, micro-interactions, and Framer Motion patterns].
```
Output the **complete** design content. The app overwrites the target file with your output.
