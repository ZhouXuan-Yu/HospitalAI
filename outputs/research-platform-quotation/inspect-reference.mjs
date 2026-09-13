import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const source = "D:/Winxin/Message/xwechat_files/wxid_y435mepif0l922_a1e0/msg/file/2026-08/首批重构模块选择清单-分期报价版.xlsx";
const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(source));

const overview = await workbook.inspect({
  kind: "workbook,sheet,table,drawing",
  include: "id,name,values,formulas",
  tableMaxRows: 25,
  tableMaxCols: 20,
  tableMaxCellChars: 120,
  maxChars: 20000,
});
await fs.writeFile("reference-inspect.ndjson", overview.ndjson, "utf8");
console.log(overview.ndjson);

const sheets = JSON.parse(`[${overview.ndjson.trim().split("\n").filter(Boolean).join(",")}]`)
  .filter((item) => item.kind === "sheet")
  .map((item) => item.name);

for (let index = 0; index < sheets.length; index += 1) {
  const sheetName = sheets[index];
  const rendered = await workbook.render({ sheetName, autoCrop: "all", scale: 1.2, format: "png" });
  await fs.writeFile(`reference-${String(index + 1).padStart(2, "0")}.png`, new Uint8Array(await rendered.arrayBuffer()));
  console.log(`RENDERED:${sheetName}`);
}
