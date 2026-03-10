.PHONY: install setup dev

install:
	npm install --prefix admin-app
	npm install --prefix client-app

setup:
	./setup-env.sh

dev:
	# start admin on 5170 and client on 5171 (ports fixed in each app's vite.config.ts)
	npm run dev --prefix admin-app &
	npm run dev --prefix client-app &
	wait
