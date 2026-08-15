import { Agent } from "../core/loop.ts";
import { CliGateway } from "../core/harness/cli.ts";
import { DashboardGateway } from "../core/harness/dashboard.ts";

async function main() {
    const agent = new Agent({ maxIterations: 10 });
    
    const dashboard = new DashboardGateway();
    await dashboard.start(agent);

    const cli = new CliGateway();
    await cli.start(agent);
}

main().catch(console.error);
