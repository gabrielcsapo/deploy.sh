# UNRELEASED

- adds the ability to delete deployment and its assets 

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
