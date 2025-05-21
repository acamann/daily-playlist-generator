const ONE_DAY = 24 * 60 * 60 * 1000; // hours*minutes*seconds*milliseconds

export function getDaysSince(startDate: Date): number {
    return Math.round(Math.abs((new Date().getTime() - startDate.getTime()) / ONE_DAY));
}

export function isToday(dateString: string): boolean {
    return new Date(dateString).toDateString() === new Date().toDateString()
}