export function downloadCSV(rows: Record<string, any>[], filename: string) {
    if (!rows?.length) return;
    const headers = Object.keys(rows[0]);
    const csv = [
      headers.join(","),
      ...rows.map(r => headers.map(h => JSON.stringify(r[h] ?? "")).join(","))
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }
  
  export function downloadFASTA(seqs: { gene_name: string; sequence: string }[], filename: string) {
    const text = seqs.map(s => `>${s.gene_name}\n${s.sequence}`).join("\n");
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }
  
  export function matrixToLong(matrix: Record<string, Record<string, number>>) {
    const rows: { gene_name: string; sample_id: string; expression_value: number }[] = [];
    for (const [gene, samples] of Object.entries(matrix ?? {})) {
      for (const [sample, val] of Object.entries(samples)) {
        rows.push({ gene_name: gene, sample_id: sample, expression_value: val as number });
      }
    }
    return rows;
  }
  

  export function downloadBlob(data: BlobPart, filename: string, type = "text/plain;charset=utf-8") {
    const blob = new Blob([data], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }
  