import chalk from 'chalk';
import ansiEscapes from 'ansi-escapes';

import {Pr, PrGroups, ReviewDecision} from './fetcher';

export function render(githubRepo: string, prGroups: PrGroups): void {
    const writePrLines = (sectionName: string, prs: Array<Pr>, renderer: PrRenderer): void => {
        console.log();
        console.log(`${chalk.whiteBright(`${sectionName}: ${prs.length}`)}`);
        for (const pr of prs) {
            console.log(renderPrLine(pr, renderer));
        }
    };

    console.log(`${chalk.whiteBright('Repo:')} ${githubRepo}`);
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

const renderPrLine = (pr: Pr, renderer: PrRenderer): string => {
    let title = pr.title;
    if (title.length > prTitleLengthLimit) {
        title = title.substring(0, prTitleLengthLimit - 3) + '...';
    }
    const reviewStatus = renderer.renderReviewStatus(pr);
    const testStatus = renderTestStatus(pr);
    const numberLink = ansiEscapes.link(chalk.blue(`${pr.number}`), pr.url);
    const branch = chalk.cyan(`[${pr.headRefName}]`);
    return `${testStatus}${reviewStatus} ${numberLink} ${title} ${branch}`;
};
