#!/bin/sh
# Repo-local only. Does not touch global git config.
set -e
root=$(git rev-parse --show-toplevel)
cd "$root"
git config core.hooksPath .githooks
git config user.name "iamtunji"
git config user.email "66530516+iamtunji@users.noreply.github.com"
chmod +x .githooks/pre-commit .githooks/pre-push
echo "local author: iamtunji <66530516+iamtunji@users.noreply.github.com>"
echo "hooksPath: .githooks"
