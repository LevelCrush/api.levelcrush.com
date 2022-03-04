export interface ENV {
    server?: {
        session?: {
            ttl?: 86400 | number;
            secret?: string;
        };
        ssl?: {
            key: string;
            cert: string;
        };
        port?: number;
    };
}

export default ENV;
