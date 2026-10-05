// Run Yarn's lockfile audit and fail closed if its report is missing or malformed.
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");

function parseAudit(result) {
  const records = [];
  let parseError = false;
  for (const line of (result.stdout || "").split("\n").filter(Boolean)) {
    try {
      const record = JSON.parse(line);
      if (!record || typeof record.type !== "string") parseError = true;
      else records.push(record);
    } catch {
      parseError = true;
    }
  }
  const summaries = records.filter((record) => record.type === "auditSummary");
  if (summaries.length !== 1) parseError = true;
  const summary = summaries[0]?.data;
  const levels = ["info", "low", "moderate", "high", "critical"];
  const valid =
    summary &&
    levels.every(
      (level) =>
        Number.isInteger(summary.vulnerabilities?.[level]) &&
        summary.vulnerabilities[level] >= 0,
    );
  const advisoryRecords = records.filter(
    (record) => record.type === "auditAdvisory",
  );
  const validAdvisories = advisoryRecords.filter(
    (record) => record.data?.advisory?.id != null,
  );
  if (validAdvisories.length !== advisoryRecords.length) parseError = true;
  const advisories = [
    ...new Map(
      validAdvisories.map((record) => {
        const advisory = record.data.advisory;
        return [
          advisory.id,
          {
            id: advisory.id,
            package: advisory.module_name,
            severity: advisory.severity,
            title: advisory.title,
            affected: advisory.vulnerable_versions,
            patched: advisory.patched_versions,
            url: advisory.url,
          },
        ];
      }),
    ).values(),
  ];
  const errors = records
    .filter((record) => record.type === "error")
    .map((record) => record.data);
  const passed =
    !result.error &&
    result.status === 0 &&
    !parseError &&
    valid &&
    errors.length === 0 &&
    levels.every((level) => summary.vulnerabilities[level] === 0) &&
    advisories.length === 0;
  return {
    passed: Boolean(passed),
    exitCode: result.status,
    summary,
    advisories,
    errors,
    parseError,
    processError: result.error?.message,
  };
}

module.exports = { parseAudit };
if (require.main === module) {
  const result = spawnSync("yarn", ["audit", "--json"], {
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });
  const report = parseAudit(result);
  fs.mkdirSync(".artifacts", { recursive: true });
  fs.writeFileSync(
    ".artifacts/audit.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(
    JSON.stringify({
      passed: report.passed,
      vulnerabilities: report.summary?.vulnerabilities,
      errors: report.errors,
      processError: report.processError,
    }),
  );
  if (!report.passed) {
    report.advisories.forEach((advisory) =>
      console.error(
        `${advisory.package}: ${advisory.severity}: ${advisory.title} (${advisory.url})`,
      ),
    );
    console.error("Dependency audit failed; see .artifacts/audit.json");
    process.exitCode = 1;
  }
}
