import { Agent } from "../core/loop.ts";
import { CliGateway } from "../gateway/cli/index.ts";
import { DashboardGateway } from "../gateway/dashboard/index.ts";
import { ensureTauDir } from "../core/tau-dir.ts";
import { runAuthFlow, isAuthenticated } from "./auth.ts";

async function main() {
    // Ensure all local data directories exist
    ensureTauDir();

    // `taucode auth` explicitly re-runs the provider picker/login
    if (process.argv[2] === "auth") {
        await runAuthFlow();
        return;
    }

    // First run: no provider logged in yet, so onboarding is the picker itself
    if (!isAuthenticated()) {
        console.log("Welcome to taucode! Let's get you logged in.");
        await runAuthFlow();
    }

    const agent = new Agent({ maxIterations: 10 });

    const dashboard = new DashboardGateway();
    await dashboard.start(agent);

    const cli = new CliGateway();
    await cli.start(agent);

    // The CLI loop exiting (via `exit`/`quit`/stdin closing) means the user is done —
    // shut the dashboard's HTTP server down too instead of leaving the process hanging.
    await dashboard.stop();
    process.exit(0);
}

main().catch(console.error);
