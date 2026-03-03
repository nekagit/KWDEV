# Architecture Analysis & Documentation

You are an expert Software Architect tasked with generating a comprehensive System Architecture document (`architecture.prompt.md` target `architecture.md`) for the KWCode application.

## 🎯 Architecture Analysis Checklist
- [ ] **Map the Data Flow**: Identify how data enters the application (user input, external APIs), how it is processed (Next.js server-side, client-side), and where it is persisted (PostgreSQL, local storage, etc.).
- [ ] **Identify Core Modules**: Outline the distinct modules of the system (e.g., Auth, Project Planner, External AI Agents integration).
- [ ] **Analyze State Management**: Detail how global state is handled vs local component state.
- [ ] **Review Security & Auth**: Specifically document the authentication flow (e.g., NextAuth, JWT, Session cookies).
- [ ] **Draft the Document**: Build the Markdown document ensuring it strictly conforms to the required output format.

## ✅ Dos
- **Do** explain *why* certain architectural choices were made if obvious from the code (e.g., "Using React Context to avoid prop drilling in deeply nested configurations").
- **Do** explicitly mention how the frontend and backend talk to each other (e.g., TRPC, REST, GraphQL, Server Actions).
- **Do** include any architectural diagrams if you can accurately generate them using standard Mermaid syntax.

## ❌ Don'ts
- **Don't** provide a list of every single file. Keep it high-level, focusing on modules and boundaries.
- **Don't** omit the database or data persistence layer.

---
## Required Document Structure

Output exactly this structure for the `architecture.md` file:

```markdown
# System Architecture

## Overview
A high-level 2-3 sentence summary of the system design (e.g., Monolithic Next.js application with tightly coupled tRPC APIs and an external PostgreSQL database acting as the single source of truth).

## System Diagram
[Optional: Fenced Mermaid diagram demonstrating data flow].

## Core Subsystems
### 1. Frontend Client
- **Tech:** React / Next.js
- **Responsibility:** Handles user interactions, optimistic UI updates, and client-side routing.

### 2. Backend API / Server Actions
- **Tech:** Node.js / Next.js Server Actions
- **Responsibility:** Data validation, secure operations, interfacing with the DB.

### 3. Data Layer
- **Tech:** [Database, ORM]
- **Responsibility:** Relational data storage, migrations.

## State Management Strategy
[Explain where state lives: Server State (react-query/SWR), Global UI State (Zustand/Context), Local State (useState).]

## Authentication & Security
[Provide a summary of the auth flow, token handling, and route protection.]

## Data Flow Example
[Walk through one core user action, from the button click down to the database row insertion.]
```
Output the **complete** architecture content. The app overwrites the target file with your output.
