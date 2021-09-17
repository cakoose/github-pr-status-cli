# GitHub PR Status CLI

TODO: Screenshot of CLI output

Note: The PR number is meant to be a clickable link to the PR web page.  [Which terminal emulators support links?](https://gist.github.com/egmontkob/eb114294efbcd5adb1944c9f3cb5feda#terminal-emulators)

## Setup

First, install the [GitHub CLI tool](https://cli.github.com/manual/) and run `gh auth login` to create and save API credentials.  We use those credentials ("~/.config/gh/hosts.yml") to access the GitHub API.

Clone repo and build:

```
install_folder="$HOME/whatever/github-pr-status-cli"

mkdir "$install_folder"
cd "$install_folder"
git clone git@github.com:cakoose/github-pr-status-cli .
yarn install
```

Make sure it runs:

```
./run --help
```

Create a symlink to the 'run' script from somewhere in your `$PATH`:

```
ln -s "$install_folder/run" ~/bin/prstatus
hash -r
```


## PR Workflow

For this to be useful, you need to follow certain processes when working with GitHub PRs.
1. As a reviewer, when you want to put the PR back on the author's plate, make sure to "Submit review".
   - For the purposes of putting it back on the author's plate, it doens't actually matter whether you select "Comment" or "Request changes".

## Developing

- Run `yarn watch` to run the TypeScript compiler in watch mode.
- Run `./run` to run the tool.
