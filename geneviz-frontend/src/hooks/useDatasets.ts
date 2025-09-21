import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import { endpoints } from "../api/endpoints";

export type Dataset = { id: number; name: string; is_default: boolean; project: number };

export function useDatasets(projectId?: number) {
  return useQuery({
    queryKey: ["datasets", projectId ?? "all"],
    queryFn: async () => {
      const url = projectId ? `${endpoints.datasets}?project=${projectId}` : endpoints.datasets;
      const { data } = await api.get<Dataset[]>(url);
      return data;
    },
    enabled: true,
  });
}
