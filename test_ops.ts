import { LocalOperations } from "./src/core/operations.ts";
import * as path from "path";
import * as fs from "fs/promises";

async function main() {
    const workspaceDir = path.join(process.cwd(), "workspace");
    const ops = new LocalOperations(workspaceDir);

    try {
        console.log("Testing write...");
        const writeRes = await ops.writeFile("test.txt", "Hello World!");
        console.log(writeRes);

        console.log("Testing read...");
        const readRes = await ops.readFile("test.txt");
        console.log(`Read: ${readRes}`);

        console.log("Testing edit...");
        const editRes = await ops.editFile("test.txt", "World", "Universe");
        console.log(editRes);

        const readRes2 = await ops.readFile("test.txt");
        console.log(`Read after edit: ${readRes2}`);

        console.log("Testing bash...");
        const bashRes = await ops.executeBash("ls -la");
        console.log(`Bash output:\n${bashRes}`);

        console.log("Testing path traversal prevention...");
        try {
            await ops.readFile("../package.json");
            console.log("FAIL: Path traversal prevention failed!");
        } catch (e: any) {
            console.log(`SUCCESS: Caught expected error: ${e.message}`);
        }

        // Clean up
        await fs.rm(path.join(workspaceDir, "test.txt"));
        
    } catch (e) {
        console.error("Test failed:", e);
    }
}

main();
