export function generateMarkdownTable({ headers = [], rows = [] }) {
  const separators = headers.map(() => "---");

  const table = [headers, separators, ...rows]
    .map((row) => `| ${row.join(" | ")} |`)
    .join("\n");

  return table;
}

export function getDateInPast(daysAgo) {
  const newDate = new Date();
  newDate.setDate(newDate.getDate() - daysAgo);
  return newDate.toISOString();
}
