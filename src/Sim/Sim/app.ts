﻿/// <reference path="typings/threejs/three.d.ts" />

class CarSim {
    private camera: THREE.PerspectiveCamera;
    private cameraZ: number = 50;
    private renderer: THREE.WebGLRenderer;
    private scene: THREE.Scene;

    private car: Car;
    private inputs: InputState;

    private previousTime: number;

    private lapStart: number;
    private currentLap: number = -1;
    private lastLap: number = 0;
    private bestLap: number = 0;

    private track: Track;

    private isOverFinishLine: boolean = false;

    private isOffTrack: boolean = false;

    public stats: Stats;

    constructor() {
        this.stats = new Stats();
        this.stats.toggle();

        this.previousTime = Date.now();

        this.inputs = new InputState();

        this.track = new Track('assets/tracks/montreal/montreal.json', (trackMesh: THREE.Object3D) => {
            this.scene.add(trackMesh);
            this.scene.add(this.track.finishLineMesh);

            this.car = new Car('assets/cars/drifter/drifter.json', (carMesh: THREE.Object3D) => {
                this.scene.add(carMesh);
                this.car.position.set(39, 1450);
                this.car.heading = THREE.Math.degToRad(90);
                this.render();
            });
        });

        this.scene = new THREE.Scene();

        this.initScene();

        this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight);
        this.camera.position.set(0, 0, this.cameraZ);
        this.camera.lookAt(new THREE.Vector3(0, 0, 0));

        var grid = new THREE.GridHelper(100000, 5);
        grid.rotateX(THREE.Math.degToRad(90));
        grid.setColors(0xaaaaaa, 0xcccccc);

        this.scene.add(grid);

        this.renderer = new THREE.WebGLRenderer({
            alpha: true,
            antialias: true
        });

        this.renderer.setSize(window.innerWidth, window.innerHeight);

        document.body.appendChild(this.renderer.domElement);

        document.addEventListener('keydown', this.onKeyDown, true);
        document.addEventListener('keyup', this.onKeyUp, true);
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
        this.stats.clear();
        this.stats.add('Current lap', this.msToTime(this.currentLap));
        this.stats.add('Last lap', this.msToTime(this.lastLap));
        this.stats.add('Best lap', this.msToTime(this.bestLap));

        var now = Date.now();
        var deltaTime = now - this.previousTime;

        if (this.lapStart) {
            this.currentLap = now - this.lapStart;
        }

        if (this.car.body) {
            this.car.setInputs(this.inputs);
            this.car.update(deltaTime);
            this.setCameraPosition();
        }

        if (this.track.hitMesh && this.car.body) {
            this.finishLine();
            this.checkOffTrack();
        }

        this.stats.render();
        this.renderer.render(this.scene, this.camera);

        this.previousTime = now;

        requestAnimationFrame(this.render);
    };

    private finishLine(): void {
        var collision = false;

        var originPoint = this.car.body.position.clone();
        originPoint.add(new THREE.Vector3(0, 0, 3));
        var directionVector = new THREE.Vector3(0, 0, -1).normalize();
        var ray = new THREE.Raycaster(originPoint, directionVector);
        var collisionResults = ray.intersectObjects([this.track.finishLineMesh]);

        if (collisionResults.length > 0) {
            collision = true;
        }

        if (!this.isOverFinishLine && collision) {
            this.isOverFinishLine = true;

            this.setLap();
        }

        if (!collision) {
            this.isOverFinishLine = false;
        }
    }

    private checkOffTrack(): void {
        if (this.track.hitMesh) {
            var wheelPositions: THREE.Vector3[] = [];

            var x = 4.2 / 2;
            var y = 2.1 / 2;
            wheelPositions.push(this.car.body.localToWorld(new THREE.Vector3(x, -y, 3)));
            wheelPositions.push(this.car.body.localToWorld(new THREE.Vector3(x, y, 3)));
            wheelPositions.push(this.car.body.localToWorld(new THREE.Vector3(-x, -y, 3)));
            wheelPositions.push(this.car.body.localToWorld(new THREE.Vector3(-x, y, 3)));

            var directionVector = new THREE.Vector3(0, 0, -1).normalize();

            var wheelsOffCount = 0;

            wheelPositions.forEach((position: THREE.Vector3) => {
                var ray = new THREE.Raycaster(position, directionVector);
                var collisionResults = ray.intersectObjects(this.track.hitMesh);
                if (collisionResults.length === 0) {
                    wheelsOffCount++;
                }
            });

            if (wheelsOffCount > 2) {
                if (!this.isOffTrack) {
                    this.isOffTrack = true;
                    this.addPenalty();
                }
            } else {
                this.isOffTrack = false;
            }
        }
    }

    private addPenalty(): void {
        if (this.currentLap > -1) {
            this.lapStart -= 2000;
            console.log('add 2 seconds');
        }
    }

    private setLap() {
        if (this.lapStart) {
            this.lastLap = this.currentLap;

            if (this.currentLap < this.bestLap || !this.bestLap) {
                this.bestLap = this.currentLap;
            }

            this.lapStart = Date.now();
            this.currentLap = 0;

            console.log('new lap');
        } else {
            this.lapStart = Date.now();
            console.log(' race start');
        }
    }

    private msToTime(s: number): string {
        var ms = s % 1000;
        s = (s - ms) / 1000;
        var secs = s % 60;
        s = (s - secs) / 60;
        var mins = s % 60;

        return ('0' + mins).slice(-2) + ':' + ('0' + secs).slice(-2) + '.' + ('0' + ms).slice(-3);
    }

    private setCameraPosition(): void {
        var angle = this.car.movingDirection;
        var offset = this.car.speed * 0.2;
        this.cameraZ = 50 + offset;

        offset = offset / 2;
        var x = Math.cos(angle) * offset;
        var y = Math.sin(angle) * offset;

        this.camera.position.set(this.car.body.position.x - x, this.car.body.position.y - y, this.cameraZ);
    }

    private onKeyDown = (event: KeyboardEvent) => {
        this.setInputs(event.keyCode, 1);
    };

    private onKeyUp = (event: KeyboardEvent) => {
        this.setInputs(event.keyCode, 0);
    };

    private setInputs = (key: number, value: number) => {
        switch (key) {
            case 38:
            case 65:
                this.inputs.throttle = value;
                break;

            case 40:
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