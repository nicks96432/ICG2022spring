"use strict";

// common variables

const now = Date.now();
const config = {
    lights: [
        {
            color: [234 / 255, 91 / 255, 118 / 255],
            position: [-1000.0, 1000.0, 1000.0]
        },
        {
            color: [100 / 255, 149 / 255, 207 / 255],
            position: [-1000.0, -1000.0, 1000.0]
        },
        {
            color: [254 / 255, 213 / 255, 82 / 255],
            position: [1000.0, -1000.0, 1000.0]
        }
    ],
    items: [
        {
            alpha: 5.0,
            buffers: undefined,
            Ka: 0.1,
            Kd: 0.6,
            Ks: 0.2,
            model: "Teapot",
            position: [-35, 0, -75],
            rotate: {
                angle: [0, 0, 0],
                lastTime: now,
                rate: [0, 0.03, 0]
            },
            scale: [1, 1, 1],
            shader: "flat",
            shear: [90, 90, 90]
        },
        {
            alpha: 5.0,
            buffers: undefined,
            Ka: 0.1,
            Kd: 0.6,
            Ks: 0.2,
            model: "Teapot",
            position: [0, 0, -75],
            rotate: {
                angle: [0, 0, 0],
                lastTime: now,
                rate: [0, 0.03, 0]
            },
            scale: [1, 1, 1],
            shader: "gouraud",
            shear: [90, 90, 90]
        },
        {
            alpha: 5.0,
            buffers: undefined,
            Ka: 0.1,
            Kd: 0.6,
            Ks: 0.2,
            model: "Teapot",
            position: [35, 0, -75],
            rotate: {
                angle: [0, 0, 0],
                lastTime: now,
                rate: [0, 0.03, 0]
            },
            scale: [1, 1, 1],
            shader: "phong",
            shear: [90, 90, 90]
        }
    ]
};

const programs = {};

const mvMatrix = mat4.create();
const pMatrix = mat4.create();

/**
 * Initialize WebGL.
 *
 * @param {HTMLCanvasElement} canvas the canvas
 * @returns {WebGL2RenderingContext} a WebGL context.
 */
const initGL = canvas => {
    try {
        let gl = canvas.getContext("webgl2");
        gl.viewportWidth = canvas.width;
        gl.viewportHeight = canvas.height;
        return gl;
    } catch (e) {
        alert("Could not initialise WebGL, sorry :-(");
        return null;
    }
};

/**
 * create a WebGL shader from the source.
 *
 * @param {WebGL2RenderingContext} gl WebGL context
 * @param {string} source the shading language source
 * @param {"fragment" | "vertex"} type type of the source
 * @returns {WebGLShader} the created WebGL shader
 */
const getShader = (gl, source, type) => {
    let shader;
    if (type === "fragment") shader = gl.createShader(gl.FRAGMENT_SHADER);
    else if (type === "vertex") shader = gl.createShader(gl.VERTEX_SHADER);
    else return null;

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(shader));
        return null;
    }

    return shader;
};

/**
 * create a WebGL program according to the name of the shading algorithm.
 *
 * @param {WebGL2RenderingContext} gl WebGL context
 * @param {"none" | "flat" | "gouraud" | "phong"} algorithm the shading algorithm to use
 * @returns {Promise<WebGLProgram>} a promise of compiled program
 */
const createWebGLProgram = async (gl, algorithm) => {
    let vertexShaderSource, fragmentShaderSource;
    try {
        vertexShaderSource = await fetch(`./shader/${algorithm}.vert`).then(
            async res => await res.text()
        );
        fragmentShaderSource = await fetch(`./shader/${algorithm}.frag`).then(
            async res => await res.text()
        );
    } catch (e) {
        console.error(`unknown shading algorithm: ${algorithm}`);
        return null;
    }

    const vertexShader = getShader(gl, vertexShaderSource, "vertex");
    const fragmentShader = getShader(gl, fragmentShaderSource, "fragment");

    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS))
        console.error(gl.getProgramInfoLog(shaderProgram));

    gl.useProgram(shaderProgram);

    shaderProgram.a_VertexPosition = gl.getAttribLocation(
        shaderProgram,
        "a_VertexPosition"
    );
    gl.enableVertexAttribArray(shaderProgram.a_VertexPosition);

    shaderProgram.a_vertexNormal = gl.getAttribLocation(
        shaderProgram,
        "a_VertexNormal"
    );
    gl.enableVertexAttribArray(shaderProgram.a_vertexNormal);

    shaderProgram.a_VertexFrontColor = gl.getAttribLocation(
        shaderProgram,
        "a_VertexFrontColor"
    );
    gl.enableVertexAttribArray(shaderProgram.a_VertexFrontColor);

    shaderProgram.pMatrixUniform = gl.getUniformLocation(
        shaderProgram,
        "u_PMatrix"
    );
    shaderProgram.mvMatrixUniform = gl.getUniformLocation(
        shaderProgram,
        "u_MVMatrix"
    );

    for (let i = 0; i < 3; i++) {
        shaderProgram[`light${i}Position`] = gl.getUniformLocation(
            shaderProgram,
            `u_lights[${i}].position`
        );
        shaderProgram[`light${i}Color`] = gl.getUniformLocation(
            shaderProgram,
            `u_lights[${i}].color`
        );
    }

    ["Ka", "Kd", "Ks", "alpha"].forEach(
        v => (shaderProgram[v] = gl.getUniformLocation(shaderProgram, `u_${v}`))
    );

    return shaderProgram;
};

