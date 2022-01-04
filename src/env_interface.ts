export interface ENV {
    server?: {
        session?: {
            ttl?: 86400 | number;
            secret?: string;
        };
    };
}

export default ENV;
