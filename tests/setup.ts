import config, { IConfig } from "../src/config";
import chaiAsPromised from "chai-as-promised";
import * as chai from "chai";
import nock from "nock";
import sinon from "sinon";

import { mockContexts } from "./mocks";
import { runtimeClear } from "../src/cache";

let windowDescriptor: PropertyDescriptor | undefined;
before(() => {
  nock.disableNetConnect();
  chai.use(chaiAsPromised);
});
beforeEach(() => {
  windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, "window");
  runtimeClear();
});
afterEach(() => {
  try {
    const pending = nock.pendingMocks();
    chai.expect(pending, `unconsumed HTTP expectations: ${pending.join(", ")}`).to.eql([]);
  } finally {
    nock.abortPendingRequests();
    nock.cleanAll();
    sinon.restore();
    if (windowDescriptor) Object.defineProperty(globalThis, "window", windowDescriptor);
    else delete globalThis["window"];
    runtimeClear();
  }
});

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

  beforeEach(() => {
    mockContexts(conf);
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
