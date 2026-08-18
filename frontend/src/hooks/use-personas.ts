import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { personaApi } from '@/lib/api/personas';
import { toast } from 'sonner';
import {
    SeniorityLevel,
    DepartmentType,
    PersonaGenerateRequest,
    OpportunityPersona,
} from '@/types/persona';

export function usePersonasList(opportunityId: string) {
    return useQuery({
        queryKey: ['personas', opportunityId],
        queryFn: () => personaApi.list(opportunityId),
        enabled: !!opportunityId,
    });
}

export function usePersonaDetail(
    opportunityId: string,
    seniority: SeniorityLevel,
    department: DepartmentType
) {
    return useQuery({
        queryKey: ['persona-detail', opportunityId, seniority, department],
        queryFn: () => personaApi.getDetail(opportunityId, seniority, department),
        enabled: !!opportunityId && !!seniority && !!department,
    });
}

export function useGeneratePersona(opportunityId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: PersonaGenerateRequest) =>
            personaApi.generate(opportunityId, payload),
        onSuccess: (data: OpportunityPersona) => {
            queryClient.setQueryData(
                ['persona-detail', opportunityId, data.seniority, data.department],
                data
            );
            queryClient.invalidateQueries({ queryKey: ['personas', opportunityId] });
            toast.success(`Playbook untuk ${data.seniority} (${data.department}) berhasil dibuat!`);
        },
        onError: (error: any) => {
            const message =
                error?.response?.data?.detail ||
                'Gagal menyusun panduan persona. Coba lagi.';
            toast.error(message);
        },
    });
}
