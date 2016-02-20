/// <reference path="typings/threejs/three.d.ts" />

class CarSim {
    private camera: THREE.PerspectiveCamera;
    private cameraZ: number = 50;
    private renderer: THREE.WebGLRenderer;
    private scene: THREE.Scene;

    private car: Car;
    private inputs: InputState;

    private previousTime: number;

    private lapStart: number;
    private currentLap: number = 0;
    private lastLap: number = 0;
    private bestLap: number = 0;

    public stats: Stats;

    constructor() {
        this.stats = new Stats();

        this.previousTime = Date.now();
        this.lapStart = Date.now();

        this.inputs = new InputState();
        this.car = new Car({
            heading: 0,
            safeSteer: false,
            smoothSteer: false,
            stats: this.stats,
            x: 0,
            y: 0,
            config: {
                mass: 1400,
                halfWidth: 0.8,
                cgToFront: 2,
                cgToRear: 2,
                cgToFrontAxle: 1.25,
                cgToRearAxle: 1.25,
                cgHeight: 0.55,
                wheelRadius: 0.3,
                wheelWidth: 0.2,
                tireGrip: 15,
                lockGrip: 10,
                engineForce: 18000,
                brakeForce: 20000,
                ebrakeForce: 4500,
                weightTransfer: 0.2,
                maxSteer: 0.6,
                cornerStiffnessFront: 10,
                cornerStiffnessRear: 40
            }
        });

        this.scene = new THREE.Scene();

        var loader = new THREE.ColladaLoader();
        loader.load('assets/circuit-gilles-villeneuve.dae', (result: any) => {
            this.scene.add(result.scene);
        });

        this.initScene();

        this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight);
        this.camera.position.set(0, 0, this.cameraZ);
        this.camera.lookAt(new THREE.Vector3(0, 0, 0));

        var grid = new THREE.GridHelper(1000, 5);
        grid.rotateX(THREE.Math.degToRad(90));
        grid.setColors(0xaaaaaa, 0xcccccc);

        this.scene.add(grid);
        this.scene.add(this.car.bodyMesh);
        this.renderer = new THREE.WebGLRenderer({
            alpha: true,
            antialias: true
        });

        this.renderer.setSize(window.innerWidth, window.innerHeight);

        document.body.appendChild(this.renderer.domElement);

        document.addEventListener('keydown', this.onKeyDown, true);
        document.addEventListener('keyup', this.onKeyUp, true);

        this.render();
    }

    private initScene(): void {
        var hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.6);
        hemiLight.color.setHSL(0.6, 1, 0.6);
        hemiLight.groundColor.setHSL(0.095, 1, 0.75);
        hemiLight.position.set(0, 500, 0);
        this.scene.add(hemiLight);

        var dirLight = new THREE.DirectionalLight(0xffffff, 1);
        dirLight.color.setHSL(0.1, 1, 0.95);
        dirLight.position.set(-1, 1.75, 1);
        dirLight.position.multiplyScalar(50);
        dirLight.rotateX(THREE.Math.degToRad(90));
        this.scene.add(dirLight);

        dirLight.castShadow = true;

        dirLight.shadowMapWidth = 2048;
        dirLight.shadowMapHeight = 2048;

        var d = 50;

        dirLight.shadowCameraLeft = -d;
        dirLight.shadowCameraRight = d;
        dirLight.shadowCameraTop = d;
        dirLight.shadowCameraBottom = -d;

        dirLight.shadowCameraFar = 3500;
        dirLight.shadowBias = -0.0001;
    }

    private render = (): void => {
        var now = Date.now();
        var deltaTime = now - this.previousTime;

        this.currentLap = now - this.lapStart;

        this.car.setInputs(this.inputs);
        this.car.update(deltaTime);

        this.setCameraPosition();

        this.stats.render();
        this.renderer.render(this.scene, this.camera);

        this.previousTime = now;

        requestAnimationFrame(this.render);
    };

    private msToTime(s): string {
        var ms = s % 1000;
        s = (s - ms) / 1000;
        var secs = s % 60;
        s = (s - secs) / 60;
        var mins = s % 60;
        var hrs = (s - mins) / 60;

        return hrs + ':' + mins + ':' + secs + '.' + ms;
    }

    private setCameraPosition(): void {
        var angle = this.car.movingDirection;
        var offset = this.car.speed * 0.2;
        this.cameraZ = 50 + offset;

        offset = offset / 2;
        var x = Math.cos(angle) * offset;
        var y = Math.sin(angle) * offset;

        this.camera.position.set(this.car.bodyMesh.position.x - x, this.car.bodyMesh.position.y - y, this.cameraZ);
    }

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