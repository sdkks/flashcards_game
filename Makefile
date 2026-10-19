.PHONY: setup check-hooks build dev validate-i18n lint test test-ui

setup: check-hooks
	npm install

check-hooks:
	@if [ ! -f .git/hooks/pre-commit ] || ! grep -q "pre-commit" .git/hooks/pre-commit 2>/dev/null; then \
		echo "Installing pre-commit hooks..."; \
		pre-commit install; \
	else \
		echo "pre-commit hooks already installed."; \
	fi
	@if [ ! -x .git/hooks/commit-msg ]; then \
		echo "Installing commit-msg hook..."; \
		cp scripts/hooks/commit-msg .git/hooks/commit-msg && chmod +x .git/hooks/commit-msg; \
	else \
		echo "commit-msg hook already installed."; \
	fi

build:
	npm run build

dev:
	npx vite --port 5180

validate-i18n:
	npm run validate:i18n

lint:
	pre-commit run --all-files

test:
	npx playwright test

test-ui:
	npx playwright test --ui
