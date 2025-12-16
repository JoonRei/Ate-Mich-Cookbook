import { neon } from '@netlify/neon';

// The client automatically picks up the NETLIFY_DATABASE_URL environment variable
const sql = neon();

// Define the handler function
export default async (event, context) => {
    // Determine the HTTP method
    const method = event.httpMethod;

    try {
        if (method === 'GET') {
            // --- GET: Fetch all recipes ---
            
            // NOTE: We assume you have a table named 'recipes' in your Neon database.
            // If you don't have this table yet, you need to create it!
            const recipes = await sql`SELECT * FROM recipes ORDER BY created_at DESC`;

            return {
                statusCode: 200,
                body: JSON.stringify(recipes),
                headers: { 'Content-Type': 'application/json' },
            };

        } else if (method === 'POST') {
            // --- POST: Save a new recipe ---
            
            const data = JSON.parse(event.body);
            const { title, summary, time, category, ingredients, instructions } = data;

            if (!title || !ingredients || !instructions) {
                 return {
                    statusCode: 400,
                    body: JSON.stringify({ error: "Missing required fields (title, ingredients, instructions)." }),
                 };
            }

            const [newRecipe] = await sql`
                INSERT INTO recipes (title, summary, time, category, ingredients, instructions, created_at)
                VALUES (${title}, ${summary}, ${time || null}, ${category || null}, ${ingredients}, ${instructions}, NOW())
                RETURNING *;
            `;

            return {
                statusCode: 201, // 201 Created
                body: JSON.stringify(newRecipe),
                headers: { 'Content-Type': 'application/json' },
            };
        } else {
            // Handle unsupported methods
            return {
                statusCode: 405,
                body: "Method Not Allowed",
            };
        }

    } catch (error) {
        console.error("Database Error:", error.message);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Failed to process database request.", details: error.message }),
            headers: { 'Content-Type': 'application/json' },
        };
    }
};
