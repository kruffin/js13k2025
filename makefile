version := 1.0.4
FILE_NAME=bcat_survivor

CHECK_FILE_SIZE= (\
	FSIZE=$$(du -b ./builds/${FILE_NAME}_${version}.prod.zip | cut -f 1); \
	LEFTOVER=$$((13312 - $${FSIZE})); \
	echo "===>File size: [$${FSIZE}]; [$${LEFTOVER}] left"; \
    if [ $$FSIZE -lt 13312 ]; then \
		echo "===>Under 13k; good job!";\
	else\
		echo "===>Over 13k :( get to slimming";\
	fi)

build:
	advpng -z -4 -i 20 ./assets/*.png
	mkdir -p ./builds/tmp/scripts
	esbuild ./scripts/game.js --bundle --minify --format=iife --outfile=./builds/tmp/scripts/game.js
	zip -r ./builds/${FILE_NAME}_${version}.prod.zip assets index.html
	env -C ${PWD}/builds/tmp zip -r -g ../${FILE_NAME}_${version}.prod.zip ./scripts
	advzip -z -4 -i 20 ./builds/${FILE_NAME}_${version}.prod.zip
	@$(CHECK_FILE_SIZE)
server:
	python3 -m http.server -b 127.0.0.1
