'use strict';
var Vector2 = (function () {
    function Vector2(x, y) {
        this.x = x || 0.0;
        this.y = y || 0.0;
    }
    Vector2.len = function (x, y) {
        return Math.sqrt(x * x + y * y);
    };
    Vector2.angle = function (x, y) {
        return Math.atan2(y, x);
    };
    Vector2.prototype.angle = function () {
        return Vector2.angle(this.x, this.y);
    };
    Vector2.prototype.det = function (v) {
        return this.x * v.y - this.y * v.x;
    };
    Vector2.prototype.dot = function (v) {
        return this.x * v.x + this.y * v.y;
    };
    Vector2.prototype.len = function () {
        return Vector2.len(this.x, this.y);
    };
    Vector2.prototype.normailize = function () {
        this.setLen(1.0);
    };
    Vector2.prototype.rotate = function (r) {
        var x = this.x;
        var y = this.y;
        var c = Math.cos(r);
        var s = Math.sin(r);
        this.x = x * c - y * s;
        this.y = x * s + y * c;
    };
    Vector2.prototype.set = function (x, y) {
        this.x = x;
        this.y = y;
    };
    Vector2.prototype.setLen = function (l) {
        var s = this.len();
        if (s > 0.0) {
            s = l / s;
            this.x *= s;
            this.y *= s;
        }
        else {
            this.x = l;
            this.y = 0.0;
        }
    };
    return Vector2;
})();
//# sourceMappingURL=Vector2.js.map