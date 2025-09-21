import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import { endpoints } from "../api/endpoints";

export const useGenes = (projectId?: number, datasetId?: number) =>
  useQuery({
    queryKey: ["genes", projectId, datasetId],
    enabled: !!projectId && !!datasetId,
    queryFn: async () => (await api.get(`${endpoints.genes}?project=${projectId}&dataset=${datasetId}`)).data as string[],
  });

export const useSamples = (projectId?: number, datasetId?: number) =>
  useQuery({
    queryKey: ["samples", projectId, datasetId],
    enabled: !!projectId && !!datasetId,
    queryFn: async () => (await api.get(`${endpoints.samples}?project=${projectId}&dataset=${datasetId}`)).data as string[],
  });
