class Alea {
    private n = 0xefc8249d;
    private c = 1;

    private s0: number;
    private s1: number;
    private s2: number;

    constructor(seed: string) {
        // Johannes Baagøe <baagoe@baagoe.com>, 2010
        this.s0 = this.mash(" ");
        this.s1 = this.mash(" ");
        this.s2 = this.mash(" ");

        this.s0 -= this.mash(seed);
        if (this.s0 < 0) {
            this.s0 += 1;
        }
        this.s1 -= this.mash(seed);
        if (this.s1 < 0) {
            this.s1 += 1;
        }
        this.s2 -= this.mash(seed);
        if (this.s2 < 0) {
            this.s2 += 1;
        }
    }

    protected next(): number {
        const t = 2091639 * this.s0 + this.c * 2.3283064365386963e-10; // 2^-32
        this.s0 = this.s1;
        this.s1 = this.s2;
        return (this.s2 = t - (this.c = t | 0));
    }

    private mash(data: string): number {
        for (let i = 0; i < data.length; i++) {
            this.n += data.charCodeAt(i);
            let h = 0.02519603282416938 * this.n;
            this.n = h >>> 0;
            h -= this.n;
            h *= this.n;
            this.n = h >>> 0;
            h -= this.n;
            this.n += h * 0x100000000; // 2^32
        }
        return (this.n >>> 0) * 2.3283064365386963e-10; // 2^-32
    }
}

export class RandomNumberGenerator extends Alea {
    constructor(seed: string | number = Math.random()) {
        super(seed.toString());
    }

    /**
     * Random choice of an array
     */
    choice<T>(array: T[]): T {
        const index = this.nextIntRange(0, array.length);
        return array[index];
    }

    /**
     * @returns Integer in range [min, max]
     */
    nextIntRange(min: number, max: number): number {
        assert(Number.isFinite(min), "Minimum is no integer");
        assert(Number.isFinite(max), "Maximum is no integer");
        assert(max > min, "rng: max <= min");
        return Math.floor(this.next() * (max - min) + min);
    }

    /**
     * @returns Number in range [min, max]
     */
    nextRange(min: number, max: number): number {
        assert(max > min, "rng: max <= min");
        return this.next() * (max - min) + min;
    }
}
