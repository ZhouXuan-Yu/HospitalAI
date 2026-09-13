import fs from "node:fs/promises";
import crypto from "node:crypto";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const path = "D:/WorkProject/HospitalAI/outputs/research-platform-quotation/HospitalAI医学科研智能平台功能清单及分期报价建议版.xlsx";
const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(path));

const summary = await workbook.inspect({
  kind: "table",
  range: "商务报价总览!A1:H24",
  include: "values,formulas",
  tableMaxRows: 24,
  tableMaxCols: 8,
  maxChars: 12000,
});
const selection = await workbook.inspect({
  kind: "table",
  range: "功能模块选择清单!A90:M97",
  include: "values,formulas",
  tableMaxRows: 10,
  tableMaxCols: 13,
  maxChars: 8000,
});
const errors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 300 },
  summary: "reopened workbook formula error scan",
});
const bytes = await fs.readFile(path);
const digest = crypto.createHash("sha256").update(bytes).digest("hex");
const render = await workbook.render({ sheetName: "商务报价总览", autoCrop: "all", scale: 1.1, format: "png" });
await fs.writeFile("D:/WorkProject/HospitalAI/outputs/research-platform-quotation/reopened-summary.png", new Uint8Array(await render.arrayBuffer()));

console.log(JSON.stringify({
  size: bytes.length,
  sha256: digest,
  summary: summary.ndjson,
  selection: selection.ndjson,
  errors: errors.ndjson,
}, null, 2));
