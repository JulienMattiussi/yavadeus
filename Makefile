.PHONY: help install dev start stop build preview typecheck format format-check check clean refresh

default: help

PORT := 2107

help: ## Display available commands
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk -F ':.*?## ' '{printf "\033[36m%-16s\033[0m %s\n", $$1, $$2}'

# Installation & dev

install: ## Install all dependencies
	npm install

dev: ## Start Astro dev server in foreground (http://localhost:2107)
	npm run dev

start: ## Start Astro dev server in background (verifies it actually comes up)
	@if lsof -ti:$(PORT) -sTCP:LISTEN > /dev/null 2>&1; then echo "Port $(PORT) already in use - run 'make stop' first."; exit 1; fi
	@npm run dev > .dev.log 2>&1 & echo $$! > .pid
	@for i in $$(seq 1 30); do \
		if lsof -ti:$(PORT) -sTCP:LISTEN > /dev/null 2>&1; then \
			echo "Dev server started -> http://localhost:$(PORT) (PID $$(cat .pid)) - logs in .dev.log"; exit 0; \
		fi; \
		kill -0 $$(cat .pid) 2>/dev/null || break; \
		sleep 0.5; \
	done; \
	echo "Dev server failed to start. Last log lines:"; tail -15 .dev.log; rm -f .pid; exit 1

stop: ## Stop the background dev server
	@if lsof -ti:$(PORT) -sTCP:LISTEN > /dev/null 2>&1; then lsof -ti:$(PORT) -sTCP:LISTEN | xargs kill && rm -f .pid && echo "Dev server stopped."; else rm -f .pid && echo "No server running."; fi

build: ## Build the static site from the cached data (offline, no token needed)
	npm run build

preview: build ## Preview the production build locally
	npm run preview

# Data pipeline: fetch (network) -> curate (local) -> build (offline)

fetch: ## Fetch GitHub/npm data into the cache (network; uses `gh auth token`, else GITHUB_TOKEN)
	npm run fetch

curate: ## Run the curation pipeline on the cache (categorize, prune, ...)
	npm run curate

categorize: ## Run only the categorization step on the cache
	npm run categorize

update-website: ## One shot: fetch -> curate -> format -> build (the full refresh)
	@$(MAKE) fetch
	@$(MAKE) curate
	@$(MAKE) format
	@$(MAKE) build
	@echo "Site à jour dans ./dist. Aperçu : 'make preview'."

# Code quality

format: ## Format code with Prettier
	npm run format

format-check: ## Check formatting (CI)
	npm run format:check

typecheck: ## Run Astro/TypeScript type checking
	npm run typecheck

test-unit: ## Run unit tests (Vitest)
	npm run test:unit

test-watch: ## Run unit tests in watch mode
	npm run test:watch

check: format-check typecheck test-unit build ## Run all checks (CI gate)
	@echo "All checks passed!"

# Maintenance

clean: ## Remove build artefacts
	rm -rf dist .astro

clean-data: ## DESTRUCTIVE reset: wipe the cache AND the curated catalog (asks confirmation)
	@printf "\033[31mThis deletes src/data/projects-cache.json AND clears all curated\n"
	@printf "categories/overrides + the ignored list in src/data/projects.ts.\033[0m\n"
	@printf "Type 'reset' to confirm: " && read ans && [ "$$ans" = "reset" ] || { echo "Aborted."; exit 1; }
	@rm -f src/data/projects-cache.json
	@npm run reset:data
	@echo "Done. Fresh start: run 'make fetch' then 'make curate'."
