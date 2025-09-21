import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import { endpoints } from "../api/endpoints";

export type Matrix = Record<string, Record<string, number>>;

export const useMatrix = (projectId?: number, datasetId?: number, genes: string[] = []) =>
  useQuery({
    queryKey: ["matrix", projectId, datasetId, genes],
    enabled: !!projectId && !!datasetId && genes.length > 0,
    queryFn: async () => {
      const qs = new URLSearchParams({
        project: String(projectId),
        dataset: String(datasetId),
        genes: genes.join(","),
      }).toString();
      return (await api.get(`${endpoints.matrix}?${qs}`)).data as Matrix;
    },
  });
