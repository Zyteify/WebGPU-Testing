const response = await fetch("./shaders.wgsl");
const shader = await response.text();

var GRID_SIZEX = 32;
var GRID_SIZEY = 32;


// Create an HTMLCanvasElement
const canvas = document.createElement('canvas');
document.body.appendChild(canvas);

// Get the WebGPU context
const adapter = await navigator.gpu.requestAdapter();
const device = await adapter.requestDevice();
const context = canvas.getContext('gpupresent');

// Create a 4x4 array of 32-bit floats
const inputArrays = [];
for (let i = 0; i < GRID_SIZEX; ++i) {
    const array = new Uint32Array(GRID_SIZEY);
    for (let j = 0; j < GRID_SIZEY; ++j) {
        array[j] = parseFloat(i);
    }
    inputArrays.push(array);
}

console.log(inputArrays);



// Create the buffer
const buffer = device.createBuffer({
    size: inputArrays.length * inputArrays[0].byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
});

// Create the buffer
const bufferOutput = device.createBuffer({
    size: inputArrays.length * inputArrays[0].byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
});

// copy the input arrays into an array buffer
const arrayBuffer = new ArrayBuffer(inputArrays.length * inputArrays[0].byteLength);
const view = new Float32Array(arrayBuffer);
for (let i = 0; i < inputArrays.length; ++i) {
    view.set(inputArrays[i], i * inputArrays[i].length);
}


//use writebuffer to transfer data to GPU
device.queue.writeBuffer(buffer, 0, arrayBuffer);


// Set up the bind group and bind the buffer
const bindGroupLayout = device.createBindGroupLayout({
    entries: [{
        binding: 0,
        visibility: GPUShaderStage.COMPUTE,
        buffer: {
            type: 'storage'
        },

    },
    {
        binding: 1,
        visibility: GPUShaderStage.COMPUTE,
        buffer: {
            type: 'storage'
        }
    }
    ]
});
const bindGroup = device.createBindGroup({
    layout: bindGroupLayout,
    entries: [{
        binding: 0,
        resource: {
            buffer: buffer
        }
    }, {
        binding: 1,
        resource: {
            buffer: bufferOutput
        }
    }]
});

// Create the pipeline layout and pipeline
// Create the compute shader that will process the game of life simulation.
const simulationShaderModule = device.createShaderModule({
    label: "Simulation shader1",
    code:
    shader
});

const pipelineLayout = device.createPipelineLayout(
    {
        label: "Cell Pipeline Layout",
        bindGroupLayouts: [
            bindGroupLayout, //group 0 
        ],
    },
);


// Create a compute pipeline that updates the game state.
const simulationPipeline = device.createComputePipeline({
    label: "Simulation pipeline",
    layout: pipelineLayout,
    compute: {
        module: simulationShaderModule,
        entryPoint: "computeMain",
    }
});
// Perform rendering or other operations using the buffer and shader
const encoder = device.createCommandEncoder();

// Start a compute pass
var computePass = encoder.beginComputePass();

computePass.setPipeline(simulationPipeline)
computePass.setBindGroup(0, bindGroup);
computePass.dispatchWorkgroups(8, 8);
computePass.end();
device.queue.submit([encoder.finish()]);

var stagingBuffer = device.createBuffer({
    label: "Staging buffer",
    size: inputArrays.length * inputArrays[0].byteLength,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
});

var BUFFER_SIZE = inputArrays.length * inputArrays[0].byteLength

const encoder2 = device.createCommandEncoder();
encoder2.copyBufferToBuffer(
    bufferOutput,
    0, // Source offset
    stagingBuffer,
    0, // Destination offset
    BUFFER_SIZE
);
const commands2 = encoder2.finish();
device.queue.submit([commands2]);

const encoder3 = device.createCommandEncoder();

//create a gridx by gridy array of float32arrays
var outputArrays = [];
for (let i = 0; i < GRID_SIZEX; ++i) {
    const array = new Uint32Array(GRID_SIZEY);
    outputArrays.push(array);
}


//map the buffer
stagingBuffer.mapAsync(GPUMapMode.READ, 0, stagingBuffer.size)
    .then(() => {
        const data = stagingBuffer.getMappedRange(0, BUFFER_SIZE).slice(0);
        //create 16 floats from the data arraybuffer
        const view = new Uint32Array(data);
        for (let i = 0; i < outputArrays.length; ++i) {
            outputArrays[i] = view.subarray(i * GRID_SIZEX, i * GRID_SIZEY + GRID_SIZEX);
            console.log(view.subarray(i * GRID_SIZEX, i * GRID_SIZEY + GRID_SIZEX))
        }
        
        console.log('outputArrays');
        console.log(outputArrays)
        stagingBuffer.unmap();

        //create a gridx by gridy array of float32arrays

    })
    .catch(error => {
        console.log(error);
        console.log(stagingBuffer.mapState);
        console.log(stagingBuffer.getMappedRange);
    });

const commands = encoder3.finish();
device.queue.submit([commands]);
