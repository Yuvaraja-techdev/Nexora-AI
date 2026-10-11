# 📁 Nexora AI - Project Structure & Architectural Blueprint

This document details the architectural layout, directory organization, and structural design principles that power the **Nexora AI** platform.

---

## 🗺️ High-Level Directory Tree

```
Nexora AI/
├── .github/
│   └── workflows/
│       └── deploy.yml            # CI/CD deployment pipeline for AWS ECS & S3
├── .gitignore                    # Git ignore file protecting keys, secrets & envs
├── run_all.bat                   # Automation batch script launching all microservices
├── README.md                     # Main project presentation & documentation
├── PROJECT_STRUCTURE.md          # Architectural and directory structure breakdown
├── project_explanation.md        # File-by-file logic & purpose explanation
│
├── backend/                      # Backend microservices and shared libraries
│   ├── docker-compose.yml        # Docker compose configuration (Redis container)
│   ├── package.json              # Backend root configuration
│   │
│   ├── gateway/                  # API Gateway Service (Port 8000)
│   │   ├── controllers/          # User controllers for gateway endpoints
│   │   ├── middleware/           # Redis-backed authentication middleware
│   │   ├── utils/                # HTTP proxy utilities and header injectors
│   │   ├── .env.example          # Gateway environment variables template
│   │   ├── Dockerfile            # Gateway container definition
│   │   └── index.js              # Gateway entry point & route aggregator
│   │
│   ├── services/
│   │   ├── agent/                # Multi-Agent Intelligence Service (Port 8003)
│   │   │   ├── agents/           # Specialized LangChain AI agent definitions
│   │   │   ├── config/           # LLMs, memory, vector database, S3, Tavily configs
│   │   │   ├── controllers/      # Agent endpoint controllers
│   │   │   ├── graph/            # LangGraph StateGraph, router node & state schema
│   │   │   ├── routes/           # Express routes for agent execution
│   │   │   ├── utils/            # Document generators (PDF/PPT) & S3 uploaders
│   │   │   ├── Dockerfile        # Agent service container definition
│   │   │   └── index.js          # Agent service server entry point
│   │   │
│   │   ├── auth/                 # Authentication & User Management Service (Port 8001)
│   │   │   ├── config/           # Database & Firebase Admin SDK configuration
│   │   │   ├── controllers/      # Login, logout, credit deduction controllers
│   │   │   ├── models/           # Mongoose User model schema
│   │   │   ├── routes/           # Authentication endpoints (/api/auth)
│   │   │   ├── .env.example      # Auth service environment variables template
│   │   │   ├── Dockerfile        # Auth service container definition
│   │   │   └── index.js          # Auth service server entry point
│   │   │
│   │   ├── billing/              # Subscription & Razorpay Payment Service (Port 8004)
│   │   │   ├── config/           # Razorpay instance, plan tiers & DB connection
│   │   │   ├── controllers/      # Order creation & payment verification controllers
│   │   │   ├── models/           # Mongoose Payment transaction schema
│   │   │   ├── routes/           # Billing endpoints (/api/billing)
│   │   │   ├── Dockerfile        # Billing service container definition
│   │   │   └── index.js          # Billing service server entry point
│   │   │
│   │   └── chat/                 # Conversation & Message History Service (Port 8002)
│   │       ├── config/           # MongoDB database connection
│   │       ├── controllers/      # Conversation creation, listing, message logging
│   │       ├── models/           # Conversation & Message Mongoose schemas
│   │       ├── routes/           # Chat management endpoints (/api/chat)
│   │       ├── Dockerfile        # Chat service container definition
│   │       └── index.js          # Chat service server entry point
│   │
│   └── shared/                   # Cross-service shared modules
│       └── redis/
│           └── redis.js          # Centralized ioredis client instance
│
└── frontend/                     # Client Application (Vite + React 19)
    ├── public/                   # Static assets & browser icons
    ├── utils/                    # Client Axios and Firebase SDK instances
    ├── src/
    │   ├── assets/               # Branding graphics and hero images
    │   ├── components/           # Reusable UI components & drawers
    │   ├── features/             # Async API service helper functions
    │   ├── pages/                # Root views and pages (Home.jsx)
    │   ├── redux/                # Redux Toolkit store and feature slices
    │   ├── App.jsx               # Main React component with auth synchronization
    │   ├── main.jsx              # React DOM entry point with Redux Provider
    │   └── index.css             # Tailwind CSS style definitions
    ├── .env.example              # Frontend environment variables template
    ├── package.json              # Frontend package dependencies
    └── vite.config.js            # Vite build configuration
```

---

## 🏛️ Layered Architectural Breakdown

