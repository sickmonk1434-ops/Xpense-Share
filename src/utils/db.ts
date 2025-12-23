import { createClient } from '@libsql/client/web';

const tursoUrl = process.env.EXPO_PUBLIC_TURSO_URL || '';
const tursoAuthToken = process.env.EXPO_PUBLIC_TURSO_AUTH_TOKEN || '';

export const db = createClient({
    url: tursoUrl,
    authToken: tursoAuthToken,
});
