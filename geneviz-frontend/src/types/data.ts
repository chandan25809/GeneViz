export type Matrix = Record<string, Record<string, number>>;

export type LongRow = {
  gene_name: string;
  sample_id: string;
  expression_value: number;
};
