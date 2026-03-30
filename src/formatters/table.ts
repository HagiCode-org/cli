export type TableColumn<T> = {
  header: string;
  value: (row: T) => string;
};

function normalizeCell(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

export function renderTable<T>(columns: TableColumn<T>[], rows: T[]): string {
  const normalizedRows = rows.map(row =>
    columns.map(column => normalizeCell(column.value(row))),
  );

  const widths = columns.map((column, index) => {
    const cellWidths = normalizedRows.map(row => row[index].length);
    return Math.max(column.header.length, ...cellWidths);
  });

  const renderLine = (cells: string[]) =>
    cells
      .map((cell, index) => cell.padEnd(widths[index]))
      .join('  ')
      .trimEnd();

  return [
    renderLine(columns.map(column => column.header)),
    renderLine(widths.map(width => '-'.repeat(width))),
    ...normalizedRows.map(renderLine),
  ].join('\n');
}

export function renderKeyValueTable(rows: Array<[string, string | undefined]>): string {
  const filteredRows = rows.filter(([, value]) => value !== undefined && value !== '');
  const keyWidth = Math.max(...filteredRows.map(([key]) => key.length));

  return `${filteredRows
    .map(([key, value]) => `${key.padEnd(keyWidth)}  ${normalizeCell(value ?? '')}`)
    .join('\n')}\n`;
}
