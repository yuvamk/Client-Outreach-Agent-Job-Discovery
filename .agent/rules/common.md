# Common Rules

This project follows the **everything-claude-code** (ECC) standards for high-performance agentic development.

## Core Principles
- **Type Safety**: All library functions must have explicit TypeScript types.
- **Autonomous Error Handling**: Agents should prioritize fixing their own errors (e.g., retrying tool calls with different parameters) before escalating to the user.
- **Strategic Compaction**: Compact the context only at logical breakpoints to preserve working memory.

## AI Engineering Standards
- **Eval-First**: Significant logic changes should be accompanied by a plan for verification.
- **Small Units**: Implement features in "agent-sized" units that are independently verifiable.
