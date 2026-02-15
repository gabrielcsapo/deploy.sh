export default function Component() {
  return (
    <article className="prose max-w-none">
      <h1>CLI Reference</h1>
      <p>
        The deploy.sh CLI lets you deploy and manage applications from your terminal. All commands
        accept a <code>-u</code> flag to specify the server URL (defaults to{' '}
        <code>http://localhost</code>).
      </p>

      <h2>deploy</h2>
      <p>Deploy the current directory.</p>
      <pre>
        <code>
          {`deploy
deploy -app my-app
deploy -u https://my-server.local:5000`}
        </code>
      </pre>
      <table>
        <thead>
          <tr>
            <th>Flag</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>-app, --application</code>
            </td>
            <td>Set the application name (defaults to directory name).</td>
          </tr>
          <tr>
            <td>
              <code>-u, --url</code>
            </td>
            <td>deploy.sh server URL.</td>
          </tr>
        </tbody>
      </table>

      <h2>deploy list</h2>
      <p>List all your deployments.</p>
      <pre>
        <code>deploy list</code>
      </pre>

      <h2>deploy logs</h2>
      <p>Stream logs from a running deployment.</p>
      <pre>
        <code>deploy logs -app my-app</code>
      </pre>

      <h2>deploy delete</h2>
      <p>Stop and remove a deployment.</p>
      <pre>
        <code>deploy delete -app my-app</code>
      </pre>

      <h2>deploy open</h2>
      <p>Open a deployment in your browser.</p>
      <pre>
        <code>deploy open -app my-app</code>
      </pre>

      <h2>deploy register</h2>
      <p>Create a new user account on the server.</p>
      <pre>
        <code>deploy register</code>
      </pre>

      <h2>deploy login</h2>
      <p>
        Authenticate with the server. Credentials are saved to <code>~/.deployrc</code>.
      </p>
      <pre>
        <code>deploy login</code>
      </pre>

      <h2>deploy logout</h2>
      <p>Log out and invalidate your session token.</p>
      <pre>
        <code>deploy logout</code>
      </pre>

      <h2>deploy whoami</h2>
      <p>Show the currently logged-in user.</p>
      <pre>
        <code>deploy whoami</code>
      </pre>

      <h2>deploy server</h2>
      <p>
        Start the deploy.sh server. This launches both the API and the web dashboard in a single
        process.
      </p>
      <pre>
        <code>
          {`deploy server
deploy server -p 3000`}
        </code>
      </pre>
      <table>
        <thead>
          <tr>
            <th>Flag</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>-p, --port</code>
            </td>
            <td>Port to listen on (default: 80).</td>
          </tr>
        </tbody>
      </table>
    </article>
  );
}
