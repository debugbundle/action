.PHONY: test
test:
	docker run --rm -v "$(CURDIR):/app" -w /app node:24-alpine node --test test/action.test.mjs
