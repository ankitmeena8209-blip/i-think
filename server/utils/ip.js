/**
 * Extracts the real client IP address from an Express request.
 * Handles direct connections, proxies, and comma-separated X-Forwarded-For values
 * (takes the FIRST entry, which is the original client).
 */
export function getClientIp(req) {
    if (!req) return '127.0.0.1';

    const xff = req.headers?.['x-forwarded-for'];
    if (typeof xff === 'string') {
        const first = xff.split(',')[0].trim();
        if (first) return first;
    }

    const realIp = req.headers?.['x-real-ip'];
    if (typeof realIp === 'string' && realIp.trim()) return realIp.trim();

    const cfIp = req.headers?.['cf-connecting-ip'];
    if (typeof cfIp === 'string' && cfIp.trim()) return cfIp.trim();

    if (req.ip) return req.ip;

    if (req.socket?.remoteAddress) return req.socket.remoteAddress;

    return '127.0.0.1';
}