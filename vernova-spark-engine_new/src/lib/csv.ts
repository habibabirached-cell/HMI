// Lightweight CSV parser shared by server functions (Node side).
export function parseCsv(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/);
  const headers = lines[0].split(",");
  return lines.slice(1).map((line) => {
    const cells = line.split(",");
    const row: Record<string, string> = {};
    headers.forEach((h, i) => (row[h] = cells[i]));
    return row;
  });
}