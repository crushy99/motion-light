// @ts-ignore
import { mat4 } from "../../node_modules/gl-matrix/esm/index.js";
import {TriangleMesh} from "../meshes/TriangleMesh.js";
import {shaders} from "../shaders/shaders.js";

export class Renderer {
    canvas: HTMLCanvasElement;

    // device/context
    adapter: GPUAdapter;
    device: GPUDevice;
    context: GPUCanvasContext;
    format: GPUTextureFormat;

    // pipeline
    uniformBuffer: GPUBuffer;
    bindGroup: GPUBindGroup;
    pipeline: GPURenderPipeline;

    // assets
    triangleMesh: TriangleMesh;
    // FIXME: remove since temporary
    t: number;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.t = 0;
    }

    private setupDevice = async () => {
        this.canvas = <HTMLCanvasElement> document.getElementById("ml-canvas");
        this.adapter = <GPUAdapter> await navigator.gpu?.requestAdapter();
        this.device = <GPUDevice> await this.adapter?.requestDevice();
        this.context = <GPUCanvasContext> this.canvas.getContext("webgpu");
        this.format = "bgra8unorm";
        this.context.configure({
            device: this.device,
            format: this.format,
            alphaMode: "opaque",
        });
    }

    private makePipeline = async () => {
        this.uniformBuffer = this.device.createBuffer({
            size: 64 * 3,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });

        const bindGroupLayout = this.device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.VERTEX,
                    buffer: {},
                }
            ],
        });

        this.bindGroup = this.device.createBindGroup({
            layout: bindGroupLayout,
            entries: [
                {
                    binding: 0,
                    resource: {
                        buffer: this.uniformBuffer
                    }
                }
            ],
        });

        const pipelineLayout = this.device.createPipelineLayout({
            bindGroupLayouts: [bindGroupLayout],
        });

        this.pipeline = this.device.createRenderPipeline({
            vertex: {
                module: this.device.createShaderModule({
                    code: shaders,
                }),
                entryPoint: "vs_main",
                buffers: [this.triangleMesh.bufferLayout],
            },
            fragment: {
                module: this.device.createShaderModule({
                    code: shaders,
                }),
                entryPoint: "fs_main",
                targets: [{
                    format: this.format,
                }],
            },
            primitive: {
                topology: "triangle-list",
            },
            layout: pipelineLayout,
        });
    };

    private createAssets = () => {
        this.triangleMesh = new TriangleMesh(this.device);
    }

    private render = () => {
        const projection = mat4.create();
        mat4.perspective(projection, Math.PI / 4, window.innerWidth / window.innerHeight, 0.1, 10);

        const view = mat4.create();
        mat4.lookAt(view, [-2, 0, 2], [0, 0, 0], [0, 0, 1]);

        const model = mat4.create();
        mat4.rotate(model, model, this.t, [0, 0, 1]);

        this.device.queue.writeBuffer(this.uniformBuffer, 0, <ArrayBuffer> model);
        this.device.queue.writeBuffer(this.uniformBuffer, 64, <ArrayBuffer> view);
        this.device.queue.writeBuffer(this.uniformBuffer, 128, <ArrayBuffer> projection);

        const commandEncoder: GPUCommandEncoder = this.device.createCommandEncoder();
        const textureView: GPUTextureView = this.context.getCurrentTexture().createView();
        const renderPass: GPURenderPassEncoder = commandEncoder.beginRenderPass({
            colorAttachments: [{
                view: textureView,
                clearValue: {r: 0.5, g: 0.0, b: 0.25, a: 1.0},
                loadOp: "clear",
                storeOp: "store",
            }]
        });

        renderPass.setPipeline(this.pipeline);
        renderPass.setBindGroup(0, this.bindGroup);
        renderPass.setVertexBuffer(0, this.triangleMesh.buffer);
        renderPass.draw(3, 1, 0, 0);
        renderPass.end();

        this.device.queue.submit([commandEncoder.finish()]);
    }

    public initialize = async () => {
        await this.setupDevice();
        this.createAssets();
        await this.makePipeline();
        this.render();
    }
}
