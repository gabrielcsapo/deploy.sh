import React from "react";
import clsx from "clsx";
import styles from "./styles.module.css";

const FeatureList = [
  {
    title: "Docker",
    description: (
      <>
        <pre>
          <span>$ my-app/</span>
          ls/
          <br />
          <b>Dockerfile server.go</b>
          <br />
          <span>$ my-app/</span>
          deploy
        </pre>
      </>
    ),
  },
  {
    title: "Node.js",
    description: (
      <>
        <pre>
          <span>$ my-api/</span>
          ls
          <br />
          <b>package.json index.js</b>
          <br />
          <span>$ my-api/</span>
          deploy
        </pre>
      </>
    ),
  },
  {
    title: "Static Websites",
    description: (
      <>
        <pre>
          <span>$ my-site/</span>
          ls
          <br />
          <b>index.html logo.png</b>
          <br />
          <span>$ my-site/</span>
          deploy
        </pre>
      </>
    ),
  },
];

function Feature({ title, description }) {
  return (
    <div className={clsx("col col--4 text--left")}>
      <div className="padding-horiz--md">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures() {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
