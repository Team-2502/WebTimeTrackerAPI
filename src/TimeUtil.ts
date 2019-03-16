export class TimeUtil {
    public static dateDiff = (a: Date, b: Date): number => {
        const dif = a.getTime() - b.getTime();
        return Math.abs(dif / 1000);
    }
}

