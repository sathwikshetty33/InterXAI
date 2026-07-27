# InterXAI local dev. Provisions the full stack with a LOCAL Postgres (much
# lower query latency than remote Neon): start containers, migrate, install
# Piston languages, and seed a ready-to-attend interview. All dev tooling lives
# in tools/ so none of it ships in the app image.

COMPOSE := docker compose

.DEFAULT_GOAL := help
.PHONY: help provision up down reset migrate seed piston logs ps .wait-api

help: ## Show available targets
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-10s\033[0m %s\n", $$1, $$2}'

provision: ## One command: up + migrate + Piston languages + seed
	./tools/provision.sh

up: ## Build & start all containers (detached)
	$(COMPOSE) up -d --build

down: ## Stop containers (keeps the Postgres volume)
	$(COMPOSE) down

reset: ## Wipe all volumes (fresh DB) and re-provision
	$(COMPOSE) down -v
	./tools/provision.sh

migrate: .wait-api ## Apply DB migrations inside the api container
	$(COMPOSE) exec -T api alembic upgrade head

seed: ## Seed demo accounts + an attendable interview
	./tools/seed.sh

piston: ## Install the DSA language runtimes into Piston
	./tools/piston_install.sh

logs: ## Tail logs from all services
	$(COMPOSE) logs -f --tail=100

ps: ## Show container status
	$(COMPOSE) ps

# Block until the api container is running (it waits on Postgres health first).
.wait-api:
	@echo "⏳ Waiting for the api container…"
	@until $(COMPOSE) exec -T api true 2>/dev/null; do sleep 1; done
