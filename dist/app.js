/// <reference path="typings/threejs/three.d.ts" />
var CarSim = (function () {
    function CarSim() {
        var _this = this;
        this.cameraZ = 50;
        this.currentLap = 0;
        this.lastLap = 0;
        this.bestLap = 0;
        this.isOverFinishLine = false;
        this.isFinishLineReady = false;
        this.render = function () {
            _this.stats.clear();
            _this.stats.add('Current lap', _this.msToTime(_this.currentLap));
            _this.stats.add('Last lap', _this.msToTime(_this.lastLap));
            _this.stats.add('Best lap', _this.msToTime(_this.bestLap));
            var now = Date.now();
            var deltaTime = now - _this.previousTime;
            if (_this.lapStart) {
                _this.currentLap = now - _this.lapStart;
            }
            _this.car.setInputs(_this.inputs);
            _this.car.update(deltaTime);
            _this.setCameraPosition();
            _this.finishLine();
            _this.stats.render();
            _this.renderer.render(_this.scene, _this.camera);
            _this.previousTime = now;
            requestAnimationFrame(_this.render);
        };
        this.onKeyDown = function (event) {
            _this.setInputs(event.keyCode, 1);
        };
        this.onKeyUp = function (event) {
            _this.setInputs(event.keyCode, 0);
        };
        this.setInputs = function (key, value) {
            switch (key) {
                case 38:
                case 65:
                    _this.inputs.throttle = value;
                    break;
                case 40:
                case 90:
                    _this.inputs.brake = value;
                    break;
                case 32:
                    _this.inputs.ebrake = value;
                    break;
                case 37:
                    _this.inputs.left = value;
                    break;
                case 39:
                    _this.inputs.right = value;
                    break;
            }
        };
        this.stats = new Stats();
        this.stats.toggle();
        this.previousTime = Date.now();
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
        loader.load('assets/circuit-gilles-villeneuve.dae', function (result) {
            _this.track = result.scene;
            _this.scene.add(_this.track);
            _this.car.position.set(39, 1450);
            _this.car.heading = THREE.Math.degToRad(90);
            _this.finishLineGeometry = new THREE.BoxGeometry(40, 0, 2);
            var material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
            _this.finishLineMesh = new THREE.Mesh(_this.finishLineGeometry, material);
            _this.finishLineMesh.position.set(41, 1627, 0);
            _this.scene.add(_this.finishLineMesh);
        });
        this.initScene();
        this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight);
        this.camera.position.set(0, 0, this.cameraZ);
        this.camera.lookAt(new THREE.Vector3(0, 0, 0));
        var grid = new THREE.GridHelper(100000, 5);
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
    CarSim.prototype.initScene = function () {
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
    };
    CarSim.prototype.finishLine = function () {
        if (this.track) {
            var originPoint = this.car.bodyMesh.position.clone();
            var collision = false;
            for (var vertexIndex = 0; vertexIndex < this.car.bodyGeometry.vertices.length; vertexIndex++) {
                var localVertex = this.car.bodyGeometry.vertices[vertexIndex].clone();
                var globalVertex = localVertex.applyMatrix4(this.car.bodyMesh.matrix);
                var directionVector = globalVertex.sub(this.car.bodyMesh.position);
                var ray = new THREE.Raycaster(originPoint, directionVector.clone().normalize());
                var collisionResults = ray.intersectObjects([this.finishLineMesh]);
                if (collisionResults.length > 0 && collisionResults[0].distance < directionVector.length()) {
                    collision = true;
                }
            }
            if (!this.isOverFinishLine && collision) {
                this.isOverFinishLine = true;
                if (this.isFinishLineReady) {
                    this.setLap();
                }
                this.isFinishLineReady = true;
            }
            if (!collision) {
                this.isOverFinishLine = false;
            }
        }
    };
    CarSim.prototype.setLap = function () {
        if (this.lapStart) {
            this.lastLap = this.currentLap;
            if (this.currentLap < this.bestLap || !this.bestLap) {
                this.bestLap = this.currentLap;
            }
            this.lapStart = Date.now();
            this.currentLap = 0;
            console.log('new lap');
        }
        else {
            this.lapStart = Date.now();
            console.log(' race start');
        }
    };
    CarSim.prototype.msToTime = function (s) {
        var ms = s % 1000;
        s = (s - ms) / 1000;
        var secs = s % 60;
        s = (s - secs) / 60;
        var mins = s % 60;
        var hrs = (s - mins) / 60;
        return ('0' + mins).slice(-2) + ':' + ('0' + secs).slice(-2) + '.' + ('0' + ms).slice(-3);
    };
    CarSim.prototype.setCameraPosition = function () {
        var angle = this.car.movingDirection;
        var offset = this.car.speed * 0.2;
        this.cameraZ = 50 + offset;
        offset = offset / 2;
        var x = Math.cos(angle) * offset;
        var y = Math.sin(angle) * offset;
        this.camera.position.set(this.car.bodyMesh.position.x - x, this.car.bodyMesh.position.y - y, this.cameraZ);
    };
    return CarSim;
})();
window.onload = function () {
    new CarSim();
};
//# sourceMappingURL=app.js.map