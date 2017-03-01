const gitserver = require('node-git-server');
const path = require('path');

const getPort = require('./getPort');
const npmInstall = require('./npmInstall');
const gitClone = require('./gitClone');
const startApplication = require('./startApplication');

module.exports = (directory) => {
    return new Promise(function(resolve, reject) {
      const server = gitserver(path.resolve(directory, 'repos'));
      const port = process.env.PORT || 7005;

      server.on('push', (push) => {
          console.log(`push ${push.repo} / ${push.commit} (${push.branch})`); // eslint-disable-line
          push.accept();

          const name = push.repo.replace('.git', '');
          // Should deploy the application
          if (push.branch === 'master') {
              // need to set timeout for files to be completely written to disk before clone
              setTimeout(() => {
                  return Promise.resolve({})
                      .then(() => {
                          // Clone the application into the application directory
                          return gitClone(`${directory}/repos/${push.repo}`, `${directory}/apps/${name}`);
                      })
                      .then(() => {
                          // Install the application
                          return npmInstall(`${directory}/apps/${name}`);
                      })
                      .then(() => {
                          // Get a port to run the application on
                          return getPort();
                      })
                      .then((port) => {
                          // Start the process with pm2
                          const config = require(path.resolve(directory, 'apps', name, 'distribute.json'));
                          const cwd = path.resolve(directory, 'apps', name);
                          startApplication(config, cwd, port);
                      })
                      .catch((ex) => {
                          console.error(ex); // eslint-disable-line
                      });
              }, 1000);
          }
      });

      server.on('fetch', (fetch) => {
          // Do not let anyone fetch from git repos on this server
          fetch.reject();
      });

      server.listen(port, (err) => {
          if(err) return reject(err);

          console.log(`node-git-server running at http://localhost:${port}`); // eslint-disable-line
          resolve(server);
      });
    });
};
