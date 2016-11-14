cd test/fixtures/node-app;
git init;
git add -A;
git commit -m 'initial commit';
cd ../../../;

cd test/fixtures/static-app;
git init;
git add -A;
git commit -m 'initial commit';
cd ../../../;

cd test/fixtures/main-app;
git init;
git add -A;
git commit -m 'initial commit';

cd ../../../;
cd test/fixtures/static-app-different-directory;
git init;
git add -A;
git commit -m 'initial commit';
cd ../../../;

mocha test/index.js;
rm -rf test/fixtures/node-app/.git;
rm -rf test/fixtures/static-app/.git;
rm -rf test/fixtures/main-app/.git;
rm -rf test/fixtures/static-app-different-directory/.git;
killall node;
