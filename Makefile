NODE_BIN ?= $(HOME)/.nvm/versions/node/v18.*/bin
NPM       ?= $(NODE_BIN)/npm

install:
    @if [ ! -x "$(NPM)" ]; then echo "Ensure Node.js 18 is active via nvm."; exit 1; fi
    @rm -rf node_modules package-lock.json
    @$(NPM) install
    @$(NPM) install --save-dev typescript

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