/**  Useful Game Math stuff */
class GMath {
    public static sign(n: number): number {
        //  Allegedly fastest if we check for number type
        return typeof n === 'number' ? n ? n < 0 ? -1 : 1 : n === n ? 0 : NaN : NaN;
    }

    public static clamp(n: number, min: number, max: number): number {
        return Math.min(Math.max(n, min), max);
    }

    /**  Always positive modulus */
    public static pmod(n: number, m: number): number {
        return (n % m + m) % m;
    }
}