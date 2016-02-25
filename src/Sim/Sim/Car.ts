/*global $e, GMath, Vec2, InputState */

'use strict';

interface ICarOptions {
    config: any;
    heading: number;
    x: number;
    y: number;
    safeSteer: boolean;
    smoothSteer: boolean;
    stats?: any;
}

/**
 * Car class
 * This is a HTML/Javascript adaptation of Marco Monster's 2D car physics demo.
 * Physics Paper here:
 * http://www.asawicki.info/Mirror/Car%20Physics%20for%20Games/Car%20Physics%20for%20Games.html
 * Windows demo written in C here:
 * http://www.gamedev.net/topic/394292-demosource-of-marco-monsters-car-physics-tutorial/
 * Additional ideas from here:
 * https://github.com/Siorki/js13kgames/tree/master/2013%20-%20staccato
 *
 * Adapted by Mike Linkovich
 * http://www.spacejack.ca/projects/carphysics2d/
 * https://github.com/spacejack/carphysics2d
 *
 * License: MIT
 * http://opensource.org/licenses/MIT
 */
class Car {
    public absVel: number;  // absolute velocity m/s
    public accel: THREE.Vector2;  // acceleration in world coords
    public accel_c: THREE.Vector2;   // accleration in local car coords
    public axleWeightRatioFront: number;
    public axleWeightRatioRear: number;
    public body: THREE.Object3D;
    public brake: number;
    public config: CarConfig;
    public heading: number;  // angle car is pointed at (radians)
    public inertia: number; // will be = mass
    public inputs: InputState;
    public previousPositions: THREE.Vector2[] = [];
    public position: THREE.Vector2;  // metres in world coords
    public safeSteer: boolean;
    public smoothSteer: boolean;
    public speed: number;
    public steer: number;	// amount of steering input (-1.0..1.0)
    public steerAngle: number;
    public throttle: number;
    public velocity: THREE.Vector2;  // m/s in world coords
    public velocity_c: THREE.Vector2;  // m/s in local car coords (x is forward y is sideways)
    public wheelBase: number;
    public yawRate: number;   // angular velocity in radians
    public movingDirection: number; // direction the car is moving in radians

    constructor(filePath: string, callback: (mesh: THREE.Object3D) => void) {
        $.getJSON(filePath, (data: any) => {
            //  Car state variables
            this.heading = 0;  // angle car is pointed at (radians)
            this.position = new THREE.Vector2(0, 0);  // metres in world coords
            this.previousPositions.push(new THREE.Vector2(this.position.x, this.position.y));
            this.velocity = new THREE.Vector2();  // m/s in world coords
            this.velocity_c = new THREE.Vector2();  // m/s in local car coords (x is forward y is sideways)
            this.accel = new THREE.Vector2();  // acceleration in world coords
            this.accel_c = new THREE.Vector2();   // accleration in local car coords
            this.absVel = 0.0;  // absolute velocity m/s
            this.yawRate = 0.0;   // angular velocity in radians
            this.steer = 0.0;	// amount of steering input (-1.0..1.0)
            this.steerAngle = 0.0;  // actual front wheel steer angle (-maxSteer..maxSteer)
            this.speed = 0;

            //  State of inputs
            this.inputs = new InputState();

            //  Use input smoothing (on by default)
            this.smoothSteer = false;
            //  Use safe steering (angle limited by speed)
            this.safeSteer = false;

            //  Other static values to be computed from config
            this.inertia = 0.0;  // will be = mass
            this.wheelBase = 0.0;  // set from axle to CG lengths
            this.axleWeightRatioFront = 0.0;  // % car weight on the front axle
            this.axleWeightRatioRear = 0.0;  // % car weight on the rear axle

            var loader = new THREE.ColladaLoader();
            loader.load('assets/cars/' + data.model, (result: any) => {
                this.body = result.scene;
                //  Setup car configuration
                this.config = new CarConfig(data.config);
                this.setConfig();
                callback(this.body);
            });
        });
    }

    public setConfig(): void {
        // Re-calculate these
        this.inertia = this.config.mass * this.config.inertiaScale;
        this.wheelBase = this.config.cgToFrontAxle + this.config.cgToRearAxle;
        this.axleWeightRatioFront = this.config.cgToRearAxle / this.wheelBase; // % car weight on the front axle
        this.axleWeightRatioRear = this.config.cgToFrontAxle / this.wheelBase; // % car weight on the rear axle
    }

    /**
     *  App sets inputs via this function
     */
    public setInputs(inputs: InputState): void {
        this.inputs.copy(inputs);
    };

