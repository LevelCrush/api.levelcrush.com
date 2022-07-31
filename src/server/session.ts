export interface APISession {
    user?: {
        token: string; // the token that we are associating with our user
        logged_in: number; // timestamp of when the user was logged in
    };
    applications?: {
        [appName: string]: {};
    };
}
