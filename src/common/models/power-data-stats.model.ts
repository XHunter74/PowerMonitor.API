export class PowerDataStatsModel {
    constructor(
        public month: number,
        public day_of_week: number,
        public hours: number,
        public power: number,
    ) {}
}
