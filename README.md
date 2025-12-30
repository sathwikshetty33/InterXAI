# InterXAI

**Autonomous AI-Powered Interview & Career Development Platform**

InterXAI is an agentic AI platform that revolutionizes hiring and career development through autonomous AI agents. Our microservice-based multi-agent system handles everything from intelligent interview orchestration to personalized career coaching—operating with minimal human intervention while maximizing scalability.

---

## Architecture Overview

InterXAI follows a **microservice architecture** designed for horizontal scalability and independent deployment of services.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        InterXAI Microservice Architecture                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ┌──────────────┐     ┌──────────────┐     ┌──────────────────────┐   │
│   │   Frontend   │────▶│   Backend    │────▶│   AI Agent Service   │   │
│   │   (React)    │     │   (Django)   │     │     (Groq LLM)       │   │
│   └──────────────┘     └──────────────┘     └──────────────────────┘   │
│          │                    │                                          │
│          │                    ▼                                          │
│          │             ┌──────────────┐     ┌──────────────────────┐   │
│          │             │  PostgreSQL  │     │        Redis         │   │
│          │             │  (Database)  │     │  (Cache/Sessions)    │   │
│          │             └──────────────┘     └──────────────────────┘   │
│          │                                                               │
│          └──────────────────────────────────────────────────────────────│
│                              Nginx Reverse Proxy                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Agentic AI System

InterXAI leverages LLM-powered autonomous agents that work together:

### Agent Capabilities

| Agent                         | Autonomy Level   | Function                                                  |
| ----------------------------- | ---------------- | --------------------------------------------------------- |
| **Interview Orchestrator**    | Fully Autonomous | Plans and structures interviews based on job requirements |
| **Question Generation Agent** | Autonomous       | Generates contextual questions from resumes and JDs       |
| **Evaluation Agent**          | Semi-Autonomous  | Scores answers and provides reasoning                     |
| **Feedback Synthesis Agent**  | Autonomous       | Analyzes patterns and generates actionable insights       |
| **Career Co-Pilot Agent**     | Interactive      | Guides candidates with personalized recommendations       |
| **Roadmap Agent**             | Autonomous       | Creates learning paths based on skill gaps                |

### Agent Workflow

```
Job Description → [JD Parser Agent] → [Question Planning Agent] → [Question Generation Agent]
                                                                            ↓
Candidate Response → [Evaluation Agent] → [Scoring Agent] → [Feedback Agent]
```

---

## Key Features

### Agentic Interview System

- Autonomous Interview Planning - AI agents design complete interview flows
- Dynamic Question Generation - Context-aware agents create questions in real-time
- Multi-Modal Assessment - Technical, resume-based, and competency evaluation
- Intelligent Proctoring Agent - Autonomous monitoring for interview integrity

### AI-Driven Candidate Evaluation

- Agentic Scoring Pipeline - Multi-step reasoning for fair evaluation
- Pattern Recognition - Agents identify strengths and improvement areas
- Automated Feedback Generation - Personalized insights without human intervention

### Career Co-Pilot (Autonomous Career Agent)

- Personalized AI Coaching - Always-on career advisor
- Skill Gap Analysis - Identify learning opportunities
- Dynamic Roadmap Generation - Auto-generated learning paths
- Opportunity Matching - Intelligent job recommendations

---

## Tech Stack

### Services

| Service   | Technology       | Purpose                     |
| --------- | ---------------- | --------------------------- |
| Frontend  | React 19, Vite 6 | User Interface              |
| Backend   | Django 5.2, DRF  | API and Business Logic      |
| Database  | PostgreSQL 15    | Persistent Storage          |
| Cache     | Redis 7          | Session Storage and Caching |
| AI Engine | Groq (Llama 3.1) | Agent Inference             |
| Proxy     | Nginx            | Load Balancing and Routing  |

### Agent Framework

| Technology | Purpose                                    |
| ---------- | ------------------------------------------ |
| LangChain  | Agent orchestration and chains             |
| LangGraph  | Multi-agent workflows and state management |
| Groq LLM   | Fast inference for real-time responses     |

---

## Scalability

InterXAI is designed for enterprise-scale deployments:

### Horizontal Scaling

- **Stateless Backend** - Backend containers can be replicated across multiple nodes
- **Load Balancing** - Nginx distributes traffic across backend instances
- **Database Replication** - PostgreSQL supports read replicas for high availability

### Microservice Benefits

- **Independent Deployment** - Each service can be updated without affecting others
- **Technology Flexibility** - Services can use different tech stacks as needed
- **Fault Isolation** - Service failures don't cascade to the entire system
- **Team Autonomy** - Different teams can own and maintain separate services

### Performance Optimization