### 1. Client Layer (`/frontend`)
The presentation layer is built as a single-page reactive application using **React 19** and **Redux Toolkit**:
- **State Centralization**: Redux stores manage three distinct domain slices:
  - `userSlice`: Current user credentials, loading status, and authentication error messages.
  - `conversationSlice`: Active conversation threads, thread list, and thread selection.
  - `messageSlice`: Chronological message stream, artifact models, and loading indicators.
- **Artifact Viewer & Editor**: When code is generated, the UI renders the **Artifact Drawer**, displaying a multi-file tab system alongside a Monaco Code Editor and a live-rendering sandbox iframe.
- **Client Authentication**: Firebase Web SDK manages Google OAuth login, token retrieval, and local session persistence via `onAuthStateChanged()`.

---

### 2. API Gateway Layer (`/backend/gateway`)
The Gateway acts as the unified reverse proxy and security perimeter for all backend microservices:
- **Port**: `8000`
- **Reverse Proxying**: Uses `express-http-proxy` to route incoming traffic:
  - `/api/auth` ➡️ Auth Service (`:8001`)
  - `/api/chat` ➡️ Chat Service (`:8002`)
  - `/api/agent` ➡️ Agent Service (`:8003`)
  - `/api/billing` ➡️ Billing Service (`:8004`)
- **Session Verification**: The `protect` middleware intercepts secured endpoints, verifies the incoming `session` cookie against Redis, extracts the associated user payload, and injects the `x-user-id` header downstream.
- **CORS Management**: Configured with credentials support for localhost and production origins.

---

### 3. Microservice Services Layer (`/backend/services`)

#### A. Authentication Service (`:8001`)
- **Role**: Identity verification, user provisioning, and session lifecycle.
- **Security**: Verifies client-provided Firebase ID Tokens via the Firebase Admin SDK.
- **Session Management**: Generates cryptographic UUID session keys stored in Redis with a 7-day expiration.
- **Credit Sync**: Exposes internal endpoints to update user plans and deduct credits upon agent consumption.

#### B. Agent Service (`:8003`)
- **Role**: AI orchestration engine powered by **LangGraph** and **LangChain**.
- **State Machine**: Orchestrates state transitions between specialized agents based on user intent.
- **Sub-Agents**:
  - `router.js`: Directs queries based on semantic classification.
  - `chat.agent.js`: General-purpose conversational assistant.
  - `coding.agent.js`: Produces clean multi-file software solutions (`index.html`, `style.css`, `script.js`).
  - `search.agent.js`: Queries live web information via Tavily Search API.
  - `pdf.agent.js` & `ppt.agent.js`: Compiles structured documents and presentations, uploading to AWS S3.
  - `vision.agent.js` & `imageAnalyzer.agent.js`: Multimodal vision and image generation.
  - `pdfRag.agent.js`: Chunking, vector embeddings, and retrieval-augmented generation.

#### C. Chat Service (`:8002`)
- **Role**: Persistence of conversation history and chat messages.
- **Data Model**: Organizes interactions into `Conversation` documents and chronological `Message` records.
- **Access Control**: Scoped by the verified user identity passed from the Gateway.

#### D. Billing Service (`:8004`)
- **Role**: Monetization, subscription management, and credit allocation.
- **Payment Gateway**: Integrates with **Razorpay** to create orders and cryptographically verify payment signatures (HMAC SHA-256).
- **Plan Tiers**: Free (100 credits), Pro, and Enterprise tiers with automated credit balance renewal.

---

### 4. Persistence & Cache Layer
- **Redis (`:6379`)**: High-speed, in-memory distributed session store and atomic credit cache.
- **MongoDB Atlas**: Document database for persistent storage of users, payment logs, conversation threads, and messages.
- **AWS S3**: Cloud object storage for generated artifacts (PDFs, PPT presentations, and user uploads).
- **Vector Database**: High-dimensional index for similarity search on PDF document chunks (RAG).

---

## ⚙️ Design Patterns & Best Practices

1. **Microservices Architecture**: Every domain service (Auth, Chat, Agent, Billing) is decoupled, runs independently on its own port, and can be containerized and scaled horizontally.
2. **Gateway Aggregator Pattern**: The API Gateway hides internal port topologies from the client, presenting a unified `/api/*` endpoint space.
3. **LangGraph State Graph Pattern**: Instead of hard-coded prompt chaining, agent logic is modeled as a directed cyclical graph with conditional edges.
4. **Defense in Depth**: Authentication is validated at the gateway and verified through session cookies without exposing internal service endpoints to public networks.
5. **Two-Way Auth Resilience**: Redux, server session cookies, and Firebase's persistent client auth state are synchronized to prevent unexpected logouts.
