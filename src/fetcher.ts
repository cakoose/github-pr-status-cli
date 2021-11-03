import * as st from 'simple-runtypes';
import axios from 'axios';
import {q, Exit} from './cli';

export async function fetchPrsAsync(
    oauthToken: string,
    usernameOrMe: string,
    repos: Array<string>,
    orgs: Array<string>,
): Promise<{authored: Array<Pr>; toReview: Array<Pr>}> {
    let response;
    try {
        response = await axios.post(`https://api.github.com/graphql`, {query: makePrQuery(usernameOrMe, repos, orgs)}, {
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${oauthToken}`,
                'Content-Type': 'application/graphql',
            },
            timeout: 3000,
            responseType: 'text',
            transformResponse: [],
        });
    } catch (err) {
        if (err instanceof Error) {
            throw new Exit(1, `Error making GitHub API request: ${err.message}.`);
        } else {
            throw err;
        }
    }
    const body = response.data;
    if (response.status !== 200) throw new Exit(1, `HTTP ${response.status}: ${q(body.substring(0, 100))}`);

    const parsed = JSON.parse(body);
    const checkResult = st.use(responseSchema, parsed);
    if (!checkResult.ok) throw new Exit(1, `Error parsing response from GitHub: ${stFailToString(checkResult.error)}.`);

    return checkResult.result.data;
}

const makePrQuery = (usernameOrMe: string, repos: Array<string>, orgs: Array<string>) => {
    const filterParts = [];
    filterParts.push(...repos.map(r => `repo:${r}`));
    filterParts.push(...orgs.map(o => `org:${o}`));
    const filter = filterParts.join(' ');

    // To experiment, copy/paste this in to https://docs.github.com/en/graphql/overview/explorer
    return `
fragment pr on PullRequest {
    repository {nameWithOwner}
    number, title, url, headRefName, reviewDecision,
    author {login},
    reviews(last: 100) {edges {node {
        author {login},
        state,
    }}}
    reviewRequests(last: 100) {edges {node {
        requestedReviewer {
            typename: __typename
            ... on User {login},
            ... on Team {name},
            ... on Mannequin {login},
        }
    }}}
    lastCommitCheckSuites: commits(last: 1) {edges {node {
        commit {
            checkSuites(first:10, filterBy: {appId: 15368}) {edges {node {
                conclusion,
            }}}
        }
    }}}
}
{
    authored: search(query: "${filter} state:open is:pr author:${usernameOrMe}", type: ISSUE, first: 100) {
        edges {node {...pr}}
    }
    toReview: search(query: "${filter} state:open is:pr review-requested:${usernameOrMe}", type: ISSUE, first: 100) {
        edges {node {...pr}}
    }
}
`;
};

export enum ReviewDecision {
    CHANGES_REQUESTED = 'CHANGES_REQUESTED',
    REVIEW_REQUIRED = 'REVIEW_REQUIRED',
    APPROVED = 'APPROVED',
}

export enum ReviewState {
    COMMENTED = 'COMMENTED',
    CHANGES_REQUESTED = 'CHANGES_REQUESTED',
    APPROVED = 'APPROVED',
    PENDING = 'PENDING',
}

const reviewsSchema = st.record({
    author: st.record({login: st.string()}),
    state: st.enum(ReviewState),
});
//type Reviews = ReturnType<typeof reviewsSchema>;

export type RequestedReviewer = ReturnType<typeof requestedReviewerSchema>;
const requestedReviewerSchema = st.union(
    st.record({
        typename: st.literal('User'),
        login: st.string(),
    }),
    st.record({
        typename: st.literal('Team'),
        name: st.string(),
    }),
    st.record({
        typename: st.literal('Mannequin'),
        name: st.string(),
    }),
);

function stChain<A, B>(first: st.Runtype<A>, fn: (v: A) => (B | st.Fail)): st.Runtype<B> {
    return st.runtype(v => {
        const firstCheck = st.use(first, v);
        if (!firstCheck.ok) return firstCheck.error;
        return fn(firstCheck.result);
    });
}

//type RequestedReviewer = ReturnType<typeof requestedReviewerSchema>;

const prSchema = st.record({
    repository: st.record({nameWithOwner: st.string()}),
    number: st.integer({min: 1}),
    title: st.string(),
    url: st.string(),
    headRefName: st.string(),
    reviewDecision: st.nullOr(st.enum(ReviewDecision)),
    author: st.record({login: st.string()}),
    reviews: stEdgesToNodes(reviewsSchema),
    reviewRequests: stEdgesToNodes(st.record({
        requestedReviewer: requestedReviewerSchema,
    })),
    lastCommitCheckSuites: stMaybeEdgeToNode(stChain(st.record({
        commit: stChain(st.record({
            checkSuites: stEdgesToNodes(st.record({
                conclusion: st.nullOr(st.string()),
            })),
        }), v => v.checkSuites),
    }), v => v.commit)),
});
export type Pr = ReturnType<typeof prSchema>;

function stEdgesToNodes<T>(inner: st.Runtype<T>): st.Runtype<Array<T>> {
    return stChain(st.record({edges: st.array(st.record({node: inner}))}), v => {
        return v.edges.map(e => e.node);
    });
}

function stMaybeEdgeToNode<T>(inner: st.Runtype<T>): st.Runtype<T | null> {
    const sub = st.record({edges: st.array(st.record({node: inner}), {minLength: 0, maxLength: 1})});
    return stChain(sub, ({edges}) => {
        if (edges.length === 0) return null;
        if (edges.length === 1) return edges[0].node;
        throw new Error(`edges.length greater than 1: ${edges.length}`);
    });
}

const searchResultSchema = stEdgesToNodes(prSchema);

const responseDataSchema = st.record({
    authored: searchResultSchema,
    toReview: searchResultSchema,
});
export type PrGroups = ReturnType<typeof responseDataSchema>;

const responseSchema = st.record({
    data: responseDataSchema,
});

function stFailToString(f: st.Fail): string {
    const reversePath = f.path.slice().reverse();
    const parts = reversePath.map(pc => {
        switch (typeof pc) {
            case 'string': return q(pc);
            case 'number': return `[${pc}]`;
        }
    });
    let valueAtPath = f.value;
    for (const pc of reversePath) {
        valueAtPath = valueAtPath[pc];
    }
    parts.push(f.reason);
    parts.push(JSON.stringify(valueAtPath));
    return parts.join(': ');
}
