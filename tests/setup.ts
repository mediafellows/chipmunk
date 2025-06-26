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
    um: "https://um.api.mediastore.dev",
    pm: "https://pm.api.mediastore.dev",
    am: "https://am.api.mediastore.dev",
    ac: "https://ac.api.mediastore.dev",
    sm: "https://sm.api.mediastore.dev",
    mc: "https://mc.api.mediastore.dev",
    my: "https://my.api.mediastore.dev",
    tuco: "https://tuco.api.mediastore.dev",
  },
};

export const setup = (overrides?: Partial<IConfig>): IConfig => {
  const conf = config(DEFAULT_CONFIG, overrides);

  before(() => {
    nock.disableNetConnect();
    chai.use(chaiAsPromised);
  });

  beforeEach(() => {
    mockContexts(conf);
  });

  afterEach(() => {
    sinon.restore();
    nock.cleanAll();
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

export const readCredentials = (): { [s:string]: string } => {
  const content = execSync("scrambler read tests/credentials.yml").toString();
  return yaml.safeLoad(content) as { [s:string]: string };
};
