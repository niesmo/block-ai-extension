# Contracts: Inline Task Feedback

**Feature**: 002-inline-task-feedback  
**Date**: February 2, 2026

## Overview

This directory contains TypeScript interface definitions that serve as contracts between components. These contracts define the API surface and should be implemented by the actual source code.

## Files

| File | Purpose |
|------|---------|
| [types.ts](./types.ts) | Core type definitions for inline indicators and suggestions |
| [events.ts](./events.ts) | Event payload types for EventBus integration |
| [commands.ts](./commands.ts) | Command identifiers and argument types |
| [configuration.ts](./configuration.ts) | Settings schema for user-configurable options |

## Usage

These contracts are **specifications**, not runtime code. During implementation:

1. Copy relevant interfaces to `src/models/` or `src/services/`
2. Implement the interfaces in actual service classes
3. Keep contracts in sync with implementation

## Versioning

Contracts follow the feature branch. Breaking changes require spec review.
