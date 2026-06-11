.PHONY: help install dev start stop build preview typecheck format format-check check clean refresh

default: help

PORT := 4321

help: ## Display available commands
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk -F ':.*?## ' '{printf "\033[36m%-16s\033[0m %s\n", $$1, $$2}'

# Installation & dev

install: ## Install all dependencies
	npm install

dev: ## Start Astro dev server in foreground (http://localhost:4321)
	npm run dev

start: ## Start Astro dev server in background
	@if lsof -ti:$(PORT) > /dev/null 2>&1; then echo "Port $(PORT) already in use - run 'make stop' first."; exit 1; fi
	npm run dev > .dev.log 2>&1 & echo $$! > .pid
	@echo "Dev server started -> http://localhost:$(PORT) (PID $$(cat .pid)) - logs in .dev.log"

stop: ## Stop the background dev server
	@if lsof -ti:$(PORT) > /dev/null 2>&1; then lsof -ti:$(PORT) | xargs kill && rm -f .pid && echo "Dev server stopped."; else rm -f .pid && echo "No server running."; fi

build: ## Build the static site (fetches GitHub/npm metadata)
	npm run build

preview: build ## Preview the production build locally
	npm run preview

refresh: build ## Re-fetch GitHub/npm data and rebuild (alias of build)
	@echo "Rebuilt with fresh GitHub/npm data."

# Code quality

format: ## Format code with Prettier
	npm run format

format-check: ## Check formatting (CI)
	npm run format:check

typecheck: ## Run Astro/TypeScript type checking
	npm run typecheck

check: format-check typecheck build ## Run all checks (CI gate)
	@echo "All checks passed!"

# Maintenance

clean: ## Remove build artefacts
	rm -rf dist .astro
