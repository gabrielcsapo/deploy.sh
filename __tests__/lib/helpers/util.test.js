import os from "os";
import fs from "fs";
import { getPort, hash, contains, mk, rm } from "../../../lib/helpers/util";

describe("@lib/util", () => {
  test("@getPort: should be able return a valid port", async () => {
    let port = await getPort();
    let port1 = await getPort();

    expect(Number.isInteger(port)).toBeTruthy();
    expect(Number.isInteger(port1)).toBeTruthy();
    expect(port !== port1).toBeTruthy();
  });

  test("@hash: should return a proper lowercase hash", () => {
    const ret = hash(6);
    expect(ret.length).toBeTruthy();
    expect(ret.toLowerCase()).toBeTruthy();
  });

  test("@contains: should be able to return a proper conditional for truthy and false cases", () => {
    expect(
      contains(
        ["index.html", "main.css"],
        ["index.html", "!Dockerfile", "!package.json"]
      )
    ).toBeTruthy();
    expect(
      contains(
        ["index.html", "main.css", "Dockerfile"],
        ["index.html", "!Dockerfile", "!package.json"]
      )
    ).toBeFalsy();
    expect(
      contains([], ["index.html", "!Dockerfile", "!package.json"])
    ).toBeFalsy();
  });

  test("@mk / @rm: should be able to make recursive directory", async () => {
    let directory = `${os.tmpdir()}/hello/world/this/is/a/nested/directory`;

    await mk(directory);

    expect(fs.existsSync(directory)).toBeTruthy();

    await rm(directory);

    expect(!fs.existsSync(directory)).toBeTruthy();
  });
});
