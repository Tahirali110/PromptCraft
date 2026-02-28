<p align="center">
  <img src="frontend/assets/images/icon.png" alt="PromptCraft Logo" width="120" />
</p>

<h1 align="center">PromptCraft</h1>

<p align="center">
  <strong>AI-Powered Prompt Engineering & App Building Assistant</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#download">Download</a> •
  <a href="#tech-stack">Tech Stack</a> •
  <a href="#setup">Setup</a> •
  <a href="#deployment">Deployment</a> •
  <a href="#license">License</a>
</p>

---

## ✨ Features

- 🤖 **Multi-Provider AI Support** — Works with OpenAI, Google Gemini, Anthropic Claude, and OpenRouter
- 📝 **4-Step Prompt Orchestration** — Generates Market Research → PRD → Technical Design → Agent Prompt
- 💬 **AI Chat Assistant** — Interactive chat with any supported AI provider
- 🎤 **Voice Input** — Speak your ideas using Whisper (OpenAI) or Gemini audio
- 🌙 **Dark/Light Theme** — Smooth animated theme switching
- 📤 **Export to ZIP** — Download your generated documents as a zip file
- 📋 **Copy & Share** — One-tap copy or share any generated content
- 🔒 **Secure Backend Proxy** — API keys are never exposed in the client app
- ⚡ **Rate Limiting** — Built-in protection against abuse
- 📊 **Health Monitoring** — Backend health check endpoint

---

## 📲 Download

| Platform | Link |
|----------|------|
| **Android APK** | [Download Latest Release](https://github.com/Tahirali110/PromptCraft/releases/latest) |
| **Web App** | Coming Soon |

---

## 🛠 Tech Stack

### Frontend (Mobile App)
| Technology | Purpose |
|-----------|---------|
| React Native + Expo SDK 54 | Cross-platform mobile framework |
| TypeScript | Type-safe development |
| React Native Reanimated | Smooth animations |
| AsyncStorage | Local data persistence |
| Expo Router | File-based navigation |
| NativeWind | Tailwind-style theming |

### Backend (API Server)
| Technology | Purpose |
|-----------|---------|
| Hono | Ultra-fast web framework |
| Bun | JavaScript runtime |
| Zod | Request validation |
| @google/genai | Gemini AI SDK |
| Vercel | Serverless deployment |

### Security
- 🔐 Security headers (HSTS, CSP, X-Frame-Options)
- 🚦 Rate limiting (sliding window, in-memory)
- ✅ Input validation (Zod schemas)
- 📝 Structured JSON logging
- 🛡️ CORS hardening

---

## 🚀 Setup

### Prerequisites
- [Node.js](https://nodejs.org/) v18+
- [Bun](https://bun.sh/) (for backend)
- [Expo CLI](https://docs.expo.dev/get-started/installation/)

### 1. Clone the repository
```bash
git clone https://github.com/Tahirali110/PromptCraft.git
cd PromptCraft
```

### 2. Setup Frontend
```bash
cd frontend
bun install
```

Create a `.env.local` file in the `frontend/` directory:
```env
EXPO_PUBLIC_BACKEND_URL=http://localhost:3002
```

Start the development server:
```bash
bun run dev
```

### 3. Setup Backend
```bash
cd backend
bun install
```

Start the backend server:
```bash
bun run dev
```

The backend will run at `http://localhost:3002`.

---

## 🌐 Deployment

### Backend → Vercel
1. Push the repo to GitHub
2. Go to [vercel.com](https://vercel.com) and import the repository
3. Set **Root Directory** to `backend`
4. Set **Framework Preset** to `Other`
5. Add environment variable:
   - `ALLOWED_ORIGINS` = your app's production URL
6. Deploy!

### Frontend → APK Build
```bash
cd frontend
eas build -p android --profile preview
```

---

## 📁 Project Structure

```
promptcraft/
├── frontend/                 # React Native (Expo) mobile app
│   ├── app/                  # Screens (Expo Router)
│   │   ├── index.tsx         # Main dashboard
│   │   └── error-boundary.tsx
│   ├── components/           # Reusable components
│   │   ├── ChatBot.tsx       # AI chat interface
│   │   └── SettingsModal.tsx  # API key + provider settings
│   ├── lib/                  # Business logic
│   │   ├── orchestrator.ts   # Multi-step AI orchestration
│   │   ├── promptTemplates.js # 4-step prompt templates
│   │   ├── themeContext.tsx   # Theme management
│   │   ├── history.ts        # Chat history
│   │   └── zipExport.ts      # ZIP export utility
│   └── assets/               # Images and icons
│
├── backend/                  # Hono API server
│   ├── src/
│   │   ├── index.ts          # Main server entry
│   │   ├── config.ts         # Environment config
│   │   ├── routes/           # API endpoints
│   │   │   ├── ai.ts         # POST /api/v1/ai/chat
│   │   │   ├── transcribe.ts # POST /api/v1/ai/transcribe
│   │   │   └── health.ts     # GET /api/v1/health
│   │   ├── services/         # Business logic
│   │   │   ├── providers.ts  # Multi-provider AI calls
│   │   │   └── transcription.ts
│   │   ├── middleware/       # Security & logging
│   │   │   ├── security.ts   # Security headers
│   │   │   ├── rateLimiter.ts # Rate limiting
│   │   │   └── logger.ts     # Request logging
│   │   ├── validators/       # Zod schemas
│   │   └── types/            # TypeScript types
│   └── vercel.json           # Vercel deployment config
│
└── .gitignore
```

---

## 🔑 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/health` | Health check + uptime |
| `POST` | `/api/v1/ai/chat` | AI chat proxy (all providers) |
| `POST` | `/api/v1/ai/transcribe` | Voice transcription proxy |

---

## 🤝 Contributing

We welcome contributions! Please read our [Contributing Guidelines](CONTRIBUTING.md) for details on our code of conduct, the process for submitting pull requests to us, and coding rules.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/Tahirali110">Tahirali110</a>
</p>