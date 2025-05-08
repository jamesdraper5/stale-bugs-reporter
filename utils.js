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

export function formatPriority(priority) {
  if (!priority) {
    return "No Priority";
  }

  const priorityMap = {
    high: ":heart: High",
    medium: ":yellow_heart: Medium",
    low: ":green_heart: Low",
  };

  if (priorityMap[priority]) {
    return priorityMap[priority];
  }

  return "";
}
