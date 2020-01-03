#!/bin/bash

npm run start &
wait-on http://localhost:8080

if [[ "$TRAVIS_COMMIT_MESSAGE" == *"[dev-build]"* ]]; then 
    npm run test:cypress:smoke
else 
    npm run test:cypress
fi  

if [["$TRAVIS_BRANCH" != "master"]]; then
    npm run test:cypress:branch
else 
    npm run test:cypress
fi     