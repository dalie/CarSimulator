'use strict';
/**
 *  Input state values
 *  Range from 0.0-1.0
 */
class InputState {
    public left = 0;
    public right = 0;
    public throttle = 0;
    public brake = 0;
    public ebrake = 0;

    /**  Copy values from i to this */
    public copy(i: any) {
        for (var k in this) {
            if (this.hasOwnProperty(k)) {
                this[k] = i[k];
            }
        }
        return this;
    };

    /**  Set all to v (0.0-1.0) */
    public set(v: any) {
        for (var k in this) {
            if (this.hasOwnProperty(k)) {
                this[k] = v;
            }
        }
    };
}