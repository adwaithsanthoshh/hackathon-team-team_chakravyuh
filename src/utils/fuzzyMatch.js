/**
 * Compute Levenshtein edit distance between two strings
 */
export function levenshtein(a, b) {
    const la = a.length;
    const lb = b.length;
    const dp = Array.from({ length: la + 1 }, () => Array(lb + 1).fill(0));

    for (let i = 0; i <= la; i++) dp[i][0] = i;
    for (let j = 0; j <= lb; j++) dp[0][j] = j;

    for (let i = 1; i <= la; i++) {
        for (let j = 1; j <= lb; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            dp[i][j] = Math.min(
                dp[i - 1][j] + 1,
                dp[i][j - 1] + 1,
                dp[i - 1][j - 1] + cost
            );
        }
    }

    return dp[la][lb];
}

/**
 * Search registrations by name and optionally village using fuzzy matching.
 * Returns array of matching registrations sorted by relevance.
 */
export function searchRegistrations(registrations, queryName, queryVillage = '') {
    if (!queryName.trim()) return [];

    const nameQ = queryName.toLowerCase().trim();
    const villageQ = queryVillage.toLowerCase().trim();

    const results = [];

    registrations.forEach(reg => {
        const regName = reg.name.toLowerCase();
        let score = 0;
        let matched = false;

        // Exact substring match — best
        if (regName.includes(nameQ) || nameQ.includes(regName)) {
            score += 100;
            matched = true;
        }

        // Levenshtein on full name
        const dist = levenshtein(nameQ, regName);
        if (dist < 3) {
            score += (50 - dist * 15);
            matched = true;
        }

        // Token-level matching — split names into words and compare each
        const queryTokens = nameQ.split(/\s+/);
        const regTokens = regName.split(/\s+/);
        queryTokens.forEach(qt => {
            regTokens.forEach(rt => {
                if (rt.includes(qt) || qt.includes(rt)) {
                    score += 30;
                    matched = true;
                } else if (levenshtein(qt, rt) < 3) {
                    score += 20;
                    matched = true;
                }
            });
        });

        // Village matching bonus
        if (villageQ && reg.village) {
            const regVillage = reg.village.toLowerCase();
            if (regVillage.includes(villageQ) || villageQ.includes(regVillage)) {
                score += 40;
                matched = true;
            } else if (levenshtein(villageQ, regVillage) < 3) {
                score += 20;
                matched = true;
            }
        }

        if (matched) {
            results.push({ ...reg, score });
        }
    });

    return results.sort((a, b) => b.score - a.score);
}
