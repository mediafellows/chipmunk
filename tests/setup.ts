import config, { IConfig } from "../src/config";
import chaiAsPromised from "chai-as-promised";
import chai from "chai";
import nock from "nock";
import yaml from "js-yaml";
import { execSync } from "child_process";
import sinon from "sinon";

import { mockContexts } from "./mocks";

const DEFAULT_CONFIG = {
  //verbose: true,
  timestamp: null,
  headers: {
    "Affiliation-Id": "mpx",
  },
  endpoints: {
    um: "https://um.api.mediapeers.mobi",
    pm: "https://pm.api.mediapeers.mobi",
    am: "https://am.api.mediapeers.mobi",
    ac: "https://ac.api.mediapeers.mobi",
    sm: "https://sm.api.mediapeers.mobi",
    mc: "https://mc.api.mediapeers.mobi",
    my: "https://my.api.mediapeers.mobi",
    tuco: "https://tuco.api.mediapeers.mobi",
  },
};

export const setup = (overrides?: Partial<IConfig>): IConfig => {
  const conf = config(DEFAULT_CONFIG, overrides);

  before(() => {
    nock.cleanAll();
    mockContexts(conf);
    chai.use(chaiAsPromised);
  });

  afterEach(() => {
    sinon.restore();
  });

  return conf;
};

export const nap = async (milliseconds: number = 100): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
};

export const matches = (needle: string) => {
  return (uri) => uri.includes(needle);
};

export const readCredentials = () => {
  const content = execSync("scrambler read tests/credentials.yml").toString();
  return yaml.safeLoad(content);
};
