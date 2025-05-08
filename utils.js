export function generateMarkdownTable({ headers = [], rows = [] }) {
  const separators = headers.map(() => "---");

  const table = [headers, separators, ...rows]
    .map((row) => `| ${row.join(" | ")} |`)
    .join("\n");

  return table;
}
