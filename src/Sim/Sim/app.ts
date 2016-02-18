/// <reference path="typings/threejs/three.d.ts" />

class CarSim {
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;
    private scene: THREE.Scene;

    private car: Car;
    private inputs: InputState;

    private previousTime: number;

    constructor() {
        this.previousTime = Date.now();
        this.inputs = new InputState();
        this.car = new Car();

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight);
        this.camera.position.set(0, 0, 50);
        this.camera.lookAt(new THREE.Vector3(0, 0, 0));

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

        this.car.update(deltaTime);

        this.renderer.render(this.scene, this.camera);

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
                this.car.inputs.throttle = value;
                break;

            case 90:
                this.car.inputs.brake = value;
                break;

            case 32:
                this.car.inputs.ebrake = value;
                break;

            case 37:
                this.car.inputs.left = value;
                break;

            case 39:
                this.car.inputs.right = value;
                break;
        }
    };
}

window.onload = () => {
    new CarSim();
};