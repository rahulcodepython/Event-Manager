GOBIN ?= $(shell go env GOBIN 2>/dev/null)
GOPATH_BIN := $(shell go env GOPATH 2>/dev/null)/bin
export PATH := $(GOBIN):$(GOPATH_BIN):$(PATH)

# Go binaries load the repo-root .env themselves; shell targets source it.
ROOT_ENV := ../../.env
LOAD_ENV := set -a; [ -f $(ROOT_ENV) ] && . $(ROOT_ENV); set +a;

.PHONY: dev dev-admin build build-admin seed flush seeds-regenerate migrate-up migrate-down migrate-new migrate-force lint

dev:
	go run ./cmd/server

dev-admin:
	go run ./cmd/admin

build:
	go build -o bin/server ./cmd/server

build-admin:
	go build -o bin/admin ./cmd/admin

seed:
	go run ./cmd/seed -action=seed

flush:
	go run ./cmd/seed -action=flush


seeds-regenerate:
	go run ./cmd/seed -action=regenerate

migrate-up:
	@$(LOAD_ENV) if command -v migrate >/dev/null 2>&1; then \
		migrate -path internal/migrations -database "$$DATABASE_URL" up; \
	else \
		docker compose --env-file $(ROOT_ENV) -f ../../infra/docker-compose.yml run --rm migrate; \
	fi

migrate-down:
	@$(LOAD_ENV) migrate -path internal/migrations -database "$$DATABASE_URL" down 1

migrate-new:
	migrate create -ext sql -dir internal/migrations -seq $(name)

migrate-force:
	@$(LOAD_ENV) migrate -path internal/migrations -database "$$DATABASE_URL" force $(version)

lint:
	go vet ./...
	gofmt -l .
