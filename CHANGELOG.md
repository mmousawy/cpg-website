# Changelog

## [1.9.0](https://github.com/mmousawy/cpg-website/compare/v1.8.3...v1.9.0) (2026-01-19)


### Features

* Enhance notification system with real-time toasts and UX improvements ([0a150a4](https://github.com/mmousawy/cpg-website/commit/0a150a41e2acb95bd5779da88645a4d5fc8843ed))
* Implement activity feed and in-app notifications system ([69d95a9](https://github.com/mmousawy/cpg-website/commit/69d95a92135c7b8d79de7601b0b33158776bbb9d))

## [1.8.3](https://github.com/mmousawy/cpg-website/compare/v1.8.2...v1.8.3) (2026-01-19)


### Bug Fixes

* Fix Supabase image transformations and optimize image sizing ([5fd7e4f](https://github.com/mmousawy/cpg-website/commit/5fd7e4f8b9bce7b16f7070a89d274418f1fb556f))

## [1.8.2](https://github.com/mmousawy/cpg-website/compare/v1.8.1...v1.8.2) (2026-01-18)


### Bug Fixes

* Update README for clarity on linting and CI processes ([ba53c5d](https://github.com/mmousawy/cpg-website/commit/ba53c5d3cc8c45dca0bebed4b69a4d98fd4172d1))

## [1.8.1](https://github.com/mmousawy/cpg-website/compare/v1.8.0...v1.8.1) (2026-01-18)


### Bug Fixes

* Update release-please workflow for improved configuration ([b84b68d](https://github.com/mmousawy/cpg-website/commit/b84b68dc0f74930e3c5e97205cbf8b6602b92b05))

## [1.8.0](https://github.com/mmousawy/cpg-website/compare/v1.7.0...v1.8.0) (2026-01-18)


### Features

* Performance optimization and CI/CD improvements ([beedd76](https://github.com/mmousawy/cpg-website/commit/beedd76814d60b4f82fe369309091a53dc005408))


### Bug Fixes

* Add svg.d.ts to TypeScript configuration for improved type support ([e8179eb](https://github.com/mmousawy/cpg-website/commit/e8179ebddf7eb1f66fb852de3fef14e6ceb0ba1f))
* Update linting command in package.json to use ESLint directly for TypeScript files ([8a7d550](https://github.com/mmousawy/cpg-website/commit/8a7d550f26f4d70d9bb2d96e05fc5a634c41f140))

## [1.7.0](https://github.com/mmousawy/cpg-website/compare/v1.6.1...v1.7.0) (2026-01-18)


### Features

* Add view tracking for photos and albums ([32e042a](https://github.com/mmousawy/cpg-website/commit/32e042a47c86ccb9d6fbc1b6cc6ebe420fa6d255))


### Bug Fixes

* Update types. ([eff66c1](https://github.com/mmousawy/cpg-website/commit/eff66c12c231685708439ae2ddf93ae9e5f0cc7a))


### Code Quality

* Eliminate all `any` types and fix eslint-disable comments - Remove all 147 instances of `any` types, fix 18 eslint-disable comments, add proper types for Supabase queries, React Hook Form props, error handling, and callback parameters. Result: 0 TypeScript errors, improved type safety throughout.

## [1.6.1](https://github.com/mmousawy/cpg-website/compare/v1.6.0...v1.6.1) (2026-01-18)


### Bug Fixes

* standardize JSX formatting and improve component structure ([fe094ae](https://github.com/mmousawy/cpg-website/commit/fe094ae3cecdc389bb015a80bb6b981045313f3c))
* update account stats structure and improve error handling ([40ce6bf](https://github.com/mmousawy/cpg-website/commit/40ce6bf694dd44d792a60079693b085bfe32b705))

## [1.6.0](https://github.com/mmousawy/cpg-website/compare/v1.5.1...v1.6.0) (2026-01-17)


### Features

* Add interests to onboarding, likes system, tags display, and code quality improvements ([f809be3](https://github.com/mmousawy/cpg-website/commit/f809be3f821acc12d2a5ebe22a6e0b68dcc6199c))


### Bug Fixes

* clean up package dependencies and remove husky integration ([11105a9](https://github.com/mmousawy/cpg-website/commit/11105a994b8e33826090f354b6b913c55568e12f))

## [1.5.1](https://github.com/mmousawy/cpg-website/compare/v1.5.0...v1.5.1) (2026-01-16)


### Bug Fixes

* always render member links ([b24903a](https://github.com/mmousawy/cpg-website/commit/b24903ab69982def685bf9b49715ecc9d2de13cc))

## [1.5.0](https://github.com/mmousawy/cpg-website/compare/v1.4.0...v1.5.0) (2026-01-16)


### Features

* add interests system, member discovery, event comments, and reminder cron ([1d8520d](https://github.com/mmousawy/cpg-website/commit/1d8520d8fc6de5f893ffedf799290204670164d1))


### Bug Fixes

* enhance event reminder queries and improve data handling ([5a55ba5](https://github.com/mmousawy/cpg-website/commit/5a55ba58cc789dd5953f7ec42698e7acf88d9380))

## [1.4.0](https://github.com/mmousawy/cpg-website/compare/v1.3.8...v1.4.0) (2026-01-16)


### Features

* Add photo badges with tooltips and fix album cover cache invalidation ([762cbb6](https://github.com/mmousawy/cpg-website/commit/762cbb6ec83b32f8f815c7a5342343daaf9153b0))

## [1.3.8](https://github.com/mmousawy/cpg-website/compare/v1.3.7...v1.3.8) (2026-01-15)


### Bug Fixes

* enhance album and photo revalidation process ([692b9df](https://github.com/mmousawy/cpg-website/commit/692b9df46790141b310891d3043aeba703365dda))

## [1.3.7](https://github.com/mmousawy/cpg-website/compare/v1.3.6...v1.3.7) (2026-01-15)


### Bug Fixes

* improve caching for dynamic pages ([2ad9b3f](https://github.com/mmousawy/cpg-website/commit/2ad9b3f8c803ad765cadd9817e8b0a07d959c0e0))
* reorder import statements for consistency ([b7db0d5](https://github.com/mmousawy/cpg-website/commit/b7db0d58665819f32098a3c5b5f2f99f254bd43a))

## [1.3.6](https://github.com/mmousawy/cpg-website/compare/v1.3.5...v1.3.6) (2026-01-14)


### Bug Fixes

* refine caching strategy and improve error handling in dynamic routes ([4f56f78](https://github.com/mmousawy/cpg-website/commit/4f56f7893a0233c71a9b52349a28db14677c3f83))

## [1.3.5](https://github.com/mmousawy/cpg-website/compare/v1.3.4...v1.3.5) (2026-01-14)


### Bug Fixes

* adjust height calculations in loading components ([74716db](https://github.com/mmousawy/cpg-website/commit/74716dba888ac2103666a2d50f3e4eed01e6b0be))
* update loading components and caching guidelines ([8078967](https://github.com/mmousawy/cpg-website/commit/8078967f281d79a6ba5ce165e5f9eac6a2bce99f))

## [1.3.4](https://github.com/mmousawy/cpg-website/compare/v1.3.3...v1.3.4) (2026-01-14)


### Bug Fixes

* enhance caching and static params for dynamic routes ([3f0810b](https://github.com/mmousawy/cpg-website/commit/3f0810b7214172ff4d4edee56e1e751d6d281c18))

## [1.3.3](https://github.com/mmousawy/cpg-website/compare/v1.3.2...v1.3.3) (2026-01-14)


### Bug Fixes

* remove unused cache directives and static params from profile, album, and event pages ([9b6d95f](https://github.com/mmousawy/cpg-website/commit/9b6d95fc2d1b33626f39a6af741b2674c14f97e3))

## [1.3.2](https://github.com/mmousawy/cpg-website/compare/v1.3.1...v1.3.2) (2026-01-14)


### Bug Fixes

* implement page-level caching for dynamic routes ([92eac92](https://github.com/mmousawy/cpg-website/commit/92eac9232cb2dcc0a77c7c41cb8a8506fff7c5a1))

## [1.3.1](https://github.com/mmousawy/cpg-website/compare/v1.3.0...v1.3.1) (2026-01-14)


### Bug Fixes

* enhance caching and data fetching for events, albums, and profiles ([78f3163](https://github.com/mmousawy/cpg-website/commit/78f31639707f7449f5ab603b6bb89fbc614cf32b))
* improve error handling in stats API route ([cee2305](https://github.com/mmousawy/cpg-website/commit/cee2305717944e5c3edc799d796d6f7d8de694de))

## [1.3.0](https://github.com/mmousawy/cpg-website/compare/v1.2.0...v1.3.0) (2026-01-14)


### Features

* Use cache tags & Suspense fixes for random assets and dynamic routes ([a7f7ddf](https://github.com/mmousawy/cpg-website/commit/a7f7ddf93d374979527837e58a751df366f2686a))


### Bug Fixes

* enhance revalidation and loading patterns in client components ([cd9197c](https://github.com/mmousawy/cpg-website/commit/cd9197c5d75996b24bb2019daab96aaf345eb7af))

## [1.2.0](https://github.com/mmousawy/cpg-website/compare/v1.1.0...v1.2.0) (2026-01-14)


### Features

* implement email change modal in account page ([a170283](https://github.com/mmousawy/cpg-website/commit/a1702833529bccf4d524f1771a03835fc0a96ca5))


### Bug Fixes

* enhance account and onboarding pages with improved URL display and avatar upload functionality ([ccefd12](https://github.com/mmousawy/cpg-website/commit/ccefd12c4aa00b7266a9182838500cb1a6039c51))

## [1.1.0](https://github.com/mmousawy/cpg-website/compare/v1.0.0...v1.1.0) (2026-01-13)


### Features

* enhance email change functionality and account page experience ([e05ba81](https://github.com/mmousawy/cpg-website/commit/e05ba81c326ed9cf02c1031e93041fbce0e3a87c))

## 1.0.0 (2026-01-13)


### Features

* Enhance account management features and email verification process. ([f6efe67](https://github.com/mmousawy/cpg-website/commit/f6efe67952118ad6525aa827872b523869214fa9))
