import { expect } from 'chai';
import { environment } from '../../src/config/environments';
import * as fs from 'fs';
import * as path from 'path';

describe('Version consistency', () => {
    it('package.json version should match environment.version', () => {
        const pkgPath = path.resolve(__dirname, '../../package.json');
        const pkgJson = JSON.parse(fs.readFileSync(pkgPath, 'utf-8')) as { version: string };
        expect(environment.version).to.equal(pkgJson.version);
    });
});