/**
 *  use fetch API to load model.
 *
 * @param {WebGL2RenderingContext} gl WebGL context
 * @param {string} name name of the model
 * @param {0 | 1 | 2} itemNum number of the item to load to
 */
const loadModel = async (gl, name, itemNum) => {
    let response = await fetch(`./model/${name}.json`);
    const data = await response.json();
    const buffers = {};

    buffers.vertexPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.vertexPositionBuffer);
    gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array(data.vertexPositions),
        gl.STATIC_DRAW
    );
    buffers.vertexPositionBuffer.itemSize = 3;
    buffers.vertexPositionBuffer.numItems = data.vertexPositions.length / 3;

    buffers.vertexNormalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.vertexNormalBuffer);
    gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array(data.vertexNormals),
        gl.STATIC_DRAW
    );
    buffers.vertexNormalBuffer.itemSize = 3;
    buffers.vertexNormalBuffer.numItems = data.vertexNormals.length / 3;

    buffers.vertexFrontColorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.vertexFrontColorBuffer);
    gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array(data.vertexFrontcolors),
        gl.STATIC_DRAW
    );
    buffers.vertexFrontColorBuffer.itemSize = 3;
    buffers.vertexFrontColorBuffer.numItems = data.vertexFrontcolors.length / 3;

    config.items[itemNum].buffers = buffers;
};

/**
 * draw the scene of the shader program.
 *
 * @param {WebGL2RenderingContext} gl WebGL context
 */
const drawScene = gl => {
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Setup Projection Matrix
    mat4.perspective(
        45,
        gl.viewportWidth / gl.viewportHeight,
        0.1,
        100.0,
        pMatrix
    );

    for (const item of config.items) {
        if (item.buffers === undefined) continue;
        const shaderProgram = programs[item.shader];
        gl.useProgram(shaderProgram);

        // Setup Model-View Matrix
        mat4.identity(mvMatrix);
        mat4.translate(mvMatrix, item.position);
        mat4.scale(mvMatrix, item.scale);

        const degToRad = deg => (deg * Math.PI) / 180;

        const shearMatrix = mat4.create();
        mat4.identity(shearMatrix);
        shearMatrix[4] = 1 / Math.tan(degToRad(item.shear[0]));
        shearMatrix[9] = 1 / Math.tan(degToRad(item.shear[1]));
        shearMatrix[2] = 1 / Math.tan(degToRad(item.shear[2]));
        mat4.multiply(mvMatrix, shearMatrix, mvMatrix);

        mat4.rotate(mvMatrix, degToRad(item.rotate.angle[0]), [1, 0, 0]);
        mat4.rotate(mvMatrix, degToRad(item.rotate.angle[1]), [0, 1, 0]);
        mat4.rotate(mvMatrix, degToRad(item.rotate.angle[2]), [0, 0, 1]);

        gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
        gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);

        gl.uniform1f(shaderProgram.Ka, item.Ka);
        gl.uniform1f(shaderProgram.Kd, item.Kd);
        gl.uniform1f(shaderProgram.Ks, item.Ks);
        gl.uniform1f(shaderProgram.alpha, item.alpha);

        for (let i = 0; i < config.lights.length; ++i) {
            gl.uniform3fv(
                shaderProgram[`light${i}Position`],
                config.lights[i].position
            );
            gl.uniform3fv(
                shaderProgram[`light${i}Color`],
                config.lights[i].color
            );
        }

        // Setup model position data
        gl.bindBuffer(gl.ARRAY_BUFFER, item.buffers.vertexPositionBuffer);
        gl.vertexAttribPointer(
            shaderProgram.a_VertexPosition,
            item.buffers.vertexPositionBuffer.itemSize,
            gl.FLOAT,
            false,
            0,
            0
        );

        // Setup model surface normal data
        gl.bindBuffer(gl.ARRAY_BUFFER, item.buffers.vertexNormalBuffer);
        gl.vertexAttribPointer(
            shaderProgram.a_vertexNormal,
            item.buffers.vertexNormalBuffer.itemSize,
            gl.FLOAT,
            false,
            0,
            0
        );

        // Setup model front color data
        gl.bindBuffer(gl.ARRAY_BUFFER, item.buffers.vertexFrontColorBuffer);
        gl.vertexAttribPointer(
            shaderProgram.a_VertexFrontColor,
            item.buffers.vertexFrontColorBuffer.itemSize,
            gl.FLOAT,
            false,
            0,
            0
        );

        gl.drawArrays(
            gl.TRIANGLES,
            0,
            item.buffers.vertexPositionBuffer.numItems
        );

        // animation
        const rotate = item.rotate;
        const timeNow = Date.now();
        for (let i = 0; i < rotate.angle.length; i++) {
            rotate.angle[i] += rotate.rate[i] * (timeNow - rotate.lastTime);
            if (rotate.angle[i] > 360) rotate.angle[i] -= 360;
        }
        rotate.lastTime = timeNow;
    }
};

