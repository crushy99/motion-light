import {Renderer} from "./renderer/Renderer.js";

const canvas: HTMLCanvasElement = <HTMLCanvasElement> document.getElementById("ml-canvas");
canvas.setAttribute("width", window.innerWidth.toString(10));
canvas.setAttribute("height", window.innerHeight.toString(10));

const renderer = new Renderer(canvas);

renderer.initialize();

