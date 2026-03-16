# NQITA Project Context

This file defines the purpose, boundaries, and ecosystem role of the NQITA repository.

AI agents should read this file before making structural or architectural changes.

## Purpose

NQITA is a persistent AI companion and interface layer.

It is designed to live across multiple computing environments rather than being confined to a single app surface.

Those environments may include:

- CLI
- desktop environments
- chat interfaces
- embedded widgets
- system-integrated tools

## Core Responsibility

The central responsibility of NQITA is mediating interaction between users, agents, and ecosystem systems.

That includes:

- conversational interfaces
- memory-aware assistance
- cross-product AI interaction surfaces
- embeddable assistant experiences
- environment-aware context handling

## Boundary Rules

Belongs in NQITA:

- companion interfaces
- user-facing assistant flows
- environment-specific agent surfaces
- shared assistant experience logic

Does not primarily belong in NQITA:

- generic orchestration infrastructure
- ecosystem-wide auth and billing infrastructure
- editorial product behavior as a primary concern
- creator tooling as a primary concern

## Relationship to Other Systems

NQITA is part of the broader ecosystem while remaining independently usable.

Related systems include:

- `WokSpec` as umbrella presentation and coordination
- `WokAPI` as shared auth and billing infrastructure
- `Autiladus` as orchestration and execution infrastructure
- `WokStudio` as creator tooling
- `Orinadus` as intelligence and authored interpretation platform

## Agent Guidance

When working in this repository:

- preserve the companion/interface identity
- keep environment-specific surfaces explicit
- avoid turning the repository into a generic infrastructure bucket

## Quick Summary

NQITA is the ecosystem's companion and interface layer: a persistent AI presence across tools, environments, and products.
