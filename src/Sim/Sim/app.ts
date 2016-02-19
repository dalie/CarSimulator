/// <reference path="typings/threejs/three.d.ts" />

class CarSim {
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;
    private scene: THREE.Scene;

    private car: Car;
    private inputs: InputState;

    private previousTime: number;

    public stats: Stats;

    constructor() {
        this.stats = new Stats();

        this.previousTime = Date.now();
        this.inputs = new InputState();
        this.car = new Car({
            heading: 0,
            safeSteer: false,
            smoothSteer: true,
            stats: this.stats,
            x: 0,
            y: 0,
            config: {
                mass: 1370,
                halfWidth: 0.925,
                cgToFront: 2.5,
                cgToRear: 2,
                cgToFrontAxle: 1.75,
                cgToRearAxle: 1.25,
                cgHeight: 0.5,
                wheelRadius: 0.56,
                wheelWidth: 0.265,
                tireGrip: 2,
                lockGrip: 1.2,
                engineForce: 10000,
                brakeForce: 25000,
                ebrakeForce: 25000,
                weightTransfer: 0.2,
                maxSteer: 0.75,
                cornerStiffnessFront: 8,
                cornerStiffnessRear: 5
            }
        });

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight);
        this.camera.position.set(0, 0, 50);
        this.camera.lookAt(new THREE.Vector3(0, 0, 0));

        var grid = new THREE.GridHelper(1000, 5);
        grid.rotateX(THREE.Math.degToRad(90));
        grid.setColors(0xaaaaaa, 0xcccccc);

        this.scene.add(grid);
        this.scene.add(this.car.bodyMesh);
        this.renderer = new THREE.WebGLRenderer({
            alpha: true
        });

        this.renderer.setSize(window.innerWidth, window.innerHeight);

        document.body.appendChild(this.renderer.domElement);

        document.addEventListener('keydown', this.onKeyDown, true);
        document.addEventListener('keyup', this.onKeyUp, true);

        this.render();
    }

    private render = (): void => {
        var now = Date.now();
        var deltaTime = now - this.previousTime;

        this.car.setInputs(this.inputs);
        this.car.update(deltaTime);
        this.stats.render();
        this.renderer.render(this.scene, this.camera);

        this.previousTime = now;

        requestAnimationFrame(this.render);
    };

    private onKeyDown = (event: KeyboardEvent) => {
        this.setInputs(event.keyCode, 1);
    };

    private onKeyUp = (event: KeyboardEvent) => {
        this.setInputs(event.keyCode, 0);
    };

    private setInputs = (key: number, value: number) => {
        switch (key) {
            case 65:
                this.inputs.throttle = value;
                break;

            case 90:
                this.inputs.brake = value;
                break;

            case 32:
                this.inputs.ebrake = value;
                break;

            case 37:
                this.inputs.left = value;
                break;

            case 39:
                this.inputs.right = value;
                break;
        }
    };
}

window.onload = () => {
    new CarSim();
};