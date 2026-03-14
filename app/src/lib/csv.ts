export function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (inQuotes) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }

      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }

    if (char === ",") {
      row.push(field);
      field = "";
      continue;
    }

    if (char === "\n") {
      row.push(field);
      if (row.some((value) => value.trim().length > 0)) {
        rows.push(row);
      }
      row = [];
      field = "";
      continue;
    }

    if (char !== "\r") {
      field += char;
    }
  }

  row.push(field);

  if (row.some((value) => value.trim().length > 0)) {
    rows.push(row);
  }

  return rows;
}

function escapeCsvField(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

export function formatCsv(rows: string[][]) {
  return rows.map((row) => row.map(escapeCsvField).join(",")).join("\n");
}