/**
 * redraw the canvas to animate the scene.
 *
 * @param {WebGL2RenderingContext} gl WebGL context
 */
const tick = gl => {
    window.requestAnimationFrame(() => tick(gl));
    drawScene(gl);
};

/**
 * start WebGL.
 */
const webGLStart = async () => {
    const canvas = document.getElementById("ICG-canvas");
    const gl = initGL(canvas);

    const algorithms = ["cartoon", "flat", "gouraud", "none", "phong"];
    for (const algorithm of algorithms)
        programs[algorithm] = await createWebGLProgram(gl, algorithm);

    for (let i = 0; i < config.items.length; i++) {
        loadModel(gl, "Teapot", i);

        const item = config.items[i];

        const shader_i = document.getElementById(`shader${i}`);
        shader_i.onchange = () => (item.shader = shader_i.value);

        const model_i = document.getElementById(`model${i}`);
        model_i.onchange = () => {
            item.model = model_i.value;
            loadModel(gl, item.model, i);
        };

        const ka_i = document.getElementById(`ka${i}`);
        ka_i.onchange = () => (item.Ka = parseFloat(ka_i.value));

        const ks_i = document.getElementById(`ks${i}`);
        ks_i.onchange = () => (item.Ks = parseFloat(ks_i.value));

        const kd_i = document.getElementById(`kd${i}`);
        kd_i.onchange = () => (item.Kd = parseFloat(kd_i.value));

        const alpha_i = document.getElementById(`alpha${i}`);
        alpha_i.onchange = () => (item.alpha = parseFloat(alpha_i.value));

        const x_i = document.getElementById(`x${i}`);
        const y_i = document.getElementById(`y${i}`);
        const z_i = document.getElementById(`z${i}`);
        const handlePositionChange = () =>
            (item.position = [
                parseFloat(x_i.value),
                parseFloat(y_i.value),
                parseFloat(z_i.value)
            ]);
        x_i.onchange = handlePositionChange;
        y_i.onchange = handlePositionChange;
        z_i.onchange = handlePositionChange;

        const rotx_i = document.getElementById(`rotx${i}`);
        const roty_i = document.getElementById(`roty${i}`);
        const rotz_i = document.getElementById(`rotz${i}`);
        const handleRotationChange = () =>
            (item.rotate.rate = [
                parseFloat(rotx_i.value),
                parseFloat(roty_i.value),
                parseFloat(rotz_i.value)
            ]);
        rotx_i.onchange = handleRotationChange;
        roty_i.onchange = handleRotationChange;
        rotz_i.onchange = handleRotationChange;

        const scalex_i = document.getElementById(`scalex${i}`);
        const scaley_i = document.getElementById(`scaley${i}`);
        const scalez_i = document.getElementById(`scalez${i}`);
        const handleScaleChange = () =>
            (item.scale = [
                parseFloat(scalex_i.value),
                parseFloat(scaley_i.value),
                parseFloat(scalez_i.value)
            ]);
        scalex_i.onchange = handleScaleChange;
        scaley_i.onchange = handleScaleChange;
        scalez_i.onchange = handleScaleChange;

        const shearx_i = document.getElementById(`shearx${i}`);
        const sheary_i = document.getElementById(`sheary${i}`);
        const shearz_i = document.getElementById(`shearz${i}`);
        const handleShearChange = () =>
            (item.shear = [
                parseFloat(shearx_i.value),
                parseFloat(sheary_i.value),
                parseFloat(shearz_i.value)
            ]);
        shearx_i.onchange = handleShearChange;
        sheary_i.onchange = handleShearChange;
        shearz_i.onchange = handleShearChange;
    }

    for (let i = 0; i < config.lights.length; i++) {
        const light = config.lights[i];

        const r_i = document.getElementById(`light-r${i}`);
        const g_i = document.getElementById(`light-g${i}`);
        const b_i = document.getElementById(`light-b${i}`);
        const handleColorChange = () =>
            (light.color = [
                parseFloat(r_i.value / 255),
                parseFloat(g_i.value / 255),
                parseFloat(b_i.value / 255)
            ]);
        r_i.onchange = handleColorChange;
        g_i.onchange = handleColorChange;
        b_i.onchange = handleColorChange;

        const x_i = document.getElementById(`light-x${i}`);
        const y_i = document.getElementById(`light-y${i}`);
        const z_i = document.getElementById(`light-z${i}`);
        const handlePositionChange = () =>
            (light.position = [
                parseFloat(x_i.value),
                parseFloat(y_i.value),
                parseFloat(z_i.value)
            ]);
        x_i.onchange = handlePositionChange;
        y_i.onchange = handlePositionChange;
        z_i.onchange = handlePositionChange;
    }

    gl.clearColor(0.5, 0.5, 0.5, 1.0);
    gl.enable(gl.DEPTH_TEST);

    tick(gl);
};

window.onload = webGLStart;
