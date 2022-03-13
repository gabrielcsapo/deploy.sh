const path = require("path");

const classifier = require("../../lib/classifier");

describe("@lib/classifier", () => {
  const baseDirectory = path.resolve(__dirname, "..", "..", "examples");

  test("should be able to classify static site", async () => {
    const directory = path.resolve(baseDirectory, "static");
    const output = await classifier(directory);

    expect(output).toEqual({
      type: "static",
      build: `\n        FROM mhart/alpine-node:base-8\n        WORKDIR ${directory}\n        ADD . .\n\n        CMD ["node", "index.js"]\n      `,
    });
  });

  test("should be able to classify node site", async () => {
    const directory = path.resolve(baseDirectory, "node");
    const output = await classifier(directory);

    expect(output).toEqual({
      type: "node",
      build: `\n        FROM mhart/alpine-node:8\n        WORKDIR ${directory}\n        ADD . .\n\n        RUN npm install\n\n        CMD ["npm", "start"]\n      `,
    });
  });

  test("should be able to classify docker site", async () => {
    const directory = path.resolve(baseDirectory, "docker");
    const output = await classifier(directory);

    expect(output).toEqual({
      type: "docker",
      build: `FROM mhart/alpine-node:8\nWORKDIR ${directory}\nADD . .\n\nCMD ["node", "index.js"]\n`,
    });
  });

  test("should be able to classify unknown deploy target", async () => {
    const directory = path.resolve(
      path.resolve(__dirname, "..", "fixtures"),
      "unknown"
    );
    const output = await classifier(directory);

    expect(output).toEqual({
      type: "unknown",
    });
  });
});
