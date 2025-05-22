import { Intervals } from '../constants';

export {};

declare global {
    interface Date {
        addHours(h: number): Date;
    }
}

export function patchDate() {
    Date.prototype.addHours = function (this: Date, h: number): Date {
        this.setTime(this.getTime() + h * Intervals.OneHour);
        return this;
    };
}

export function daysInMonth(year: number, month: number) {
    const days = new Date(year, month, 0).getDate();
    return days;
}
