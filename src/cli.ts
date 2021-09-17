export function runMain(mainAsync: (argv: Array<string>) => Promise<void>): void {
    require('source-map-support/register');
    mainAsync(process.argv).catch(err => {
        if (err instanceof Exit) {
            console.error(err.message);
            throw process.exit(err.code);
        } else {
            console.error(err);
            throw process.exit(1);
        }
    });
}

export class Exit {
    constructor(public readonly code: number, public readonly message: string) {}
}

export function q(s: string): string {
    return JSON.stringify(s);
}

