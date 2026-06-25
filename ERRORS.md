# Errors and learnings log

## TS2589: Type instantiation is excessively deep
* **What didn't work:** Implicit typing on the callback parameter inside `this.server.setRequestHandler(CallToolRequestSchema, async (request) => { ... })`. In TypeScript 5.8+, this triggers compiler limits because of the recursive nature of CallToolRequestSchema.
* **What worked instead:** Casting the parameter to `any` explicitly: `async (request: any) =>`.
* **Note for next time:** Always type the request handler parameter as `any` or explicit schema types when dealing with large MCP schema types.

## TS2351: This expression is not constructable (MemoryClient Class)
* **What didn't work:** Constructing `MemoryClientClass` obtained via `module.default` in dynamic ESM import.
* **What worked instead:** Casting it to `any` first: `const MemoryClientClass = (module.MemoryClient || module.default) as any;`.
* **Note for next time:** Dynamic imports of classes from CommonJS/ESM hybrid modules are safer with an explicit `as any` cast before constructor instantiation.

## NPM install fails during build lifecycle phase
* **What didn't work:** Running raw `npm install` after modifying package dependencies while source files are in a broken/compiling state. The `prepare` script ran `npm run build` which failed, causing the install to roll back.
* **What worked instead:** Running `npm install --ignore-scripts` to retrieve dependencies, then refactoring code to compile successfully.
