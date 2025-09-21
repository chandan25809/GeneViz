import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import { endpoints } from "../api/endpoints";

export type Seq = { gene_name: string; sequence: string };

export const useSequences = (projectId?: number, datasetId?: number, genes: string[] = []) =>
  useQuery({
    queryKey: ["sequences", projectId, datasetId, genes],
    enabled: !!projectId && !!datasetId && genes.length > 0,
    queryFn: async () => {
      const qs = new URLSearchParams({
        project: String(projectId),
        dataset: String(datasetId),
        genes: genes.join(","),
      }).toString();
      return (await api.get(`${endpoints.sequences}?${qs}`)).data as Seq[];
    },
  });
