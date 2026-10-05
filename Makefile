.PHONY: build test integration-test audit release

build:
	yarn build

test:
	yarn format:check
	yarn typecheck
	yarn testWithCoverage
	yarn test:tooling

integration-test:
	yarn test:integration

audit:
	yarn audit:deps

# All checks run locally. This creates a tarball and never publishes it.
release: test integration-test audit
	yarn test:package
