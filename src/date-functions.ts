export { }

declare global {
    interface Date {
        addHours(h: number): Date;
    }
}

export function patchDate() {
    Date.prototype.addHours = function (h: number): Date {
        this.setTime(this.getTime() + (h * 60 * 60 * 1000));
        return this;
    }
}

export function daysInMonth(year: number, month: number) {
    const days = new Date(year, month, 0).getDate();
    return days;
}

