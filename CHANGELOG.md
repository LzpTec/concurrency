# Changelog

All notable changes to this project will be documented in this file. See [commit-and-tag-version](https://github.com/absolute-version/commit-and-tag-version) for commit guidelines.

## [3.0.0](https://github.com/LzpTec/concurrency/compare/v2.0.1...v3.0.0) (2024-01-24)


### Features

* Add `@lzptec/concurrency/batch` and `@lzptec/concurrency/concurrency` exports. ([f36e624](https://github.com/LzpTec/concurrency/commit/f36e624e1b7764e817b758740d3d1e556abd1d2f))


### Refactor

* Implement `forEach` and `mapSettled` on the base class. ([90edf61](https://github.com/LzpTec/concurrency/commit/90edf61ad9164d1f4fcb23481713708658ed7fae))
* Improve code readability. ([cc0320b](https://github.com/LzpTec/concurrency/commit/cc0320b9924a1673399c149fa98752762f0236bd))
* Internal changes to improve maintenance. ([7164dfc](https://github.com/LzpTec/concurrency/commit/7164dfc1bd8ae9cb278cc030c2153ba2ddc7bced))
* Isolate internal code. ([71fb1d5](https://github.com/LzpTec/concurrency/commit/71fb1d59ec878589d3841f20c57d14d5d1c5badb))


### Misc

* Update benchmark. ([9b1de7c](https://github.com/LzpTec/concurrency/commit/9b1de7c3c66625e33f93676cc50665f4722f90c8))
* Update deps. ([adf9e20](https://github.com/LzpTec/concurrency/commit/adf9e20093070657c186b03d2bd5d1cab7d9462b))


### Dependencies

* Update deps. ([30e6a6a](https://github.com/LzpTec/concurrency/commit/30e6a6ababfe584a04f32953670f919bd2592337))

## [2.0.1](https://github.com/LzpTec/concurrency/compare/v2.0.0...v2.0.1) (2023-05-23)


### Bug Fixes

* Input params in map and mapSettled. ([640544e](https://github.com/LzpTec/concurrency/commit/640544e1239d8aa9d00cc0bb43705bb4a8d837e5))

## [2.0.0](https://github.com/LzpTec/concurrency/compare/v1.2.0...v2.0.0) (2023-03-15)


### ⚠ BREAKING CHANGES

* Removed input argument from static methods.

### Features

* Add `find`, `every` and `some` methods to global methods. ([9381217](https://github.com/LzpTec/concurrency/commit/93812173888dfb29af093970304e76108ef0352a))
* Implemented `group` method to batch and concurrency instances. ([1b548a4](https://github.com/LzpTec/concurrency/commit/1b548a4cc8a009719708f52b90cdfaf0eb056e2f))
* Implemented `group` method to batch and concurrency. ([dc3205e](https://github.com/LzpTec/concurrency/commit/dc3205e4ba6788cb452e333494170e8009db4ef3))
* Removed input argument from static methods. ([a29ad6d](https://github.com/LzpTec/concurrency/commit/a29ad6d2491ce37ed13e803f895d03b866a0da8c))


### Bug Fixes

* Batch instance not waiting all jobs. ([ca00e6d](https://github.com/LzpTec/concurrency/commit/ca00e6db29a74e36ad86ef3d06e62efbfb562e71))


### Docs

* Add `find`, `every` and `some` global documentation. ([472d737](https://github.com/LzpTec/concurrency/commit/472d737df72a9f9d0781b88d24edd8b59c28fb5f))
* Update `map`, `mapSettled` and `forEach` docs. ([cc0f3e5](https://github.com/LzpTec/concurrency/commit/cc0f3e540b839c501e892d5e76b064355ab56acc))
* Update TODO. ([ff2ac0e](https://github.com/LzpTec/concurrency/commit/ff2ac0e45a6ae7952646415dfefc111b36895a80))
* Update USAGE.md to use new args. ([e5e89ad](https://github.com/LzpTec/concurrency/commit/e5e89ad10fb3f0a3ac551a48c3e8efa82542a420))


### Refactor

* Add `options` to base class. ([63b8a85](https://github.com/LzpTec/concurrency/commit/63b8a85b48c4a68d5ee975a41c618b288b9152f8))
* Add override modifier to abstract methods. ([50674f5](https://github.com/LzpTec/concurrency/commit/50674f506406fdba85a885209c1973885877d151))
* Change internal batch instance. ([ef7cb64](https://github.com/LzpTec/concurrency/commit/ef7cb6493ca8dba5ef2e0257d8c7496401285cd1))


### Misc

* Remove `console.log` calls. ([6ff4d0d](https://github.com/LzpTec/concurrency/commit/6ff4d0db25b8c977ccacdcf8d79f510d18a4774f))


### Dependencies

* Update deps. ([632bf48](https://github.com/LzpTec/concurrency/commit/632bf48509db09c3fc68019239c780cf9ad743a7))

## [1.2.0](https://github.com/LzpTec/concurrency/compare/v1.1.0...v1.2.0) (2023-02-16)


### Features

* Added `every` method. ([c3ba782](https://github.com/LzpTec/concurrency/commit/c3ba7824e6a08f566ba6678e412efbab9000124c))
* Added `find` method. ([bf909d4](https://github.com/LzpTec/concurrency/commit/bf909d4dd1b8b195a9a91a3703d466d5a7422c98))
* Added `some` method. ([53db8b8](https://github.com/LzpTec/concurrency/commit/53db8b809e4136bd8bcbf1dddb85dc785d53d7aa))


### Bug Fixes

* JSDOC small typo. ([eb28a9d](https://github.com/LzpTec/concurrency/commit/eb28a9dbad4e0b944d22592b35de850fad8ba418))


### Docs

* Update TODO. ([f98c44a](https://github.com/LzpTec/concurrency/commit/f98c44a0302bd84ee51fc3c46e400a63e4596438))


### Performance

* Create a shared base for batch and concurrency, ([dabb757](https://github.com/LzpTec/concurrency/commit/dabb757ceb6600b0ac42b4ae813329a29b10bcde))

## [1.1.0](https://github.com/LzpTec/concurrency/compare/v1.0.2...v1.1.0) (2023-02-16)


### Refactor

* Change internal structure. ([c1c0ab2](https://github.com/LzpTec/concurrency/commit/c1c0ab2de977b78bd99717eab55c9ca3b7026490))


### Misc

* Add changelog files to .npmignore. ([1ba4bc8](https://github.com/LzpTec/concurrency/commit/1ba4bc8ff69d8e4526e669c41522367be8b73a07))
* Add Dependencies section. ([b29e974](https://github.com/LzpTec/concurrency/commit/b29e9743ece8c37495608adae08b1fccea1654a3))


### Dependencies

* Update Deps. ([326d470](https://github.com/LzpTec/concurrency/commit/326d470c15795e5aa4de92d6d9992f98f8127924))

### [1.0.2](https://github.com/LzpTec/concurrency/compare/v1.0.1...v1.0.2) (2022-12-23)


### Bug Fixes

* Added filter predicate validation on Concurrency. ([58e1b94](https://github.com/LzpTec/concurrency/commit/58e1b94def9d50dcd22ee749a8f0a502258bb9f4))
* Option assign. ([cb848a1](https://github.com/LzpTec/concurrency/commit/cb848a10039179814953181222db2e615c10fb39))


### Performance

* Change internal Batch and Concurrency structure. ([47533e1](https://github.com/LzpTec/concurrency/commit/47533e19d7752d9550f290cb18e055211c67fffc))

### [1.0.1](https://github.com/LzpTec/concurrency/compare/v1.0.0...v1.0.1) (2022-12-18)


### Misc

* Added docs folder. ([0564d81](https://github.com/LzpTec/concurrency/commit/0564d8137e6556b23f8b68340bd82a8e0b4ac2a6))


### Docs

* Move usage to docs folder. ([3241a8b](https://github.com/LzpTec/concurrency/commit/3241a8b14b0285f568ba0f708474fb52d014eddf))

## [1.0.0](https://github.com/LzpTec/concurrency/compare/v0.1.0...v1.0.0) (2022-12-17)


### ⚠ BREAKING CHANGES

* removed batchSize and maxConcurrency params
* Added taskOptions to all static
* Added taskOptions to all static batch methods.
* Batch and Concurrency options.

### Features

* Added `options` property. ([398ac12](https://github.com/LzpTec/concurrency/commit/398ac123a0f4ba6b4c7004bdb1bef958a25dde19))
* Added taskOptions to all static ([4852840](https://github.com/LzpTec/concurrency/commit/4852840105a271c49ca45eae280d0dc1844db843))
* Added taskOptions to all static batch methods. ([c76cd44](https://github.com/LzpTec/concurrency/commit/c76cd44d2b175ed3d34ba504e76102ddf85d728c))
* Batch and Concurrency options. ([e3f75a1](https://github.com/LzpTec/concurrency/commit/e3f75a17b842b0fc269f7761373e1a3194a34170))
* Implemented interval to Batch and ([e5f7fad](https://github.com/LzpTec/concurrency/commit/e5f7fadb3c4626b788942b440350c393ed2f6884))
* Implemented static concurrency ([9204602](https://github.com/LzpTec/concurrency/commit/920460241a9bc148c89f4f2da18933eb59cd5cdd))
* removed batchSize and maxConcurrency params ([44e46e9](https://github.com/LzpTec/concurrency/commit/44e46e9adb2985688ef8f80c9846783e9d80f961))


### Bug Fixes

* check typeof taskOptions.task in Concurrency. ([e9df627](https://github.com/LzpTec/concurrency/commit/e9df627af23461ee79d27acdd88237d2151e160e))
* validate batchSize and maxConcurrency. ([867c7d0](https://github.com/LzpTec/concurrency/commit/867c7d0be6f738b38a45557b4a033d4dffbb7e6e))


### Misc

* Upgrade to commit-and-tag-version. ([f986475](https://github.com/LzpTec/concurrency/commit/f9864750d1beb9e045314ed5c57d057ca792a6e1))


### Docs

* Update docs. ([514c25d](https://github.com/LzpTec/concurrency/commit/514c25d9c2d46061fa3ef927f2d2a5e1ae840f30))
* Update package description ([148ada5](https://github.com/LzpTec/concurrency/commit/148ada5738329b125fed1fbebde88a38ac9b9ff2))
* Update TODO. ([7067911](https://github.com/LzpTec/concurrency/commit/706791178dc93b4bdac4a1a0ad6f1bcbfae8159e))
* Update TODO. ([6731f9e](https://github.com/LzpTec/concurrency/commit/6731f9eb00db8ea8444c1645af6e5b328df4b745))
* Update TODO.md ([3f19f85](https://github.com/LzpTec/concurrency/commit/3f19f85016fae16590f8345791625a20c1797cec))

## 0.1.0 (2022-12-15)


### Features

* standard-version to generate changelog. ([d17e764](https://github.com/LzpTec/concurrency/commit/d17e76430bf804ae6a545e52bf40cfe85607d179))
