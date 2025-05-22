import { expect } from 'chai';
import { patchDate, daysInMonth } from '../src/common/date-functions';

describe('date-functions', () => {
    describe('patchDate', () => {
        before(() => {
            patchDate();
        });

        it('should add hours to a date', () => {
            const date = new Date('2025-05-22T00:00:00Z');
            const result = date.addHours(2);
            expect(result.getTime()).to.equal(date.getTime());
            // Should be 2 hours later
            expect(result.toISOString()).to.equal('2025-05-22T02:00:00.000Z');
        });

        it('should add negative hours to a date', () => {
            const date = new Date('2025-05-22T10:00:00Z');
            const result = date.addHours(-3);
            expect(result.getTime()).to.equal(date.getTime());
            expect(result.toISOString()).to.equal('2025-05-22T07:00:00.000Z');
        });
    });

    describe('daysInMonth', () => {
        it('should return correct days for February in a leap year', () => {
            expect(daysInMonth(2024, 2)).to.equal(29);
        });
        it('should return correct days for February in a non-leap year', () => {
            expect(daysInMonth(2023, 2)).to.equal(28);
        });
        it('should return correct days for April', () => {
            expect(daysInMonth(2025, 4)).to.equal(30);
        });
        it('should return correct days for December', () => {
            expect(daysInMonth(2025, 12)).to.equal(31);
        });
    });
});
