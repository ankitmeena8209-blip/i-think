import { getSupabaseClient } from './supabase.js';

function getEnvValue(keys) {
    for (const key of keys) {
        const value = process.env[key];
        if (value) return value;
    }
    return '';
}

const supabase = getSupabaseClient();
const supabaseUrl = getEnvValue(['SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL', 'VITE_SUPABASE_URL']);
const supabaseKey = getEnvValue(['SUPABASE_ANON_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'VITE_SUPABASE_ANON_KEY']);

// Cache of detected column sets per table so we only probe once per process.
const columnCache = new Map();

/**
 * Fetch the actual column names of a Supabase table using its OpenAPI
 * introspection endpoint (GET /rest/v1/). This is the authoritative way
 * to learn the deployed schema, including on databases created before
 * the current migration.
 *
 * Returns a Set of column names, or null if introspection is unavailable.
 */
async function fetchTableDefinition(tableName) {
    if (!supabaseUrl || !supabaseKey) return null;

    try {
        const res = await fetch(`${supabaseUrl}/rest/v1/`, {
            headers: {
                apikey: supabaseKey,
                Authorization: `Bearer ${supabaseKey}`
            }
        });
        if (!res.ok) return null;

        const spec = await res.json();
        const def =
            spec?.definitions?.[`public.${tableName}`] ||
            spec?.definitions?.[tableName] ||
            spec?.components?.schemas?.[`public.${tableName}`] ||
            spec?.components?.schemas?.[tableName];

        if (def?.properties && typeof def.properties === 'object') {
            return new Set(Object.keys(def.properties));
        }
        return null;
    } catch (err) {
        return null;
    }
}

/**
 * Detect which columns currently exist on a given Supabase table.
 * Prefers authoritative OpenAPI introspection; falls back to probing
 * each candidate column individually (42703 = does not exist).
 *
 * Returns { available, columns } where columns is a Set of confirmed names.
 */
export async function detectTableColumns(tableName, candidates = []) {
    const cacheKey = tableName;

    if (columnCache.has(cacheKey)) {
        return columnCache.get(cacheKey);
    }

    if (!supabase) {
        const result = { available: false, columns: new Set(), source: 'none' };
        columnCache.set(cacheKey, result);
        return result;
    }

    // 1. Authoritative introspection
    const definition = await fetchTableDefinition(tableName);
    if (definition) {
        const result = { available: true, columns: definition, source: 'openapi' };
        columnCache.set(cacheKey, result);
        return result;
    }

    // 2. Fallback: probe candidate columns one at a time
    const confirmed = new Set();
    for (const col of candidates) {
        try {
            // head:true avoids fetching rows — only validates that the column resolves.
            const { error } = await supabase
                .from(tableName)
                .select(col, { count: 'exact', head: true })
                .limit(0);
            if (!error) {
                confirmed.add(col);
            }
        } catch (err) {
            // Column doesn't exist — skip it.
        }
    }

    const result = { available: confirmed.size > 0, columns: confirmed, source: 'probe' };
    columnCache.set(cacheKey, result);
    return result;
}

/**
 * Adapt a Supabase query builder so any `.select()` that references
 * columns absent from the deployed table is reduced to the columns
 * that DO exist.
 *
 * @param {Function} buildQuery  (projection) => SupabaseQueryBuilder
 * @param {string[]} allColumns  Full list of columns the app wants.
 * @param {Set} availableColumns Detected available columns.
 * @returns {{ data, error }}
 */
export async function safeSelect(buildQuery, allColumns, availableColumns) {
    const availableProjection = allColumns.filter((col) => availableColumns.has(col));

    // If none of the requested columns exist, fall back to a minimal safe query.
    const projection = availableProjection.length > 0
        ? availableProjection.join(', ')
        : allColumns[0];

    const { data, error } = await buildQuery(projection);
    if (error && error.code === '42703') {
        // Column mismatch — retry with only the safe columns.
        return buildQuery(projection);
    }
    return { data, error };
}

export default detectTableColumns;