# 🎓 Smart Campus Analytics - Backend Engine

FastAPI-powered real-time dual-risk analytics engine, student cohort tracking, and LLM synthesis API.

## 🚀 Quick Start (Local Run)

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Configure Environment (Optional)
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
To enable free LLM insights, add either:
- **Google Gemini API Key** (100% Free at [Google AI Studio](https://aistudio.google.com/))
- **Groq Cloud Key** (100% Free at [Groq Console](https://console.groq.com/))

*(If no key is provided, the backend automatically uses an advanced built-in deterministic analytics synthesis engine!)*

### 3. Run the Server
```bash
python server.py
# Or with uvicorn:
uvicorn server:app --reload --port 8000
```
Visit the interactive Swagger API documentation at: **`http://localhost:8000/docs`**

---

## ☁️ Free Cloud Deployment Guides

### Option 1: Deploy on Render.com (Recommended - 100% Free)
1. Push this folder to a GitHub repository.
2. Sign in to [Render.com](https://render.com) and click **New +** -> **Web Service**.
3. Select your GitHub repository.
4. Settings:
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn server:app --host 0.0.0.0 --port $PORT`
5. Under **Environment Variables**, add:
   - `CORS_ORIGINS`: `*` (or your frontend domain)
   - `GEMINI_API_KEY`: *(your free Gemini key)*
6. Click **Create Web Service**. Your API will be live at `https://your-app-name.onrender.com`!

### Option 2: Deploy on Railway.app (Free Trial / Credit)
1. In [Railway.app](https://railway.app), click **New Project** -> **Deploy from GitHub repo**.
2. Railway detects Python and runs `Procfile` automatically.
3. Add environment variable `PORT=8000`.

### Option 3: Deploy with Docker
```bash
docker build -t campus-backend .
docker run -p 8000:8000 campus-backend
```

---

## 📡 Key API Endpoints
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Health check for cloud orchestrators |
| `GET` | `/api/students` | Get all students (filter by `department`, `risk`, `search`) |
| `POST` | `/api/students` | Add or update a student |
| `POST` | `/api/analytics/upload` | Upload CSV / JSON student spreadsheet |
| `POST` | `/api/analytics/natural-entry` | Natural language student update parser |
| `POST` | `/api/analytics/benchmark` | Reset & load full benchmark cohort |
| `POST` | `/api/analytics/llm-insights` | Generate executive briefing with AI |
| `GET` | `/api/interventions` | List all interventions |
| `POST` | `/api/interventions` | Schedule new intervention |

