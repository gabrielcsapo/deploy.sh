rm -rf operations/lib/db.json

cd test/functional/fixtures/node-app;
git init;
git add -A;
git commit -m 'initial commit';
cd ../../../../;

cd test/functional/fixtures/static-app;
git init;
git add -A;
git commit -m 'initial commit';
cd ../../../../;

cd test/functional/fixtures/main-app;
git init;
git add -A;
git commit -m 'initial commit';
cd ../../../../;

cd test/functional/fixtures/static-app-different-directory;
git init;
git add -A;
git commit -m 'initial commit';
cd ../../../../;

mocha test/index.js;
rm -rf test/functional/fixtures/node-app/.git;
rm -rf test/functional/fixtures/static-app/.git;
rm -rf test/functional/fixtures/main-app/.git;
rm -rf test/functional/fixtures/static-app-different-directory/.git;
killall node;
