export type SeniorityLevel =
    | 'Staff'
    | 'Manager'
    | 'Head'
    | 'VP'
    | 'Director/C-Level'
    | 'Others'
    | (string & {});

export type DepartmentType =
    | 'IT'
    | 'Finance'
    | 'Operations'
    | 'HR'
    | 'Marketing'
    | 'Others'
    | (string & {});

export interface FocusAreaItem {
    title: string;
    description: string;
}

export interface PersonaQuestionItem {
    category: string;
    question: string;
    purpose: string;
}

export interface ObjectionItem {
    objection: string;
    response: string;
}

export interface OpportunityPersona {
    id: string;
    opportunity_id: string;
    seniority: SeniorityLevel;
    department: DepartmentType;
    focus_areas: FocusAreaItem[];
    questions: PersonaQuestionItem[];
    value_props: string[];
    objection_handling: ObjectionItem[];
    created_at: string;
    updated_at: string;
}

export interface PersonaGenerateRequest {
    seniority: SeniorityLevel;
    department: DepartmentType;
    force_regenerate?: boolean;
}

export interface OpportunityPersonaListResponse {
    items: OpportunityPersona[];
    total: number;
}