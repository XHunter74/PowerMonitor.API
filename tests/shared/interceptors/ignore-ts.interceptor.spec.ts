import { expect } from 'chai';
import { IgnoreTsCacheInterceptor } from '../../../src/shared/interceptors/ignore-ts.interceptor';
import { ExecutionContext } from '@nestjs/common';

describe('IgnoreTsCacheInterceptor', () => {
    let interceptor: IgnoreTsCacheInterceptor;

    beforeEach(() => {
        // Provide mock arguments for cacheManager and reflector
        const mockCacheManager = {};
        const mockReflector = { get: () => undefined };
        interceptor = new IgnoreTsCacheInterceptor(mockCacheManager, mockReflector as any);
    });

    function createContext(method: string, url: string): ExecutionContext {
        const req: any = {
            method,
            originalUrl: url,
        };
        const http: any = {
            getRequest: () => req,
        };
        return {
            switchToHttp: () => http,
        } as ExecutionContext;
    }

    it('should return undefined for non-GET methods', () => {
        const context = createContext('POST', '/api/data?foo=bar&_ts=123');
        const key = interceptor.trackBy(context);
        expect(key).to.be.undefined;
    });

    it('should generate a cache key for GET without query string', () => {
        const context = createContext('GET', '/api/status');
        const key = interceptor.trackBy(context);
        expect(key).to.equal('GET_/api/status');
    });

    it('should generate a cache key and preserve query params except _ts', () => {
        const context = createContext('GET', '/api/items?foo=1&_ts=999&bar=2');
        const key = interceptor.trackBy(context);
        // foo=1&bar=2 should remain, _ts removed
        expect(key).to.equal('GET_/api/items?foo=1&bar=2');
    });

    it('should generate a cache key and drop only _ts param when it is the only param', () => {
        const context = createContext('GET', '/api/cache?_ts=1600000000000');
        const key = interceptor.trackBy(context);
        expect(key).to.equal('GET_/api/cache');
    });

    it('should handle multiple occurrences of _ts and other params', () => {
        const context = createContext(
            'GET',
            '/api/test?alpha=first&_ts=1111&beta=second&_ts=2222&gamma=third',
        );
        const key = interceptor.trackBy(context);
        // both _ts removed, order of other params preserved
        expect(key).to.equal('GET_/api/test?alpha=first&beta=second&gamma=third');
    });

    it('should handle URLs with no path (root) and params', () => {
        const context = createContext('GET', '/?foo=bar&_ts=xyz');
        const key = interceptor.trackBy(context);
        expect(key).to.equal('GET_/?foo=bar');
    });
});