- **Redis Caching** - Reduces database load for frequently accessed data
- **CDN Ready** - Static assets can be served from edge locations
- **Connection Pooling** - Efficient database connection management
- **Async Processing** - Long-running AI tasks can be queued

### Recommended Production Setup

| Scale  | Frontend     | Backend      | Database               | Redis         |
| ------ | ------------ | ------------ | ---------------------- | ------------- |
| Small  | 1 instance   | 2 instances  | 1 primary              | 1 instance    |
| Medium | 2 instances  | 4 instances  | 1 primary + 1 replica  | 2 instances   |
| Large  | 3+ instances | 8+ instances | 1 primary + 2 replicas | Redis Cluster |

---

## Project Structure

```
InterXAI/
├── src/                          # React Frontend
│   ├── components/               # Reusable UI components
│   ├── pages/                    # Page components
│   └── routes/                   # Routing configuration
│
├── core/                         # Django Backend
│   ├── interview/                # Interview agent logic
│   ├── career/                   # Career planning agents
│   ├── feedback/                 # Feedback synthesis agent
│   ├── users/                    # Authentication
│   └── organization/             # Company management
│
├── Dockerfile.frontend           # Frontend container
├── Dockerfile.backend            # Backend container
├── docker-compose.yml            # Service orchestration
├── nginx.conf                    # Nginx configuration
└── requirements.txt              # Python dependencies
```

---

## Getting Started

### Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for local development)
- Python 3.11+ (for local development)
- Groq API Key

### Quick Start with Docker

```bash
# Clone the repository
git clone https://github.com/sathwikshetty33/InterXAI.git
cd InterXAI

# Copy environment files
cp .env.example .env
cp core/.env.example core/.env

# Edit the environment files with your configuration
# Make sure to set GROQ_API_KEY

# Start all services
docker-compose up -d

# Access the application
# Frontend: http://localhost:3000
# Backend:  http://localhost:8000
```

### Docker Commands

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Rebuild after code changes
docker-compose up -d --build

# Scale backend instances
docker-compose up -d --scale backend=4
```

### Local Development

#### Frontend

```bash
npm install
npm run dev
```

#### Backend

```bash
cd core
python -m venv .venv
source .venv/bin/activate
pip install -r ../requirements.txt
python manage.py migrate
python manage.py runserver
```

---

## Environment Configuration

### Frontend (.env.example)

```env
# Backend API URL
VITE_API_URL=http://localhost:8000
```

### Backend (core/.env.example)

```env
# Django Configuration
SECRET_KEY=your-secret-key-here
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Database Configuration
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/interxai

# Redis Configuration
REDIS_URL=redis://localhost:6379/0

# AI Agent Configuration
GROQ_API_KEY=your-groq-api-key-here

# Email Configuration
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password

# CORS Configuration
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

---

## Docker Configuration

### Frontend Dockerfile

Multi-stage build for optimized production image:

- Stage 1: Build React application with Vite
- Stage 2: Serve with Nginx (alpine-based, ~25MB)

### Backend Dockerfile

Production-ready Django container:

- Python 3.11 slim base image
- Gunicorn WSGI server with 4 workers
- Static file collection included

### Docker Compose Services

| Service  | Port | Description                        |
| -------- | ---- | ---------------------------------- |
| frontend | 3000 | React application served via Nginx |
| backend  | 8000 | Django API with Gunicorn           |
| db       | 5432 | PostgreSQL database                |
| redis    | 6379 | Redis cache and session store      |

---

## Deployment

### Production Checklist

1. Set `DEBUG=False` in backend environment
2. Configure proper `SECRET_KEY`
3. Set up SSL/TLS certificates
4. Configure proper `ALLOWED_HOSTS`
5. Set up database backups
6. Configure monitoring and logging

### Cloud Deployment Options

| Platform         | Frontend        | Backend        | Database           |
| ---------------- | --------------- | -------------- | ------------------ |
| AWS              | S3 + CloudFront | ECS/EKS        | RDS PostgreSQL     |
| GCP              | Cloud Storage   | Cloud Run      | Cloud SQL          |
| Azure            | Blob Storage    | Container Apps | Azure PostgreSQL   |
| Vercel + Railway | Vercel          | Railway        | Railway PostgreSQL |

---

## Development

```bash
# Frontend
npm run dev      # Start dev server
npm run build    # Production build
npm run lint     # Run ESLint

# Backend
python manage.py runserver     # Start server
python manage.py migrate       # Run migrations
python manage.py createsuperuser  # Create admin
```

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-agent`
3. Commit changes: `git commit -m 'Add new evaluation agent'`
4. Push and open a Pull Request

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file.

---

## Support

For questions or issues, please open a GitHub issue.
