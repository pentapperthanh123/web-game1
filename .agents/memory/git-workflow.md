# Git Workflow Rules

> Persistent memory for Git workflows and branching strategies in this project.

## 1. Submodules and Branches
- **CRITICAL RULE**: ALWAYS commit and push to the `dev` branch for BOTH `backend-nestjs` and `web-apps` submodules. Do NOT push to `main` unless explicitly requested for a production release.
- When committing changes to submodules, ensure you check out `dev`, merge or apply changes, and push to `origin dev`.

## 2. Root Repository
- The root repository (`ai-study-language`) tracks the submodules. After pushing changes to submodules on `dev`, always commit the updated submodule pointers in the root repository and push to `origin dev`.
