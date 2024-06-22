const WORKGROUP_SIZE = 8 // Must agree with @workgroup_size() in compute shader
;
const elm = document.querySelector("canvas");
const context = elm.getContext("webgpu");
const adapter = await navigator.gpu.requestAdapter();
const device = await adapter.requestDevice();
const format = navigator.gpu.getPreferredCanvasFormat();
context.configure({
    device,
    format
});
const bindingTypes = {
    uniform: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    storage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    "read-only-storage": GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
};
const visC = GPUShaderStage.COMPUTE;
const visV = GPUShaderStage.VERTEX;
const visF = GPUShaderStage.FRAGMENT;
const bindGroupLayoutEntries = [];
const bindGroupEntries = [];
const scale = 8;
const speed = 32;
const dpi = window.devicePixelRatio;
elm.width = dpi * window.innerWidth / scale;
elm.height = dpi * window.innerHeight / scale;
function bind(label, binding, values, type = "uniform", visibility = visC | visF) {
    const buffer = device.createBuffer({
        label,
        size: values.byteLength,
        usage: bindingTypes[type]
    });
    device.queue.writeBuffer(buffer, 0, values) // For convenience, push the default data to the GPU
    ;
    const resource = {
        label,
        buffer
    } // the resource we want to expose to the shader variable that's bound to this location
    ;
    bindGroupLayoutEntries[binding] = {
        binding,
        visibility,
        buffer: {
            type
        }
    };
    bindGroupEntries[binding] = {
        binding,
        resource
    };
    return {
        buffer,
        binding,
        values
    };
}
function rebind(bound, vals = bound.values) {
    bound.values = vals;
    device.queue.writeBuffer(bound.buffer, 0, bound.values) // For convenience, push the default data to the GPU
    ;
}
const state = bind("state", 0, new Float32Array(elm.width * elm.height * 4), "storage");
const clock = bind("clock", 1, new Float32Array([
    0,
    0
])) // time, dt
;
const canvas = bind("canvas", 2, new Uint32Array([
    elm.width,
    elm.height
])) // width, height
;
const pointer = bind("pointer", 3, new Float32Array(6)) // x, y, old x, old y, down, padding
;
// TODO: Could we use bind() for this?
// const vertexBuffer = device.createBuffer({ size: vertices.byteLength, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST })
// device.queue.writeBuffer(vertexBuffer, 0, vertices)
// const vertexBufferLayout: GPUVertexBufferLayout = {
//   arrayStride: 8,
//   // shaderLocation is, IIRC, the vertex shader argument position that this buffer will supplied as
//   attributes: [{ format: "float32x2", offset: 0, shaderLocation: 0 }],
// }
const bindGroupLayout = device.createBindGroupLayout({
    entries: bindGroupLayoutEntries
});
const bindGroup = device.createBindGroup({
    layout: bindGroupLayout,
    entries: bindGroupEntries
});
const pipelineLayout = device.createPipelineLayout({
    bindGroupLayouts: [
        bindGroupLayout
    ]
});
const computeShader = await fetch("./compute.wgsl").then((r)=>r.text());
const vertexShader = await fetch("./vertex.wgsl").then((r)=>r.text());
const fragmentShader = await fetch("./fragment.wgsl").then((r)=>r.text());
const computeModule = device.createShaderModule({
    label: "compute shader",
    code: computeShader
});
const vertexModule = device.createShaderModule({
    label: "vertex shader",
    code: vertexShader
});
const fragmentModule = device.createShaderModule({
    label: "fragment shader",
    code: fragmentShader
});
const renderPipeline = device.createRenderPipeline({
    layout: pipelineLayout,
    vertex: {
        module: vertexModule,
        entryPoint: "vertex"
    },
    fragment: {
        module: fragmentModule,
        entryPoint: "fragment",
        targets: [
            {
                format
            }
        ]
    },
    primitive: {
        topology: "triangle-strip"
    }
});
const computePipeline = device.createComputePipeline({
    layout: pipelineLayout,
    compute: {
        module: computeModule,
        entryPoint: "compute"
    }
});
// We use a bind group to put together a collection of resources to make available to a shader all at once.
// Bind groups can include various buffers, textures, samplers, etc.
function render() {
    const commandEncoder = device.createCommandEncoder();
    const renderPassDescriptor = {
        // Each attachment is a texture we'll use in this render pass. We just need the one.
        colorAttachments: [
            {
                loadOp: "clear",
                storeOp: "store",
                // Specify the texture we're going to render into in this render pass
                // The "view" of the texture lets us configure what part of the texture to use — default is fine
                view: context.getCurrentTexture().createView()
            }
        ]
    };
    const computePass = commandEncoder.beginComputePass();
    computePass.setPipeline(computePipeline);
    computePass.setBindGroup(0, bindGroup);
    computePass.dispatchWorkgroups(speed * Math.ceil(elm.width / WORKGROUP_SIZE), Math.ceil(elm.height / WORKGROUP_SIZE));
    computePass.end();
    // Init the render pass
    const renderPass = commandEncoder.beginRenderPass(renderPassDescriptor);
    renderPass.setPipeline(renderPipeline);
    // renderPass.setVertexBuffer(0, vertexBuffer)
    renderPass.setBindGroup(0, bindGroup);
    renderPass.draw(4);
    renderPass.end();
    device.queue.submit([
        commandEncoder.finish()
    ]);
    // Now that we're done rendering, our current mouse position is copied over to the old pos
    pointer.values[2] = pointer.values[0];
    pointer.values[3] = pointer.values[1];
    rebind(pointer);
}
// ENGINE /////////////////////////////////////////////////////////////////////////////////////////
let wallTime = 0;
let time = 0;
let dt = 0;
function doTick(ms) {
    const lastWallTime = wallTime;
    wallTime = ms / 1000;
    dt = Math.min(wallTime - lastWallTime, 0.1) // Don't allow dt to be bigger than some small-ish value, like 100ms
    ;
    time += dt;
    rebind(clock, new Float32Array([
        time,
        dt
    ]));
    // device.queue.writeBuffer(clock.buffer, 0, clock.values)
    // device.queue.writeBuffer(pointer.buffer, 0, pointer.values)
    render();
    window.requestAnimationFrame(doTick);
}
window.requestAnimationFrame((ms)=>{
    wallTime = ms / 1000;
    window.requestAnimationFrame(doTick);
});
addEventListener("pointermove", (event)=>{
    pointer.values[0] = event.clientX * window.devicePixelRatio / scale;
    pointer.values[1] = event.clientY * window.devicePixelRatio / scale;
    rebind(pointer);
});
addEventListener("pointerdown", (event)=>{
    pointer.values[4] = 1;
    rebind(pointer);
});
addEventListener("pointerup", (event)=>{
    pointer.values[4] = 0;
    rebind(pointer);
});
export { }; // Convince TypeScript that this is a module