    /**
     *  @param dt Floating-point Delta Time in seconds
     */
    public doPhysics(dt: number) {
        // Shorthand
        var cfg = this.config;

        // Pre-calc heading vector
        var sn = Math.sin(this.heading);
        var cs = Math.cos(this.heading);

        // Get velocity in local car coordinates
        this.velocity_c.x = cs * this.velocity.x + sn * this.velocity.y;
        this.velocity_c.y = cs * this.velocity.y - sn * this.velocity.x;

        // Weight on axles based on centre of gravity and weight shift due to forward/reverse acceleration
        var axleWeightFront = cfg.mass * (this.axleWeightRatioFront * cfg.gravity - cfg.weightTransfer *
            this.accel_c.x * cfg.cgHeight / this.wheelBase);

        var axleWeightRear = cfg.mass * (this.axleWeightRatioRear * cfg.gravity + cfg.weightTransfer *
            this.accel_c.x * cfg.cgHeight / this.wheelBase);

        // Resulting velocity of the wheels as result of the yaw rate of the car body.
        // v = yawrate * r where r is distance from axle to CG and yawRate (angular velocity) in rad/s.
        var yawSpeedFront = cfg.cgToFrontAxle * this.yawRate;
        var yawSpeedRear = -cfg.cgToRearAxle * this.yawRate;

        // Calculate slip angles for front and rear wheels (a.k.a. alpha)
        var slipAngleFront = Math.atan2(this.velocity_c.y + yawSpeedFront, Math.abs(this.velocity_c.x)) -
            GMath.sign(this.velocity_c.x) * this.steerAngle;

        var slipAngleRear = Math.atan2(this.velocity_c.y + yawSpeedRear, Math.abs(this.velocity_c.x));

        var tireGripFront = cfg.tireGrip;

        // reduce rear grip when ebrake is on
        var tireGripRear = cfg.tireGrip * (1.0 - this.inputs.ebrake * (1.0 - cfg.lockGrip));

        var frictionForceFront_cy = GMath.clamp(-cfg.cornerStiffnessFront * slipAngleFront, -tireGripFront,
            tireGripFront) * axleWeightFront;

        var frictionForceRear_cy = GMath.clamp(-cfg.cornerStiffnessRear * slipAngleRear, -tireGripRear,
            tireGripRear) * axleWeightRear;

        //  Get amount of brake/throttle from our inputs
        var brake = Math.min(this.inputs.brake * cfg.brakeForce + this.inputs.ebrake *
            cfg.eBrakeForce, cfg.brakeForce);

        var throttle = this.inputs.throttle * cfg.engineForce;

        //  Resulting force in local car coordinates.
        //  This is implemented as a RWD car only.
        var tractionForce_cx = throttle - brake * GMath.sign(this.velocity_c.x);
        var tractionForce_cy = 0;

        var dragForce_cx = -cfg.rollResist * this.velocity_c.x - cfg.airResist *
            this.velocity_c.x * Math.abs(this.velocity_c.x);

        var dragForce_cy = -cfg.rollResist * this.velocity_c.y - cfg.airResist *
            this.velocity_c.y * Math.abs(this.velocity_c.y);

        // total force in car coordinates
        var totalForce_cx = dragForce_cx + tractionForce_cx;
        var totalForce_cy = dragForce_cy + tractionForce_cy + Math.cos(this.steerAngle) *
            frictionForceFront_cy + frictionForceRear_cy;

        // acceleration along car axes
        this.accel_c.x = totalForce_cx / cfg.mass;  // forward/reverse accel
        this.accel_c.y = totalForce_cy / cfg.mass;  // sideways accel

        // acceleration in world coordinates
        this.accel.x = cs * this.accel_c.x - sn * this.accel_c.y;
        this.accel.y = sn * this.accel_c.x + cs * this.accel_c.y;

        // update velocity
        this.velocity.x += this.accel.x * dt;
        this.velocity.y += this.accel.y * dt;

        this.absVel = this.velocity.length();

        // calculate rotational forces
        var angularTorque = (frictionForceFront_cy + tractionForce_cy) * cfg.cgToFrontAxle -
            frictionForceRear_cy * cfg.cgToRearAxle;

        //  Sim gets unstable at very slow speeds, so just stop the car
        if (Math.abs(this.absVel) < 0.5 && !throttle) {
            this.velocity.x = this.velocity.y = this.absVel = 0;
            angularTorque = this.yawRate = 0;
        }

        var angularAccel = angularTorque / this.inertia;

        this.yawRate += angularAccel * dt;
        this.heading += this.yawRate * dt;

        this.speed = this.velocity_c.x * 3600 / 1000; // km/h

        //  finally we can update position
        this.position.x += this.velocity.x * dt;
        this.position.y += this.velocity.y * dt;

        var deltaPos = this.previousPositions[0].sub(this.position);

        this.movingDirection = Math.atan2(deltaPos.y, deltaPos.x);

        this.previousPositions.push(new THREE.Vector2(this.position.x, this.position.y));

        if (this.previousPositions.length > 30) {
            this.previousPositions.shift();
        }
    };

