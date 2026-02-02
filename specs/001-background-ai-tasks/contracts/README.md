# VS Code Extension Contracts

This directory contains the TypeScript interface contracts for the Background AI Task Runner extension.

## Files

| File | Description |
|------|-------------|
| [types.ts](./types.ts) | Core type definitions and interfaces |
| [commands.ts](./commands.ts) | Command identifiers and signatures |
| [configuration.ts](./configuration.ts) | Configuration schema and settings |
| [events.ts](./events.ts) | Event types for inter-component communication |

## Usage

These contracts define the public interfaces between extension components. Implementation code should import and implement these interfaces.

```typescript
import { AITask, TaskStatus, CodeContext } from './contracts/types';
import { Commands } from './contracts/commands';
import { Configuration } from './contracts/configuration';
```
