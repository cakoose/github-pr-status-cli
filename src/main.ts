import 'source-map-support/register';

import * as jsYaml from 'js-yaml';
import * as fs from 'fs';
import * as os from 'os';
import * as pathUtil from 'path';
import * as st from 'simple-runtypes';
import git from 'isomorphic-git';
import assert from 'assert';
import * as cmdTs from 'cmd-ts';

import * as renderer from './renderer';
import * as fetcher from './fetcher';
import {runMain, Exit, q} from './cli';

async function mainAsync(argv: Array<string>): Promise<void> {
    const cmd = cmdTs.command({
        name: argv[1],
        args: {
            user: cmdTs.option({
                long: 'user',
                type: cmdTs.optional(cmdTsTypeRe('GitHub username', githubUsernameRe)),
                description: `The GitHub username whose PRs you want to see.  Default: "@me".`,
            }),
            repo: cmdTs.option({
                long: 'repo',
                type: cmdTs.optional(cmdTsTypeRe('GitHub repo', githubRepoRe)),
                description: `The GitHub repo whose PRs you want to see.  Default: Current Git repo's "origin" remote.`,
            }),
        },
        handler: async args => {
            await innerMainAsync(args.user ?? null, args.repo ?? null);
        },
    });
    await cmdTs.run(cmd, argv.slice(2));
}

function cmdTsTypeRe(name: string, re: RegExp): cmdTs.Type<string, string> {
    return {
        from: async s => {
            if (!re.test(s)) throw new Error(`Not a well-formed ${name}.`);
            return s;
        },
    };
}

const githubUsernameRe = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;
const githubRepoRe = /^([-A-Za-z0-9_.]+\/[-A-Za-z0-9_.]+)$/;

async function innerMainAsync(argUser: string | null, argRepo: string | null): Promise<void> {
    const githubCredentialsPromise = await getGithubCredentialsAsync();

    let githubRepo;
    if (argRepo === null) {
        const gitRepoPath = await git.findRoot({fs, filepath: process.cwd()});
        const gitdir = pathUtil.join(gitRepoPath, '.git');
        githubRepo = await determineGithubRepoAsync(gitdir);
    } else {
        githubRepo = argRepo;
    }

    const githubUsernameOrMe = (argUser === null) ? '@me' : argUser;
    const {oauthToken} = await githubCredentialsPromise;
    const prs = await fetcher.fetchPrsAsync(oauthToken, githubRepo, githubUsernameOrMe);

    renderer.render(githubRepo, prs);
}

// TODO: Other URL formats.
const gitHubRemoteUrlRe = /^git@github\.com:([-A-Za-z0-9_.]+\/[-A-Za-z0-9_.]+?)(?:\.git)?$/;

async function determineGithubRepoAsync(gitdir: string): Promise<string> {
    const remotes = await git.listRemotes({fs, gitdir});
    let gitHubRepo: string | null = null;
    for (const remote of remotes) {
        if (remote.remote === 'origin') {
            if (gitHubRepo !== null) throw new Error(`Multiple remotes named "origin"? ${JSON.stringify(remote)}`);
            const m = gitHubRemoteUrlRe.exec(remote.url);
            if (m === null) throw new Exit(1, `Couldn't parse current repo's "origin" remote URL: ${q(remote.url)}.`);
            assert(typeof(m[1]) === 'string');
            gitHubRepo = m[1];
        }
    }
    if (gitHubRepo === null) throw new Exit(1, `Couldn't find a remote named "origin" in the current repo.`);
    return gitHubRepo;
}


type Credentials = {
    user: string;
    oauthToken: string;
};

const ghHostsFileEntry = st.sloppyRecord({
    user: st.string({minLength: 3}),
    oauth_token: st.string({minLength: 3}),
});
const ghHostsFileSchema = st.dictionary(st.string({minLength: 3}), ghHostsFileEntry);

async function getGithubCredentialsAsync(): Promise<Credentials> {
    const path = pathUtil.join(os.homedir(), '.config/gh/hosts.yml');
    const contents = await fs.promises.readFile(path, {encoding: 'utf8'});

    let raw;
    try {
        raw = jsYaml.load(contents, {});
    } catch (err) {
        throw new Exit(1, `${q(path)}: Invalid YAML.`);
    }

    const parseResult = st.use(ghHostsFileSchema, raw);
    if (!parseResult.ok) throw new Exit(1, `${q(path)}: ${parseResult.error}`);

    const obj = parseResult.result;
    const host = 'github.com';
    const entry = getProperty(obj, host);
    if (entry === undefined) throw new Exit(1, `${q(path)}: Missing entry for ${q(host)}.`);

    return {
        user: entry.user,
        oauthToken: entry.oauth_token,
    };
}

function getProperty<K extends string, V>(r: Record<K, V>, k: K): V | undefined {
    if (!Object.prototype.hasOwnProperty.call(r, k)) return undefined;
    return r[k];
}

if (require.main === module) {
    runMain(mainAsync);
}
