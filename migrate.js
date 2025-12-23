
const { createClient } = require('@libsql/client');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env
dotenv.config();

const tursoUrl = process.env.EXPO_PUBLIC_TURSO_URL;
const tursoAuthToken = process.env.EXPO_PUBLIC_TURSO_AUTH_TOKEN;

if (!tursoUrl || !tursoAuthToken) {
    console.error("Error: EXPO_PUBLIC_TURSO_URL and EXPO_PUBLIC_TURSO_AUTH_TOKEN must be set in .env");
    process.exit(1);
}

const client = createClient({
    url: tursoUrl,
    authToken: tursoAuthToken,
});

async function migrate() {
    try {
        const schemaPath = path.join(__dirname, 'turso_schema.sql');
        const sql = fs.readFileSync(schemaPath, 'utf8');

        // Split SQL into individual statements (basic split by semicolon)
        // Note: This is a simple parser, skip empty lines and comments if possible
        const statements = sql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0);

        console.log(`Starting migration for ${tursoUrl}...`);

        for (const statement of statements) {
            console.log(`Executing: ${statement.substring(0, 50)}...`);
            await client.execute(statement);
        }

        console.log("✅ Migration completed successfully!");
    } catch (err) {
        console.error("❌ Migration failed:", err);
    } finally {
        // client.close() is not always needed for http client but good practice if available
    }
}

migrate();
