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
            rest: cmdTs.restPositionals({
                description: `List of orgs, repos ("Orgname/reponame"), or "."`,
            }),
        },
        handler: async args => {
            await innerMainAsync(args.user ?? null, args.rest);
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
const githubOrgRe = /^([-A-Za-z0-9_.]+)$/;

async function innerMainAsync(user: string | null, rest: Array<string>): Promise<void> {
    const githubCredentialsPromise = await getGithubCredentialsAsync();

    const orgs = [];
    const repos = [];

    for (const arg of rest) {
        if (arg === '.') {
            const gitRepoPath = await git.findRoot({fs, filepath: process.cwd()});
            const gitdir = pathUtil.join(gitRepoPath, '.git');
            const repo = await determineGithubRepoAsync(gitdir);
            repos.push(repo);
        } else if (githubOrgRe.test(arg)) {
            orgs.push(arg);
        } else if (githubRepoRe.test(arg)) {
            repos.push(arg);
        } else {
            console.error(`Expecting a GitHub organization name, repo string ("orgname/reponame") or "."; got "${q(arg)}.`);
            return;
        }
    }

    const githubUsernameOrMe = (user === null) ? '@me' : user;
    const {oauthToken} = await githubCredentialsPromise;
    const prs = await fetcher.fetchPrsAsync(oauthToken, githubUsernameOrMe, repos, orgs);

    renderer.render(prs);
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
