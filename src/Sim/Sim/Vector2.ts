'use strict';

class Vector2 {
    public x: number;
    public y: number;
    constructor();
    constructor(x: number, y: number);
    constructor(x?: number, y?: number) {
        this.x = x || 0.0;
        this.y = y || 0.0;
    }

    public static len(x: number, y: number): number {
        return Math.sqrt(x * x + y * y);
    }

    public static angle(x: number, y: number): number {
        return Math.atan2(y, x);
    }

    public angle(): number {
        return Vector2.angle(this.x, this.y);
    }

    public det(v: Vector2): number {
        return this.x * v.y - this.y * v.x;
    }

    public dot(v: Vector2): number {
        return this.x * v.x + this.y * v.y;
    }

    public len(): number {
        return Vector2.len(this.x, this.y);
    }

    public normailize(): void {
        this.setLen(1.0);
    }

    public rotate(r: number): void {
        var x = this.x;
        var y = this.y;
        var c = Math.cos(r);
        var s = Math.sin(r);
        this.x = x * c - y * s;
        this.y = x * s + y * c;
    }

    public set(x: number, y: number): void {
        this.x = x;
        this.y = y;
    }

    public setLen(l: number): void {
        var s = this.len();
        if (s > 0.0) {
            s = l / s;
            this.x *= s;
            this.y *= s;
        } else {
            this.x = l;
            this.y = 0.0;
        }
    }
}