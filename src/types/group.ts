export interface Profile {
    id: string;
    email: string | null;
    full_name: string | null;
    avatar_url: string | null;
    updated_at: string;
}

export interface Group {
    id: string;
    name: string;
    created_by: string;
    created_at: string;
    member_count?: number;
}

export interface GroupMember {
    id: string;
    group_id: string;
    user_id: string;
    joined_at: string;
    profile?: Profile;
}

export interface Invitation {
    id: string;
    group_id: string;
    inviter_id: string;
    invitee_id: string;
    status: 'pending' | 'accepted' | 'rejected';
    created_at: string;
    invitee_email?: string; // For display if joined result
    invitee_name?: string;
}
