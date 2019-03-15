export class TimeUtil {
     public static dateDiffInDays = (a: Date, b: Date): number => {
        const utc1 = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
        const utc2 = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
        return Math.floor((utc2 - utc1));
    }
}
