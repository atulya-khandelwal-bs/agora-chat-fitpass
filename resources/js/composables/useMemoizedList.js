import { computed, shallowRef, unref } from 'vue';

const resolve = (maybeSource) => {
    if (typeof maybeSource === 'function') {
        return maybeSource();
    }
    return unref(maybeSource);
};

const defaultSignatureBuilder = (rows) => {
    if (!Array.isArray(rows) || rows.length === 0) {
        return 'empty';
    }

    return rows
        .map((row, idx) => {
            if (!row || typeof row !== 'object') {
                return `row:${idx}`;
            }
            return String(row.id ?? row.reference_id ?? row.key ?? idx);
        })
        .join('|');
};

const MAX_CACHE_SIZE = 10 // Keep last 10 signatures

export function useMemoizedList(options) {
    const {
        source,
        mapItem = (item) => item,
        buildSignature = defaultSignatureBuilder,
        maxCacheSize = MAX_CACHE_SIZE
    } = options;

    const cache = shallowRef({
        signatures: [], // Array of { signature, value }
        current: null
    });

    const memoizedList = computed(() => {
        const raw = resolve(source) || [];
        const signature = buildSignature(raw);

        // Check if current signature matches
        if (cache.value.current?.signature === signature) {
            return cache.value.current.value;
        }

        // Check cache history
        const cached = cache.value.signatures.find(c => c.signature === signature);
        if (cached) {
            // Move to current
            cache.value.current = cached;
            return cached.value;
        }

        // Build new value
        const normalized = Array.isArray(raw) 
            ? raw.map((item, index) => mapItem(item, index)) 
            : [];

        const newEntry = { signature, value: normalized };
        
        // Update cache
        cache.value.current = newEntry;
        
        // Add to history, limit size
        cache.value.signatures.unshift(newEntry);
        if (cache.value.signatures.length > maxCacheSize) {
            cache.value.signatures.pop();
        }

        return normalized;
    });

    return {
        memoizedList,
        clearCache: () => {
            cache.value = {
                signatures: [],
                current: null
            };
        }
    };
}