    /**
     *  Smooth Steering
     *  Apply maximum steering angle change velocity.
     */
    public applySmoothSteer(steerInput: number, dt: number) {
        var steer = 0;

        if (Math.abs(steerInput) > 0.001) {
            //  Move toward steering input
            steer = GMath.clamp(this.steer + steerInput * dt * 2.0, -1.0, 1.0); // -inp.right, inp.left);
        } else {
            //  No steer input - move toward centre (0)
            if (this.steer > 0) {
                steer = Math.max(this.steer - dt * 3.0, 0);
            } else if (this.steer < 0) {
                steer = Math.min(this.steer + dt * 3.0, 0);
            }
        }

        return steer;
    };

    /**
     *  Safe Steering
     *  Limit the steering angle by the speed of the car.
     *  Prevents oversteer at expense of more understeer.
     */
    public applySafeSteer(steerInput: number) {
        var avel = Math.min(this.absVel, 250.0);  // m/s
        var steer = steerInput * (1.0 - (avel / 280.0));
        return steer;
    };

    /**
     *  @param dtms Delta Time in milliseconds
     */
    public update(dtms: number) {
        var dt = dtms / 1000.0;  // delta T in seconds

        this.throttle = this.inputs.throttle;
        this.brake = this.inputs.brake;

        var steerInput = this.inputs.left - this.inputs.right;

        //  Perform filtering on steering...
        if (this.smoothSteer) {
            this.steer = this.applySmoothSteer(steerInput, dt);
        } else {
            this.steer = steerInput;
        }

        if (this.safeSteer) {
            this.steer = this.applySafeSteer(this.steer);
        }

        //  Now set the actual steering angle
        this.steerAngle = this.steer * this.config.maxSteer;

        //
        //  Now that the inputs have been filtered and we have our throttle,
        //  brake and steering values, perform the car physics update...
        //
        this.doPhysics(dt);

        this.body.position.set(this.position.x, this.position.y, 0);
        this.body.setRotationFromAxisAngle(new THREE.Vector3(0, 0, 1), this.heading);
    };
}

/**
 *  Car setup params and magic constants.
 */
class CarConfig {
    gravity: number;  // m/s^2
    mass: number;  // kg
    inertiaScale: number;  // Multiply by mass for inertia
    cgToFront: number; // Centre of gravity to front of chassis (metres)
    cgToRear: number;   // Centre of gravity to rear of chassis
    cgToFrontAxle: number;  // Centre gravity to front axle
    cgToRearAxle: number;  // Centre gravity to rear axle
    cgHeight: number;  // Centre gravity height
    tireGrip: number;  // How much grip tires have
    lockGrip: number;  // % of grip available when wheel is locked
    engineForce: number;
    brakeForce: number;
    eBrakeForce: number;
    weightTransfer: number;  // How much weight is transferred during acceleration/braking
    maxSteer: number;  // Maximum steering angle in radians
    cornerStiffnessFront: number;
    cornerStiffnessRear: number;
    airResist: number;	// air resistance (* vel)
    rollResist: number;	// rolling resistance force (* vel)

    constructor(opts?: CarConfig) {
        opts = opts || <any>{};

        //  Defaults approximate a lightweight sports-sedan.
        this.gravity = opts.gravity || 9.81;  // m/s^2
        this.mass = opts.mass || 1200.0;  // kg
        this.inertiaScale = opts.inertiaScale || 1.0;  // Multiply by mass for inertia
        this.cgToFront = opts.cgToFront || 2.0; // Centre of gravity to front of chassis (metres)
        this.cgToRear = opts.cgToRear || 2.0;   // Centre of gravity to rear of chassis
        this.cgToFrontAxle = opts.cgToFrontAxle || 1.25;  // Centre gravity to front axle
        this.cgToRearAxle = opts.cgToRearAxle || 1.25;  // Centre gravity to rear axle
        this.cgHeight = opts.cgHeight || 0.55;  // Centre gravity height

        this.tireGrip = opts.tireGrip || 2.0;  // How much grip tires have

        // % of grip available when wheel is locked
        this.lockGrip = opts.lockGrip || 0.7;
        this.engineForce = opts.engineForce || 8000.0;
        this.brakeForce = opts.brakeForce || 12000.0;
        this.eBrakeForce = opts.eBrakeForce || this.brakeForce / 2.5;

        // How much weight is transferred during acceleration/braking
        this.weightTransfer = (typeof opts.weightTransfer === 'number') ? opts.weightTransfer : 0.2;
        this.maxSteer = opts.maxSteer || 0.6;  // Maximum steering angle in radians
        this.cornerStiffnessFront = opts.cornerStiffnessFront || 5.0;
        this.cornerStiffnessRear = opts.cornerStiffnessRear || 5.2;
        this.airResist = (typeof opts.airResist === 'number') ? opts.airResist : 2.5;	// air resistance (* vel)

        // rolling resistance force (* vel)
        this.rollResist = (typeof opts.rollResist === 'number') ? opts.rollResist : 8.0;
    }

    public copy(c: any) {
        for (var k in this) {
            if (this.hasOwnProperty(k) && c.hasOwnProperty(k)) {
                this[k] = c[k];
            }
        }
        return this;
    }
}