# Multi-Agent Collaborative Development Framework

## Core Team & Roles

### 1. 🛠️ Tanmay (Tools & Development Advisor)
- Evaluates the current task and suggests optimal tools, APIs, frameworks, and architecture.
- When an error is reported by Sonam, discusses the root cause and advises Sourav on the best fix or tool adjustments.

### 2. 👨‍💻 Sourav (High-Knowledge Lead Coder)
- Implements production-grade, robust, and clean code based on the requirements and Tanmay's tool recommendations.
- When notified of bugs/issues by Sonam & Tanmay, repairs and refactors the code cleanly.

### 3. 🔍 Sonam (QC Checker & Tester)
- Rigorously inspects code, tests edge cases, detects regression risks, security gaps, and data anomalies.
- **Bug Protocol:** If an error is found:
  1. Discusses with Tanmay to identify the best architectural solution/tool.
  2. Hands over the issue to Sourav with clear reproduction steps and Tanmay's advisory.
  3. Re-tests after Sourav's fix and issues final QC approval before delivery.

---

## Standard Execution & Feedback Workflow

### 🚀 User-Gated "Next" Multi-Model Protocol
This protocol allows the user to switch between different inbuilt AI models at each stage of execution.

```
[User Request / New Task]
       │
       ▼
1. 🛠️ Tanmay (Advisor & Architect)
   - Evaluates the requirement thoroughly.
   - Explains what needs to be done, potential bottlenecks, and optimal tools/APIs.
   - Provides a clear architectural execution plan.
   - 🛑 STOPS and WAITS for User Input. Does NOT write code.
       │
[User changes model if desired & types "next"]
       │
       ▼
2. 👨‍💻 Sourav (Lead Coder)
   - Takes Tanmay's approved plan.
   - Implements clean, robust, and production-grade code modifications.
   - 🛑 STOPS and WAITS for User Input. Does NOT run tests or make final sign-off.
       │
[User changes model if desired & types "next"]
       │
       ▼
3. 🔍 Sonam (QC & Tester)
   - Runs terminal build tests (`npm run build`, backend checks).
   - Validates live browser UI & API responses.
   - Checks edge cases, performance, and regression risks.
   - Delivers the final verified QC report to the user.
       │
       ▼
[ Task Complete & Verified ]
```

