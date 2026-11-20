// types.ts


export type Category = {
    id: string; // Added ID for reliable keying in lists
    name: string;
    description?: string;
    order: number;
    nominees: Nominee[];
}

export type BallotFormData = {
    event_id: string;
    name: string;
    opens_at: string; // ISO string for datetime-local input
    closes_at: string;
    categories: Category[];
}

export type EventOption = {
    id: string;
    name: string;
    date: string;
}

// types.ts

export type Nominee = {
    id: string;
    display_name: string; // The main name (e.g., "Barbie")
    secondary_text?: string; // The values combined (e.g., "Margot Robbie, Ryan Gosling")
    user_ids: string[]; // Linked real users
    is_preset?: boolean; // To distinguish visually
}