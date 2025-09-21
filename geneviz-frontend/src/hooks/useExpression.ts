import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import { endpoints } from "../api/endpoints";

export type ExpressionRow = { gene_name: string; sample_id: string; expression_value: number };

export const useExpression = (projectId?: number, datasetId?: number, genes: string[] = [], samples?: string[]) =>
  useQuery({
    queryKey: ["expression", projectId, datasetId, genes, samples],
    enabled: !!projectId && !!datasetId && genes.length > 0,
    queryFn: async () => {
      const qs = new URLSearchParams({
        project: String(projectId),
        dataset: String(datasetId),
        genes: genes.join(","),
      });
      if (samples?.length) qs.set("samples", samples.join(","));
      const { data } = await api.get(`${endpoints.expression}?${qs.toString()}`);
      return data as ExpressionRow[];
    },
  });
