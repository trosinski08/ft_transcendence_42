#!/usr/bin/env bash
set -e
openssl req -x509 -nodes -days 365 \
  -subj "/C=PL/ST=Local/L=Local/O=Dev/OU=Dev/CN=localhost" \
  -newkey rsa:2048 -keyout server.key -out server.crt
