const { it } = require("node:test");
const assert = require("node:assert/strict");
const { parseAudit } = require("../scripts/audit.cjs");

const summary = {
  type: "auditSummary",
  data: {
    vulnerabilities: { info: 0, low: 0, moderate: 0, high: 0, critical: 0 },
  },
};
const clean = () => ({ status: 0, stdout: JSON.stringify(summary) });

it("accepts a complete successful audit with no vulnerabilities", () => {
  assert.equal(parseAudit(clean()).passed, true);
});
it("rejects empty, malformed, incomplete or failed audit reports", () => {
  for (const result of [
    { status: 0, stdout: "" },
    { status: 0, stdout: "not JSON" },
    { ...clean(), stdout: clean().stdout + "\nnull" },
    { ...clean(), stdout: clean().stdout + "\n" + clean().stdout },
    {
      ...clean(),
      stdout: clean().stdout + '\n{"type":"auditAdvisory","data":{}}',
    },
    { status: 0, stdout: '{"type":"auditSummary","data":{}}' },
    { ...clean(), status: 1 },
    { ...clean(), error: new Error("network failed") },
    {
      ...clean(),
      stdout: clean().stdout + '\n{"type":"error","data":"network failed"}',
    },
  ])
    assert.equal(parseAudit(result).passed, false);
});
it("rejects a vulnerability even if the audit process unexpectedly exits successfully", () => {
  const report = JSON.parse(JSON.stringify(summary));
  report.data.vulnerabilities.high = 1;
  assert.equal(
    parseAudit({ status: 0, stdout: JSON.stringify(report) }).passed,
    false,
  );
  for (const reports of [
    [summary, report],
    [report, summary],
  ]) {
    assert.equal(
      parseAudit({
        status: 0,
        stdout: reports.map((value) => JSON.stringify(value)).join("\n"),
      }).passed,
      false,
    );
  }
});
