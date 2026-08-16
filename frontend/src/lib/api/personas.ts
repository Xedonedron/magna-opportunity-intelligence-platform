import { api } from '@/lib/api';
import {
    OpportunityPersona,
    OpportunityPersonaListResponse,
    PersonaGenerateRequest,
    SeniorityLevel,
    DepartmentType,
} from '@/types/persona';

export const personaApi = {
    list: async (opportunityId: string): Promise<OpportunityPersonaListResponse> => {
        const res = await api.get<OpportunityPersonaListResponse>(
            `/api/opportunities/${opportunityId}/personas`
        );
        return res.data;
    },

    getDetail: async (
        opportunityId: string,
        seniority: SeniorityLevel,
        department: DepartmentType
    ): Promise<OpportunityPersona | null> => {
        const res = await api.get<OpportunityPersona | null>(
            `/api/opportunities/${opportunityId}/personas/detail`,
            {
                params: { seniority, department },
            }
        );
        return res.data;
    },

    generate: async (
        opportunityId: string,
        payload: PersonaGenerateRequest
    ): Promise<OpportunityPersona> => {
        const res = await api.post<OpportunityPersona>(
            `/api/opportunities/${opportunityId}/personas/generate`,
            payload
        );
        return res.data;
    },
};