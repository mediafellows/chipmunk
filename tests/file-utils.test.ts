import "mocha";
import { expect } from "chai";
import sinon from "sinon";
import { handleFileDownload, isDownloadFileRequest } from "../src/file-utils";
import { setup } from "./setup";

setup();
describe("browser download contract", () => {
  let documentDescriptor: PropertyDescriptor | undefined;
  let anchor, body, createObjectURL, revokeObjectURL;
  beforeEach(() => {
    documentDescriptor = Object.getOwnPropertyDescriptor(
      globalThis,
      "document",
    );
    anchor = { href: "", download: "", parentNode: null, click: sinon.stub() };
    body = {
      appendChild: sinon.stub().callsFake((element) => {
        element.parentNode = body;
      }),
      removeChild: sinon.stub().callsFake((element) => {
        element.parentNode = null;
      }),
    };
    createObjectURL = sinon.stub().returns("blob:download-test");
    revokeObjectURL = sinon.stub();
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: { URL: { createObjectURL, revokeObjectURL } },
    });
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: { body, createElement: sinon.stub().returns(anchor) },
    });
  });
  afterEach(() => {
    if (documentDescriptor)
      Object.defineProperty(globalThis, "document", documentDescriptor);
    else delete globalThis["document"];
  });

  for (const [headers, expected] of [
    [
      { "content-disposition": 'attachment; filename="report.pdf"' },
      "report.pdf",
    ],
    [
      { "content-disposition": "attachment; filename=report.zip" },
      "report.zip",
    ],
    [
      { "content-disposition": "attachment; filename*=UTF-8''caf%C3%A9.pdf" },
      "café.pdf",
    ],
    [
      {
        "content-disposition": `attachment; filename="fallback.pdf"; filename*=UTF-8''caf%C3%A9.pdf`,
      },
      "café.pdf",
    ],
    [
      { "content-disposition": 'attachment; filename="semi;colon.pdf"' },
      "semi;colon.pdf",
    ],
    [
      {
        "content-disposition": `attachment; filename="fallback.pdf"; filename*=UTF-8''bad%ZZ`,
      },
      "fallback.pdf",
    ],
    [{ "content-type": "application/pdf" }, "download.pdf"],
    [{ "content-type": "application/zip" }, "download.zip"],
    [
      {
        "content-type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
      "download.xlsx",
    ],
    [{}, "download"],
  ] as [Record<string, string>, string][]) {
    it(`chooses ${expected} from ${JSON.stringify(headers)}`, () => {
      const result = handleFileDownload(headers, new Uint8Array([0, 255]));
      expect(anchor.download).to.equal(expected);
      expect(anchor.click.calledOnce).to.equal(true);
      expect(body.removeChild.calledOnceWithExactly(anchor)).to.equal(true);
      expect(
        revokeObjectURL.calledOnceWithExactly("blob:download-test"),
      ).to.equal(true);
      expect(result).to.eql({
        objects: [],
        object: null,
        headers,
        type: "download",
      });
    });
  }

  it("preserves binary bytes and the content type", async () => {
    handleFileDownload(
      { "content-type": "application/pdf" },
      new Uint8Array([0, 128, 255]),
    );
    const blob: Blob = createObjectURL.firstCall.args[0];
    expect(blob.type).to.equal("application/pdf");
    expect(Array.from(new Uint8Array(await blob.arrayBuffer()))).to.eql([
      0, 128, 255,
    ]);
  });

  it("reuses an existing Blob", () => {
    const blob = new Blob(["pdf"], { type: "application/pdf" });
    handleFileDownload({}, blob);
    expect(createObjectURL.firstCall.args[0]).to.equal(blob);
  });

  it("cleans up the anchor and object URL even when clicking fails", () => {
    anchor.click.throws(new Error("click failed"));
    expect(() => handleFileDownload({}, "data")).to.throw("click failed");
    expect(body.removeChild.calledOnceWithExactly(anchor)).to.equal(true);
    expect(
      revokeObjectURL.calledOnceWithExactly("blob:download-test"),
    ).to.equal(true);
  });

  it("recognizes supported download response headers", () => {
    for (const type of [
      "application/octet-stream",
      "application/pdf",
      "application/zip",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ]) {
      expect(Boolean(isDownloadFileRequest({ "content-type": type }))).to.equal(
        true,
      );
    }
    expect(
      Boolean(isDownloadFileRequest({ "content-disposition": "attachment" })),
    ).to.equal(true);
    expect(
      Boolean(isDownloadFileRequest({ "content-type": "application/json" })),
    ).to.equal(false);
    expect(Boolean(isDownloadFileRequest({}))).to.equal(false);
  });
});
