# 📖 Nexora AI - Comprehensive File-by-File Logic & System Explanation

This document provides a thorough walkthrough of every file in the **Nexora AI** repository, explaining the core logic, purpose, inputs, outputs, and how each component collaborates within the overall architecture.

---

## 📑 Table of Contents

1. [Root & Operational Files](#1-root--operational-files)
2. [API Gateway (`backend/gateway`)](#2-api-gateway-backendgateway)
3. [Shared Backend Modules (`backend/shared`)](#3-shared-backend-modules-backendshared)
4. [Authentication Service (`backend/services/auth`)](#4-authentication-service-backendservicesauth)
5. [Chat & Messaging Service (`backend/services/chat`)](#5-chat--messaging-service-backendserviceschat)
6. [Agentic AI Intelligence Service (`backend/services/agent`)](#6-agentic-ai-intelligence-service-backendservicesagent)
7. [Billing & Monetization Service (`backend/services/billing`)](#7-billing--monetization-service-backendservicesbilling)
8. [Client Application (`frontend`)](#8-client-application-frontend)

---

## 1. Root & Operational Files

### `run_all.bat`
- **Purpose**: Windows batch automation script that initiates the entire microservice ecosystem with a single double-click or CLI command.
- **Logic**: Launches Docker Compose for Redis in the background, then spawns distinct `cmd /k` windows running `npm run dev` for the API Gateway (port 8000), Auth Service (8001), Chat Service (8002), Agent Service (8003), Billing Service (8004), and Vite Frontend (port 5173).

### `.gitignore`
- **Purpose**: Defines patterns for files and directories that must never be committed to Git.
- **Logic**: Specifically ignores `node_modules/`, `dist/`, `.env` files across all directories, temporary directories (`temp/`, `tmp/`), and critical secrets like `serviceAccountKey.json` and any Firebase Admin SDK private key JSON files (`nexora-ai-*-firebase-adminsdk-*.json`).

### `.github/workflows/deploy.yml`
- **Purpose**: GitHub Actions CI/CD deployment pipeline for AWS cloud infrastructure.
- **Logic**: Triggers on push to `main`. It logs into Amazon ECR, builds Docker images for Gateway, Auth, Chat, Agent, and Billing services, pushes them to AWS ECR, and triggers an ECS rolling deployment update. For the frontend, it builds the Vite bundle and syncs static assets to Amazon S3 while invalidating AWS CloudFront cache distributions.

### `README.md`
- **Purpose**: The front-facing documentation and presentation of Nexora AI.
- **Logic**: Contains feature highlights, high-level Mermaid flowcharts, architectural walkthrough, tech stack specifications, prerequisite checklists, installation guides, and security protocols.

### `PROJECT_STRUCTURE.md`
- **Purpose**: Structural reference describing the repository tree, architectural layers, and system design patterns.

---

## 2. API Gateway (`backend/gateway`)

### `backend/gateway/index.js`
- **Purpose**: The single entry point and reverse proxy for all client traffic.
- **Logic**:
  - Initializes Express on port `8000`.
  - Configures `cors` to allow requests with credentials from both `http://localhost:5173` and `http://127.0.0.1:5173`.
  - Attaches `morgan` for HTTP request logging and `cookie-parser` to parse session cookies.
  - Proxies `/api/auth` directly to the Auth Service (`:8001`).
  - Uses `protect` middleware to authenticate requests for `/api/chat`, `/api/agent`, and `/api/billing`, forwarding verified requests downstream with custom headers via `proxyWithHeader`.
  - Exposes `/api/me` to return authenticated user profile data.

### `backend/gateway/middleware/auth.middleware.js`
- **Purpose**: Security perimeter middleware verifying user sessions.
- **Logic**:
  - Reads `req.cookies.session`. If missing, responds with `401 Unauthorized`.
  - Connects to Redis to query the key `session-${sessionId}`.
  - If the session has expired or is missing in Redis, returns `401 Unauthorized`.
  - Parses the JSON session object and attaches it to `req.user`, allowing downstream handlers to access `userId`, email, name, and plan details.

### `backend/gateway/controllers/user.controller.js`
- **Purpose**: Gateway-level user handlers.
- **Logic**: Defines `getCurrentUser`, which returns `req.user` populated by the `protect` middleware, providing the frontend with immediate identity verification.

### `backend/gateway/utils/proxyWithHeader.js`
- **Purpose**: Proxy configuration wrapper.
- **Logic**: Wraps `express-http-proxy`. When forwarding requests to microservices (Chat, Agent, Billing), it intercepts proxy options and injects `x-user-id: req.user.userId` into headers, enabling microservices to safely identify the user without re-checking Redis.

### `backend/gateway/Dockerfile`
- **Purpose**: Production containerization for the Gateway service.
- **Logic**: Sets up Node alpine environment, installs production dependencies, copies gateway code, and exposes port 8000.

---

## 3. Shared Backend Modules (`backend/shared`)

### `backend/shared/redis/redis.js`
- **Purpose**: Centralized Redis connection instance.
- **Logic**: Instantiates and exports an `ioredis` client connected to `process.env.REDIS_URL`. Emits connection logs on connect and provides a single shared client for session reads and writes across services.

### `backend/docker-compose.yml`
- **Purpose**: Local infrastructure orchestration.
- **Logic**: Defines and spins up a local Redis container mapped to host port `6379:6379`.

---

## 4. Authentication Service (`backend/services/auth`)

### `backend/services/auth/index.js`
- **Purpose**: HTTP server entry point for the Auth Microservice.
- **Logic**: Runs Express on port `8001`, mounts `express.json()`, mounts auth routes at root `/`, and initializes the MongoDB database connection via `connectDb()`.

### `backend/services/auth/config/db.js`
- **Purpose**: Database connection manager for user data.
- **Logic**: Connects Mongoose to `process.env.MONGODB_URI` and logs successful connection or error states.

### `backend/services/auth/config/firebase.js`
- **Purpose**: Server-side Firebase Admin SDK initialization.
- **Logic**: Safely reads `serviceAccountKey.json` using `fs.readFileSync` (avoiding Node version JSON import issues), verifies if a Firebase app is already initialized, and exports the Firebase Admin `app` instance using `cert()`.

### `backend/services/auth/models/user.model.js`
- **Purpose**: Mongoose schema and model for application users.
- **Logic**: Stores `firebaseUid` (unique), `name`, `email`, `avatar`, `plan` (defaults to "free"), `credits` (default 100), `totalCredits` (default 100), and `planExpiresAt`.

### `backend/services/auth/controllers/auth.controller.js`
- **Purpose**: Core business logic for authentication and credit updates.
- **Logic**:
  - `login`: Receives Firebase ID token from client, verifies it using `getAuth(app).verifyIdToken(token)`. Finds or creates user in MongoDB. Generates a cryptographic session UUID, saves the session into Redis (`session-${sessionId}`) with a 7-day TTL, sets an HTTP-only cookie (`SameSite: lax`, `path: "/"`), and returns the user object.
  - `logOut`: Reads the session cookie, deletes the key from Redis, clears the cookie on the response, and returns success.
  - `updateUserPayment`: Updates user plan, adds credits, sets 30-day expiration, and updates the cached Redis session.
  - `deductCredits`: Checks credit costs for different agents (`chat: 1`, `search: 5`, `coding: 10`, `pdf: 10`, `ppt: 10`, `vision: 10`). Checks if user has enough balance, deducts credits, saves to MongoDB, updates Redis, and returns the new credit balance.

### `backend/services/auth/routes/auth.route.js`
- **Purpose**: Route declarations for auth service.
- **Logic**: Maps `POST /login`, `GET /logout`, `POST /update-plan`, and `POST /deduct-credits` to their respective controller functions.

---

## 5. Chat & Messaging Service (`backend/services/chat`)

### `backend/services/chat/index.js`
- **Purpose**: Chat microservice server entry point.
- **Logic**: Starts Express on port `8002`, mounts chat routes, and connects to MongoDB.

### `backend/services/chat/config/db.js`
- **Purpose**: Database connection helper for chat database.
- **Logic**: Connects Mongoose to MongoDB instance.

### `backend/services/chat/models/coversation.model.js`
- **Purpose**: Mongoose schema for conversation threads.
- **Logic**: Stores `userId`, thread `title` (defaults to "New Chat"), and timestamps.

### `backend/services/chat/models/message.model.js`
- **Purpose**: Mongoose schema for individual conversation messages.
- **Logic**: Stores `conversationId`, message `sender` ("user" | "assistant"), `content`, optional `artifacts` (array of file objects with name, content, language), and timestamps.

### `backend/services/chat/controllers/chat.controller.js`
- **Purpose**: Chat and message management logic.
- **Logic**:
  - `createConversation`: Initializes a new conversation document for the authenticated user (`req.headers["x-user-id"]`).
  - `getConversations`: Fetches all conversation threads belonging to the user sorted by recent activity.
  - `updateConversation`: Updates the title of an existing conversation thread.
  - `getMessages`: Retrieves all messages belonging to a specified `conversationId`.
  - `saveMessage`: Appends a user or assistant message (including artifacts) into MongoDB.

### `backend/services/chat/routes/chat.routes.js`
- **Purpose**: Endpoint routes for conversation management.
- **Logic**: Maps `/create-conversation`, `/get-conversations`, `/update-conversation`, `/get-messages/:id`, and `/save-message`.

---

## 6. Agentic AI Intelligence Service (`backend/services/agent`)

### `backend/services/agent/index.js`
- **Purpose**: Server entry point for AI Agent execution.
- **Logic**: Runs Express on port `8003`, mounts agent routes, and initiates database connection.

### `backend/services/agent/config/`
- **`llmModels.js`**: Instantiates ChatOpenAI and ChatGoogleGenerativeAI models with custom temperatures and API keys.
- **`memory.js`**: Initializes conversation memory buffers.
- **`s3.js`**: Configures AWS S3 client with access keys and region for storing generated documents.
- **`tavily.js`**: Instantiates Tavily search client for web search retrieval.
- **`vectorDb.js` & `embeddings.js`**: Configures Pinecone vector store and embedding models for RAG search.
- **`multer.js`**: Handles multipart/form-data file uploads (PDFs, images) to local temporary storage.
- **`agentLimit.js`**: Credit cost limits per agent type.

### `backend/services/agent/graph/state.js`
- **Purpose**: Defines the LangGraph State Annotation schema.
- **Logic**: Models the shared graph state containing `messages`, `query`, `agent`, `userId`, `conversationId`, `artifacts`, `s3Url`, and document chunks.

### `backend/services/agent/graph/router.js`
- **Purpose**: Intelligent prompt classification node.
- **Logic**: Analyzes the user prompt and context using an LLM classifier to determine whether the user is asking for:
  - Coding / Web app generation (`coding`)
  - Live internet research (`search`)
  - PDF document creation (`pdf`)
  - Slide presentation creation (`ppt`)
  - Image generation (`vision`)
  - PDF Question answering (`pdfRag`)
  - Image inspection (`imageAnalyzer`)
  - Standard conversation (`chat`)

### `backend/services/agent/graph/graph.js`
- **Purpose**: LangGraph StateGraph definition and workflow compiler.
- **Logic**:
  - Registers all nodes: `router`, `chat`, `search`, `coding`, `pdf`, `ppt`, `vision`, `pdfRag`, `imageAnalyzer`.
  - Adds edge from `__start__` to `router`.
  - Adds conditional branching from `router` to the designated agent node.
  - Links `search` node into `chat` to summarize web findings.
  - Compiles and exports the compiled `graph` runnable.

### `backend/services/agent/agents/`
- **`chat.agent.js`**: Handles direct conversation, summarizing, and reasoning.
- **`coding.agent.js`**: Specialized code architect. Uses structured system instructions to write complete, production-ready code bundles (`index.html`, `style.css`, `script.js`) formatted as artifacts.
- **`search.agent.js`**: Calls Tavily API to fetch real-time search results, news, and links.
- **`pdf.agent.js`**: Generates structured PDF documents using PDFKit and uploads the compiled PDF to AWS S3.
- **`ppt.agent.js`**: Generates multi-slide PowerPoint presentations using `pptxgenjs` and uploads to S3.
- **`vision.agent.js`**: Generates images based on descriptive user prompts.
- **`imageAnalyzer.agent.js`**: Uses multimodal vision models to extract insights and analyze uploaded images.
- **`pdfRag.agent.js`**: Performs similarity searches across vector embeddings of uploaded PDFs to answer queries accurately.

### `backend/services/agent/controllers/agent.controller.js`
- **Purpose**: Primary controller handling agent execution requests.
- **Logic**: Receives prompt and conversation ID, calls `deductCredits` to verify and consume user credits, feeds the message state into `graph.invoke()`, persists messages to the Chat Service, and returns the agent output and generated artifacts.

---

## 7. Billing & Monetization Service (`backend/services/billing`)

### `backend/services/billing/index.js`
- **Purpose**: Server entry point for billing and subscription management.
- **Logic**: Express server on port `8004`, mounts billing endpoints, and connects to MongoDB.

### `backend/services/billing/config/razorpay.js`
- **Purpose**: Razorpay SDK initialization.
- **Logic**: Creates and exports the `Razorpay` client with `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`.

### `backend/services/billing/config/Plans.js`
- **Purpose**: Pricing tier configuration.
- **Logic**: Defines plan specifications (Free, Pro, Enterprise) with credit counts, pricing in INR, and feature perks.

### `backend/services/billing/models/payment.model.js`
- **Purpose**: Mongoose schema recording transaction logs.
- **Logic**: Stores `userId`, `orderId`, `paymentId`, `amount`, `plan`, `creditsAdded`, and payment status.

### `backend/services/billing/controllers/billing.controller.js`
- **Purpose**: Payment order creation and webhook verification.
- **Logic**:
  - `createOrder`: Creates a Razorpay order with currency INR and returns order details to the client.
  - `verifyPayment`: Validates the cryptographic HMAC signature (`crypto.createHmac('sha256')`) using Razorpay key secret. If signature matches, records the payment in MongoDB, calls Auth Service (`/update-plan`) to add credits and upgrade user tier, and returns verification confirmation.

---

## 8. Client Application (`frontend`)

### `frontend/src/main.jsx`
- **Purpose**: Client application bootstrapper.
- **Logic**: Renders the React root into `#root`, wraps the app with the Redux Toolkit `<Provider store={store}>`, and mounts `<App />`.

### `frontend/src/App.jsx`
- **Purpose**: Top-level coordinator and session guardian.
- **Logic**:
  - On mount, calls `getCurrentUser()` (`/api/me`) to check for an active backend session cookie.
  - Listens to Firebase `onAuthStateChanged()`. If the user is authenticated in Firebase but the backend session was cleared, it automatically fetches a fresh ID token and posts to `/api/auth/login` to seamlessly recover the backend session without showing the login modal.
  - Renders `<Home />`.

### `frontend/src/pages/Home.jsx`
- **Purpose**: The primary workspace page layout.
- **Logic**:
  - Mounts `<SideBar />`, `<ChatArea />`, and `<Artifact />`.
  - While `isAuthChecking` is true, displays a subtle full-screen loader (`Restoring session...`).
  - If unauthenticated, displays the "Welcome to Nexora AI" modal.
  - Contains `googleLogin()`, which triggers `signInWithPopup(auth, googleProvider)`, handles button spinners, and displays actionable error messages if backend connection issues occur.

### `frontend/src/redux/`
- **`store.js`**: Combines `userSlice`, `conversationSlice`, and `messageSlice` into a unified Redux store.
- **`userSlice.js`**: Manages `userData`, `isAuthChecking`, and `authError`.
- **`conversationSlice.js`**: Manages thread list `conversations`, `selectedConversation`, and actions `setConversations`, `addConversation`, and `setConvTitle`.
- **`messageSlice.js`**: Manages `messages`, `artifacts`, and `isLoading`.

### `frontend/src/components/`
- **`SideBar.jsx`**: Collapsible navigation bar listing past conversation threads, new chat button, user avatar, plan badge, credit indicator, and logout trigger.
- **`ChatArea.jsx`**: Main workspace column hosting `<Nav />`, `<MessageList />`, and `<ChatInput />`.
- **`ChatInput.jsx`**: Auto-resizing textarea with file upload support, submit button, model indicators, and keyboard event handlers.
- **`MessageList.jsx`**: Auto-scrolling container rendering message history.
- **`MessageBubble.jsx`**: Formats individual chat bubbles, supports markdown rendering, syntax-highlighted code blocks, and handles artifact trigger buttons.
- **`Artifact.jsx`**: Full Claude Artifact-style drawer. Displays tabbed multi-file explorer (`index.html`, `style.css`, `script.js`), embeds the **Monaco Editor**, provides a **Live Preview** iframe sandbox, copy button, and collapse toggles.
- **`BillingDrawer.jsx`**: Interactive sliding drawer displaying credit balances, plan tiers, and triggering the Razorpay checkout modal.
- **`LoadingAnimation.jsx`**: Visual pulse animation shown while agents process requests.
- **`Nav.jsx`**: Header navigation bar displaying the active conversation title and quick action buttons.

### `frontend/src/features/`
- **`getCurrentUser.js`**: Sends `GET /api/me` with credentials to fetch session data.
- **`logOut.js`**: Triggers both `/api/auth/logout` on the backend and `signOut(auth)` in Firebase to maintain complete auth synchronization.
- **`createConversation.js`**: POST request initializing a new conversation.
- **`getConversations.js`**: GET request fetching conversation threads.
- **`updateConversation.js`**: PUT request updating thread titles.
- **`getMessages.js`**: GET request retrieving conversation message history.
- **`sendMessage.js`**: POST request sending user prompts to `/api/agent/run`.
- **`createOrder.js` & `verifyPayment.js`**: Initiates Razorpay payment orders and verifies payment signatures.

### `frontend/utils/`
- **`axios.js`**: Preconfigured Axios instance with `baseURL: import.meta.env.VITE_SERVER_URL` and `withCredentials: true`.
- **`firebase.js`**: Initializes the Firebase Client Web SDK using project config and exports `auth` and `googleProvider`.
