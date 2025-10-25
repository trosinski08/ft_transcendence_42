NODE_BIN ?= $(firstword $(wildcard $(HOME)/.nvm/versions/node/v18.*/bin))
NPM      ?= $(if $(NODE_BIN),$(NODE_BIN)/npm)


nvm-install:
	@curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
	@echo 'export NVM_DIR="$$HOME/.nvm"' >> $$HOME/.zshrc
	@echo '[ -s "$$NVM_DIR/nvm.sh" ] && . "$$NVM_DIR/nvm.sh"' >> $$HOME/.zshrc
	@echo '[ -s "$$NVM_DIR/bash_completion" ] && . "$$NVM_DIR/bash_completion"' >> $$HOME/.zshrc
	@export NVM_DIR="$$HOME/.nvm" && . "$$NVM_DIR/nvm.sh" && nvm install 18.20.8 && nvm alias default 18.20.8


install:
	@if [ -z "$(NPM)" ] || [ ! -x "$(NPM)" ]; then echo "Ensure Node.js 18 is active via nvm."; exit 1; fi
	@rm -rf node_modules package-lock.json
	@$(NPM) install
	@$(NPM) install --save-dev typescript
# ...existing rules...



start:
	@$(NPM) run start

build:
	@$(NPM) run build

typecheck:
	@$(NPM) run typecheck

docker-build:
	@docker build -f Dockerfile.prod -t ft-transcendence .

docker-up:
	@cd nginx/ssl && ./generate-cert.sh && cd -
	@docker compose up --build -d

docker-down:
	@docker compose down -v --remove-orphans