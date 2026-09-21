# Changelog

All notable changes to `debugbundle/action` are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

## [2.0.0] - 2026-09-21

### Security

- Require server-marked privacy-projected bundle and reproduction responses before writing workspace artifacts. Reject unmarked legacy servers, cap responses to 512 KiB, validate incident IDs, and keep raw error bodies out of workflow logs. Deploy the compatible API before moving workflows from `debugbundle/action@v1` to `@v2`; v1 remains its own major ref.

## [1.1.0] - 2026-09-12

- Adopt Apache 2.0 for the GitHub Action. Preserve the existing v1 action interface and restrict release creation to full version tags.

## [0.1.0]

### Added

- Initial reference action for fetching DebugBundle incident bundles and reproduction artifacts from `repository_dispatch` workflows.
