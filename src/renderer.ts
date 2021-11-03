import chalk from 'chalk';
import ansiEscapes from 'ansi-escapes';
import * as u from './u';

import {Pr, PrGroups, RequestedReviewer, ReviewDecision} from './fetcher';

export function render(prGroups: PrGroups): void {
    const writePrLines = (sectionName: string, prs: Array<Pr>, renderer: PrRenderer): void => {
        console.log();
        console.log(`${chalk.whiteBright(`${sectionName}: ${prs.length}`)}`);
        for (const pr of prs) {
            for (const line of renderPrLines(pr, renderer)) {
                console.log(line);
            }
        }
    };

    writePrLines('Authored', prGroups.authored, new AuthoredPrRenderer());
    writePrLines('To review', prGroups.toReview, new ToReviewPrRenderer());

    console.log();
}

const prTitleLengthLimit = 72;

interface PrRenderer {
    renderReviewStatus(pr: Pr): string;
}

class AuthoredPrRenderer implements PrRenderer {
    renderReviewStatus(pr: Pr): string {
        if (pr.reviewDecision === ReviewDecision.APPROVED) return chalk.red('A');
        if (pr.reviewRequests.length === 0) {
            if (pr.reviews.length === 0) return chalk.red('0'); // Zero reviewers selected.
            return chalk.red('U'); // Update needed.
        }

        return 'w'; // Waiting on review.
    }
}

class ToReviewPrRenderer implements PrRenderer {
    renderReviewStatus(_pr: Pr): string {
        return ' ';
    }
}

const checkSuiteSuccessStatuses = new Set(['SUCCESS', 'NEUTRAL', 'SKIPPED']);
function renderTestStatus(pr: Pr): string {
    if (pr.lastCommitCheckSuites === null) return chalk.red('?');
    if (pr.lastCommitCheckSuites.length === 0) return ' ';
    if (pr.lastCommitCheckSuites.every(v => v.conclusion !== null && checkSuiteSuccessStatuses.has(v.conclusion))) return '✓';
    if (pr.lastCommitCheckSuites.some(v => v.conclusion === null)) return '·'; // In progress.  Maybe show duration?
    return chalk.red('✗'); // Failed
}

const renderRequestedReviewer = (rr: RequestedReviewer): string => {
    switch (rr.typename) {
        case 'User': return rr.login;
        case 'Team': return `team:${rr.name}`;
        case 'Mannequin': return `mannequin:${rr.name}`;
        default: throw u.impossible(rr);
    }
}

const renderPrLines = (pr: Pr, renderer: PrRenderer): Array<string> => {
    let title = pr.title;
    if (title.length > prTitleLengthLimit) {
        title = title.substring(0, prTitleLengthLimit - 3) + '...';
    }
    const reviewStatus = renderer.renderReviewStatus(pr);
    const testStatus = renderTestStatus(pr);
    const repoName = pr.repository.nameWithOwner;
    const link = ansiEscapes.link(`${chalk.dim(repoName)}#${chalk.blue(`${pr.number}`)}`, pr.url);
    const branch = chalk.cyan(`${pr.headRefName}`);
    const reviewers = pr.reviewRequests.length > 0
        ? `, ${pr.reviewRequests.map(rr => renderRequestedReviewer(rr.requestedReviewer)).join(', ')}`
        : '';
    return [
        `${testStatus}${reviewStatus} ${chalk.yellow(title)}`,
        `   ${link}, ${chalk.cyan(branch)}${reviewers}`,
    ];
};
