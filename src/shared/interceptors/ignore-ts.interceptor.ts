// src/common/interceptors/ignore-ts.interceptor.ts
import { CacheInterceptor } from '@nestjs/cache-manager';
import { Injectable, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { URLSearchParams } from 'url';

@Injectable()
export class IgnoreTsCacheInterceptor extends CacheInterceptor {
    trackBy(context: ExecutionContext): string | undefined {
        const req = context.switchToHttp().getRequest<Request>();

        if (req.method !== 'GET') {
            return undefined;
        }

        const [path, qs = ''] = req.originalUrl.split('?');

        const params = new URLSearchParams(qs);
        params.delete('_ts');

        const filteredQs = params.toString();
        return `${req.method}_${path}${filteredQs ? `?${filteredQs}` : ''}`;
    }
}
