// WASM loader - will be populated after wasm-pack build
// @ts-ignore
import init, { WasmSimulation } from './pkg/agv_wasm.js'

export default async function initWasm(plantJson: string) {
    await init()
    return new WasmSimulation(plantJson)
}
