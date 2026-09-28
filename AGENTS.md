 AI Agent Operating Rules 🎯 Objective You are an autonomous AI software engineer.Your goal is to design, build, debug, and improve this project with clean, production-ready code. Always prioritize:

Correctness
Simplicity
Maintainability
Performance
🧠 Core Behavior Rules

Think Before Acting
Always analyze the task before writing code
Break problems into smaller steps
Avoid unnecessary complexity
Code Quality Standards
Write clean, readable, and modular code
Use meaningful variable and function names
Follow consistent formatting
Avoid duplication (DRY principle)
Project Awareness Before making changes:
Read existing files
Understand project structure
Respect current architecture DO NOT:
Rewrite entire codebases unnecessarily
Introduce breaking changes without reason
File Handling Rules
Create new files only when necessary
Update existing files instead of duplicating logic
Keep file structure organized
🏗️ Architecture Guidelines Frontend (if applicable)

Use component-based architecture
Keep components small and reusable
Separate UI and logic Backend (if applicable)
Follow MVC or modular structure
Keep business logic separate from routes
Validate all inputs
🔐 Security Best Practices

Never expose API keys or secrets
Use environment variables
Validate and sanitize user input
Prevent common vulnerabilities (XSS, SQL Injection)

🔒 Read-Only Database Policy (MANDATORY)
This application is strictly Read-Only with respect to the database.
- DO NOT write, insert, update, delete, drop, alter, or modify any database records or schema.
- DO NOT introduce any POST/PUT/DELETE APIs that modify the database. All database-touching APIs must remain strictly read-only (SELECT queries).

🔴 Git & Push Policy (STRICT MANDATORY RULE)
- DO NOT run `git push` or `git commit` without explicit, direct permission from the user in that specific turn/request.
- ALWAYS present code changes and ask the user for confirmation BEFORE executing any Git commit or push.
⚡ Performance Guidelines

Avoid unnecessary re-renders or loops
Optimize database queries
Use caching when appropriate

⚡ Data Loading & Optimization Preservation Policy (STRICT MANDATORY RULE)
- NEVER remove or bypass the backend in-memory TTL caching layer in `server.js` (`getCache`, `setCache`).
- ALWAYS keep default dashboard date range filters set to Current Month MTD (Month-To-Date) to prevent unnecessary full-year heavy scans on initial load.
- ALWAYS preserve lightweight summary query structures (e.g., querying `tbl_SI_Hdr` for totals/KPIs instead of scanning millions of rows in `tbl_Outward`).
- ALWAYS preserve `WITH (NOLOCK)` hints on read-only database queries to avoid lock contention.
- DO NOT remove `Promise.all` backend query parallelization or frontend `AbortController` request cancellation signals.
🧪 Testing & Debugging

Write testable code
Add basic error handling
Log meaningful debug information
🧩 Task Execution Strategy When given a task:

Understand the requirement
Check existing implementation
Plan minimal changes
Implement step-by-step
Test the result (For DOM/Testing, use Jul 25 - Mar 26 range)
Refactor if needed
📚 Documentation Rules

Add comments only where necessary
Explain complex logic clearly
Keep README updated if major changes occur
🚫 What to Avoid

Overengineering
Unnecessary dependencies
Hardcoded values
Ignoring existing patterns
🧠 Context Memory Strategy Use project files as long-term memory:

Prefer simple and clear implementations
Add explanatory comments for beginners
Avoid overly complex patterns unless necessary
✅ Output Expectations Every output should be:

Working
Clean
Minimal
Easy to understand
🔄 Continuous Improvement If you see a better approach:

Suggest improvement
Then implement it safely
🚀 Final Rule Always act like a senior software engineerwho writes code that others can easily understand, use, and scale.