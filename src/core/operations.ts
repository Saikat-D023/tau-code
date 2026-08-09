import * as fs from "fs/promises";
import * as path from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export interface Operations {
    readFile(targetPath: string): Promise<string>;
    writeFile(targetPath: string, content: string): Promise<string>;
    editFile(targetPath: string, find: string, replace: string): Promise<string>;
    executeBash(command: string): Promise<string>;
}

export class LocalOperations implements Operations {
    private workspaceDir: string;

    constructor(workspaceDir: string) {
        this.workspaceDir = path.resolve(workspaceDir);
    }

    private resolveAndValidatePath(targetPath: string): string {
        const resolvedPath = path.resolve(this.workspaceDir, targetPath);
        if (!resolvedPath.startsWith(this.workspaceDir)) {
            throw new Error(`Access denied: Path ${targetPath} is outside the workspace directory.`);
        }
        return resolvedPath;
    }

    public async readFile(targetPath: string): Promise<string> {
        const safePath = this.resolveAndValidatePath(targetPath);
        return await fs.readFile(safePath, "utf-8");
    }

    public async writeFile(targetPath: string, content: string): Promise<string> {
        const safePath = this.resolveAndValidatePath(targetPath);
        await fs.mkdir(path.dirname(safePath), { recursive: true });
        await fs.writeFile(safePath, content, "utf-8");
        return `[Local] Wrote to ${targetPath}`;
    }

    public async editFile(targetPath: string, find: string, replace: string): Promise<string> {
        const safePath = this.resolveAndValidatePath(targetPath);
        const content = await fs.readFile(safePath, "utf-8");
        const newContent = content.replace(find, replace);
        await fs.writeFile(safePath, newContent, "utf-8");
        return `[Local] Edited ${targetPath}`;
    }

    public async executeBash(command: string): Promise<string> {
        try {
            const { stdout, stderr } = await execAsync(command, { cwd: this.workspaceDir });
            let output = "";
            if (stdout) output += `stdout:\n${stdout}\n`;
            if (stderr) output += `stderr:\n${stderr}\n`;
            return output || `[Local] Command executed successfully with no output.`;
        } catch (error: any) {
            let output = `[Local Error] Command failed:\n`;
            if (error.stdout) output += `stdout:\n${error.stdout}\n`;
            if (error.stderr) output += `stderr:\n${error.stderr}\n`;
            return output || error.message;
        }
    }
}
