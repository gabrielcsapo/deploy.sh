# 1.0.0 (01/27/2018)

- sub directories would cause deploy to fail, now recursively find the strings and add them manually
- delete should delete the current working directories deployment if not specified
- Deployment.del removes the instance metadata from the database using the correct query params
- refactors CLI to be a class
- moves from easy-table to turtler
- fixes login and logout functionality was mixed on cli
- by default the open command will open the current directory if it is deployed
- by default the log command will open the current directory if it is deployed
- logs no longer have a `-` preceding each line
- logs trim white space instead of adding an empty line
- delete API actually works now, instead of continuously hanging
- removes; mkdirp, easy-table, async
- adds tryitout for docs page generation
- config is now stored in `${homedir}/.deployrc`
- getCredentials and cacheCredentials are no longer blocking calls, they will happen async
- all error responses from the server will contain an error object
- not-found (application not deployed) and page-could-not-load (proxy errors) pages are now moved into a static directory
- main landing page is rendered with tryitout

# 0.2.1 (08/15/2017)

- adds the ability to delete deployment and its assets
- be able to get container status by querying the container on the get call (add to decorator function) is now visible when running (deploy ls) as a status column

# 0.2.0 (08/14/2017)

- deployment model now contains amount of requests
- stops overloading Deployment.get and breaks out functionality into Deployment.get and Deployment.getAll
- the request model now captures the http verb associated with the request
- now captures statusCode for responses in the request model
- startup and shutdown is now coordinated and less prone to breaking

# 0.1.1 (08/13/2017)

- now is packaged as a universal binary
- fixes failure when no logs are retrieved from server

# 0.1.0 (08/13/2017)

- adds api and cli action to be able retrieve logs
- deals with cleaning up old images
- deletes image and container when application is being redeployed
- further consolidates deployment logic into the deployment model
- starts up containers from cold start
- shuts down containers when process is closing
- adds caching to static-server
- abstract models into their own files and their own collections
- fixes the middleware request logger
- fixes CLI responses
- adds whoami functionality that will show the current logged in user (`deploy whoami`)

# 0.0.1 (08/08/2017)

- basic functionality working
