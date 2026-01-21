export const withRetry = async (fn, retries = 3, delay = 1000) => {
    try {
        return await fn();
    } catch (err) {
        if (retries <= 0) throw err;
        console.warn(`Operation failed, retrying in ${delay}ms... (${retries} attempts left)`);
        await new Promise(res => setTimeout(res, delay));
        return withRetry(fn, retries - 1, delay * 2);
    }
};
