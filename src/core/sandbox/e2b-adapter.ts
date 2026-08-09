import { Sandbox } from '@e2b/code-interpreter'
import type { Operations } from "../operations.ts";


export class E2BAdapter implements Operations {
    private sandbox?: Sandbox;

    private async getSandbox(): Promise<Sandbox> {
        if (!this.sandbox) {
            this.sandbox = await Sandbox.create();
        }
        return this.sandbox;
    }

    public async close(): Promise<void> {
        if (this.sandbox) {
            await this.sandbox.kill();
            this.sandbox = undefined;
        }
    }

    public async readFile(path: string): Promise<string> {
        const sandbox = await this.getSandbox();
        const fileContent = await sandbox.files.read(path);
        return fileContent;
    }

    public async writeFile(path: string, content: string): Promise<string> {
        const sandbox = await this.getSandbox();
        await sandbox.files.write(path, content);
        return `[E2B Sandbox] Wrote to ${path}`;
    }

    public async editFile(path: string, find: string, replace: string): Promise<string> {
        const sandbox = await this.getSandbox();
        const content = await sandbox.files.read(path);
        const newContent = content.replace(find, replace);
        await sandbox.files.write(path, newContent);
        return `[E2B Sandbox] Edited ${path}`;
    }

    public async executeBash(command: string): Promise<string> {
        const sandbox = await this.getSandbox();
        const execution = await sandbox.commands.run(command);
        
        let output = "";
        if (execution.stdout) output += `stdout:\n${execution.stdout}\n`;
        if (execution.stderr) output += `stderr:\n${execution.stderr}\n`;
        return output || `[E2B Sandbox] Command executed successfully with no output.`;
    }
}
