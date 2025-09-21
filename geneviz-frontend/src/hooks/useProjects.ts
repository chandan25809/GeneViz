import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import { endpoints } from "../api/endpoints";

export function useProjects() {
  return useQuery({
    queryKey: ["projects"],
    queryFn: async () => (await api.get(endpoints.projects)).data as { id: number; name: string }[],
  });
}
export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => (await api.post(endpoints.projects, { name })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects"] }),
  });
}
