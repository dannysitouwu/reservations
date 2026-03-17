.PHONY: install setup dev dev-admin dev-client

install:
	npm install --prefix admin-app
	npm install --prefix client-app

setup:
	./setup-env.sh

dev:
	# start admin on 5170 only (default)
	npm run dev --prefix admin-app

dev-admin:
	# start admin on 5170 only
	npm run dev --prefix admin-app

dev-client:
	# start client on 5171 only
	npm run dev --prefix client-app
