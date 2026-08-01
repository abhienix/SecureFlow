# AI Integration Specifications

This document outlines the planned, privacy-first local AI Copilot architecture.

## 1. Planned Components
*   **Ollama Engine**: Local LLM execution host.
*   **Model Router**: Selects between local Qwen2.5 3B (for local, offline reasoning) and Gemini 2.0.
*   **ChromaDB**: Embeds and indexes security findings and policies for RAG context building.
*   **nomic-embed-text**: Used for generating document and finding vector embeddings.
*   **Model Context Protocol (MCP)**: Build custom context providers to safely expose project directory structures to models.

## 2. Privacy-First RAG Flow
All AI actions will be executed within secure boundary containers (no raw database or source code uploads to third-party endpoints). RAG context compilation occurs on the FastAPI gateway before model dispatch.
