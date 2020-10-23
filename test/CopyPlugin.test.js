import path from 'path';

import webpack from 'webpack';
import del from 'del';
import { createFsFromVolume, Volume } from 'memfs';

import CopyPlugin from '../src';

import { run, runEmit, runChange } from './helpers/run';

import { readAssets, getCompiler, compile } from './helpers';

const FIXTURES_DIR = path.join(__dirname, 'fixtures');

describe('CopyPlugin', () => {
  describe('basic', () => {
    it('should copy a file', (done) => {
      runEmit({
        expectedAssetKeys: ['file.txt'],
        patterns: [
          {
            from: 'file.txt',
          },
        ],
      })
        .then(done)
        .catch(done);
    });

    it('should copy files', (done) => {
      runEmit({
        expectedAssetKeys: [
          '.dottedfile',
          'directoryfile.txt',
          'nested/deep-nested/deepnested.txt',
          'nested/nestedfile.txt',
        ],
        patterns: [
          {
            from: 'directory',
          },
        ],
      })
        .then(done)
        .catch(done);
    });

    it('should copy files to new directory', (done) => {
      runEmit({
        expectedAssetKeys: [
          'newdirectory/.dottedfile',
          'newdirectory/directoryfile.txt',
          'newdirectory/nested/deep-nested/deepnested.txt',
          'newdirectory/nested/nestedfile.txt',
        ],
        patterns: [
          {
            from: 'directory',
            to: 'newdirectory',
          },
        ],
      })
        .then(done)
        .catch(done);
    });

    it('should copy files to new directory with context', (done) => {
      runEmit({
        expectedAssetKeys: [
          'newdirectory/deep-nested/deepnested.txt',
          'newdirectory/nestedfile.txt',
        ],
        patterns: [
          {
            from: 'nested',
            context: 'directory',
            to: 'newdirectory',
          },
        ],
      })
        .then(done)
        .catch(done);
    });

    it('should copy files using glob', (done) => {
      runEmit({
        expectedAssetKeys: [
          'directory/directoryfile.txt',
          'directory/nested/deep-nested/deepnested.txt',
          'directory/nested/nestedfile.txt',
        ],
        patterns: [
          {
            from: 'directory/**/*',
          },
        ],
      })
        .then(done)
        .catch(done);
    });

    it('should copy files using glob to new directory', (done) => {
      runEmit({
        expectedAssetKeys: [
          'newdirectory/directory/directoryfile.txt',
          'newdirectory/directory/nested/deep-nested/deepnested.txt',
          'newdirectory/directory/nested/nestedfile.txt',
        ],
        patterns: [
          {
            from: 'directory/**/*',
            to: 'newdirectory',
          },
        ],
      })
        .then(done)
        .catch(done);
    });

    it('should copy files using glob to new directory with context', (done) => {
      runEmit({
        expectedAssetKeys: [
          'newdirectory/nested/deep-nested/deepnested.txt',
          'newdirectory/nested/nestedfile.txt',
        ],
        patterns: [
          {
            from: 'nested/**/*',
            context: 'directory',
            to: 'newdirectory',
          },
        ],
      })
        .then(done)
        .catch(done);
    });

    it('should copy a file to a new file', (done) => {
      runEmit({
        expectedAssetKeys: ['newfile.txt'],
        patterns: [
          {
            from: 'file.txt',
            to: 'newfile.txt',
          },
        ],
      })
        .then(done)
        .catch(done);
    });

    it('should copy a file to a new file with context', (done) => {
      runEmit({
        expectedAssetKeys: ['newfile.txt'],
        patterns: [
          {
            from: 'directoryfile.txt',
            context: 'directory',
            to: 'newfile.txt',
          },
        ],
      })
        .then(done)
        .catch(done);
    });

    it('should multiple files to a new file', (done) => {
      runEmit({
        expectedAssetKeys: ['newfile.txt', 'newbinextension.bin'],
        patterns: [
          {
            from: 'file.txt',
            to: 'newfile.txt',
          },
          {
            from: 'binextension.bin',
            to: 'newbinextension.bin',
          },
        ],
      })
        .then(done)
        .catch(done);
    });

    it('should copy multiple files with same "from"', (done) => {
      runEmit({
        expectedAssetKeys: ['first/file.txt', 'second/file.txt'],
        patterns: [
          {
            from: 'file.txt',
            to: 'first/file.txt',
          },
          {
            from: 'file.txt',
            to: 'second/file.txt',
          },
        ],
      })
        .then(done)
        .catch(done);
    });

    it('should works with multiple patterns as String', (done) => {
      runEmit({
        expectedAssetKeys: ['binextension.bin', 'file.txt', 'noextension'],
        patterns: ['binextension.bin', 'file.txt', 'noextension'],
      })
        .then(done)
        .catch(done);
    });

    it('should works with multiple patterns as Object', (done) => {
      runEmit({
        expectedAssetKeys: ['binextension.bin', 'file.txt', 'noextension'],
        patterns: [
          {
            from: 'binextension.bin',
          },
          {
            from: 'file.txt',
          },
          {
            from: 'noextension',
          },
        ],
      })
        .then(done)
        .catch(done);
    });

    it('should work with linux path segment separation path when "from" is glob', (done) => {
      runEmit({
        expectedAssetKeys: ['directory/nested/nestedfile.txt'],
        patterns: [
          {
            from: 'directory/nested/*',
          },
        ],
      })
        .then(done)
        .catch(done);
    });

    it('should exclude path with linux path segment separators', (done) => {
      runEmit({
        expectedAssetKeys: [
          '[(){}[]!+@escaped-test^$]/hello.txt',
          '[special$directory]/(special-*file).txt',
          '[special$directory]/directoryfile.txt',
          '[special$directory]/nested/nestedfile.txt',
          'dir (86)/file.txt',
          'dir (86)/nesteddir/deepnesteddir/deepnesteddir.txt',
          'dir (86)/nesteddir/nestedfile.txt',
        ],
        patterns: [
          {
            from: '!(directory)/**/*.txt',
          },
        ],
      })
        .then(done)
        .catch(done);
    });

    it('should copy files with "copied" flags', (done) => {
      expect.assertions(5);

      const expectedAssetKeys = [
        '.dottedfile',
        'directoryfile.txt',
        'nested/deep-nested/deepnested.txt',
        'nested/nestedfile.txt',
      ];

      run({
        preCopy: {
          additionalAssets: [
            { name: 'foo-bar.txt', data: 'Content', info: { custom: true } },
            {
              name: 'nested/nestedfile.txt',
              data: 'Content',
              info: { custom: true },
            },
          ],
        },
        expectedAssetKeys,
        patterns: [
          {
            from: 'directory',
            force: true,
          },
        ],
      })
        .then(({ stats }) => {
          for (const name of expectedAssetKeys) {
            const info = stats.compilation.assetsInfo.get(name);

            expect(info.copied).toBe(true);

            if (name === 'nested/nestedfile.txt') {
              expect(info.custom).toBe(true);
            }
          }
        })
        .then(done)
        .catch(done);
    });

    it('should copy files with "copied" flags', (done) => {
      expect.assertions(5);

      const expectedAssetKeys = [
        'directoryfile.5d7817ed5bc246756d73d6a4c8e94c33.txt',
        '.dottedfile.5e294e270db6734a42f014f0dd18d9ac',
        'nested/nestedfile.31d6cfe0d16ae931b73c59d7e0c089c0.txt',
        'nested/deep-nested/deepnested.31d6cfe0d16ae931b73c59d7e0c089c0.txt',
      ];

      run({
        preCopy: {
          additionalAssets: [
            {
              name: 'directoryfile.5d7817ed5bc246756d73d6a4c8e94c33.txt',
              data: 'Content',
              info: { custom: true },
            },
          ],
        },
        expectedAssetKeys,
        patterns: [
          {
            from: 'directory',
            to: '[path][name].[contenthash].[ext]',
            force: true,
          },
        ],
      })
        .then(({ stats }) => {
          for (const name of expectedAssetKeys) {
            const info = stats.compilation.assetsInfo.get(name);

            expect(info.immutable).toBe(true);

            if (name === 'directoryfile.5d7817ed5bc246756d73d6a4c8e94c33.txt') {
              expect(info.immutable).toBe(true);
            }
          }
        })
        .then(done)
        .catch(done);
    });

    it('should copy files and print "copied" in the string representation ', (done) => {
      const isWebpack4 = webpack.version[0] === '4';

      expect.assertions(isWebpack4 ? 0 : 1);

      const expectedAssetKeys = [
        '.dottedfile',
        'directoryfile.txt',
        'nested/deep-nested/deepnested.txt',
        'nested/nestedfile.txt',
      ];

      run({
        withExistingAsset: true,
        expectedAssetKeys,
        patterns: [
          {
            from: 'directory',
          },
        ],
      })
        .then(({ stats }) => {
          const stringStats = stats.toString();

          if (!isWebpack4) {
            expect(stringStats.match(/\[copied]/g).length).toBe(4);
          }
        })
        .then(done)
        .catch(done);
    });

    it('should work with multi compiler mode', async () => {
      const compiler = webpack([
        {
          mode: 'development',
          context: path.resolve(__dirname, './fixtures'),
          entry: path.resolve(__dirname, './helpers/enter.js'),
          output: {
            path: path.resolve(__dirname, './outputs/multi-compiler/dist/a'),
          },
          stats: {
            source: true,
          },
          plugins: [
            new CopyPlugin({
              patterns: [
                {
                  from: path.resolve(__dirname, './fixtures/directory'),
                },
              ],
            }),
          ],
        },
        {
          mode: 'development',
          entry: path.resolve(__dirname, './helpers/enter.js'),
          output: {
            path: path.resolve(__dirname, './outputs/multi-compiler/dist/b'),
          },
          stats: {
            source: true,
          },
          plugins: [
            new CopyPlugin({
              patterns: [
                {
                  context: path.resolve(__dirname, './fixtures'),
                  from: path.resolve(__dirname, './fixtures/directory'),
                },
              ],
            }),
          ],
        },
      ]);

      compiler.compilers.forEach((item) => {
        const outputFileSystem = createFsFromVolume(new Volume());
        // Todo remove when we drop webpack@4 support
        outputFileSystem.join = path.join.bind(path);

        // eslint-disable-next-line no-param-reassign
        item.outputFileSystem = outputFileSystem;
      });

      const { stats } = await compile(compiler);

      stats.stats.forEach((item, index) => {
        expect(item.compilation.errors).toMatchSnapshot('errors');
        expect(item.compilation.warnings).toMatchSnapshot('warnings');
        expect(readAssets(compiler.compilers[index], item)).toMatchSnapshot(
          'assets'
        );
      });
    });
  });

  describe('watch mode', () => {
    it('should add the file to the watch list when "from" is a file', (done) => {
      const expectedAssetKeys = ['file.txt'];

      run({
        patterns: [
          {
            from: 'file.txt',
          },
        ],
      })
        .then(({ compiler, stats }) => {
          expect(
            Array.from(Object.keys(readAssets(compiler, stats))).sort()
          ).toEqual(expectedAssetKeys);
        })
        .then(done)
        .catch(done);
    });

    it('should add a directory to the watch list when "from" is a directory', (done) => {
      run({
        patterns: [
          {
            from: 'directory',
          },
        ],
      })
        .then(({ stats }) => {
          const { contextDependencies } = stats.compilation;
          const isIncludeDependency = contextDependencies.has(
            path.join(FIXTURES_DIR, 'directory')
          );

          expect(isIncludeDependency).toBe(true);
        })
        .then(done)
        .catch(done);
    });

    it('should add a directory to the watch list when "from" is a glob', (done) => {
      run({
        patterns: [
          {
            from: 'directory/**/*',
          },
        ],
      })
        .then(({ stats }) => {
          const { contextDependencies } = stats.compilation;
          const isIncludeDependency = contextDependencies.has(
            path.join(FIXTURES_DIR, 'directory')
          );

          expect(isIncludeDependency).toBe(true);
        })
        .then(done)
        .catch(done);
    });

    it('should not add the directory to the watch list when glob is a file', (done) => {
      const expectedAssetKeys = ['directoryfile.txt'];

      run({
        patterns: [
          {
            from: 'directory/directoryfile.txt',
          },
        ],
      })
        .then(({ compiler, stats }) => {
          expect(Array.from(Object.keys(readAssets(compiler, stats)))).toEqual(
            expectedAssetKeys
          );
        })
        .then(done)
        .catch(done);
    });

    it('should include files that have changed when `from` is a file', (done) => {
      runChange({
        expectedAssetKeys: ['tempfile1.txt', 'tempfile2.txt'],
        newFileLoc1: path.join(FIXTURES_DIR, 'watch', '_t5', 'tempfile1.txt'),
        newFileLoc2: path.join(FIXTURES_DIR, 'watch', '_t5', 'tempfile2.txt'),
        patterns: [
          {
            from: 'tempfile1.txt',
            context: 'watch/_t5',
          },
          {
            from: 'tempfile2.txt',
            context: 'watch/_t5',
          },
        ],
      })
        .then(done)
        .catch(done);
    });

    it('should include all files when `from` is a directory', (done) => {
      runChange({
        expectedAssetKeys: ['.gitkeep', 'tempfile1.txt', 'tempfile2.txt'],
        newFileLoc1: path.join(
          FIXTURES_DIR,
          'watch',
          '_t4',
          'directory',
          'tempfile1.txt'
        ),
        newFileLoc2: path.join(
          FIXTURES_DIR,
          'watch',
          '_t4',
          'directory',
          'tempfile2.txt'
        ),
        patterns: [
          {
            from: 'watch/_t4/directory',
          },
        ],
      })
        .then(done)
        .catch(done);
    });

    it('should include all files when `from` is a glob', (done) => {
      runChange({
        expectedAssetKeys: [
          '_t3/dest1/tempfile1.txt',
          '_t3/dest1/tempfile2.txt',
        ],
        newFileLoc1: path.join(
          FIXTURES_DIR,
          'watch',
          '_t3',
          'directory',
          'tempfile1.txt'
        ),
        newFileLoc2: path.join(
          FIXTURES_DIR,
          'watch',
          '_t3',
          'directory',
          'tempfile2.txt'
        ),
        patterns: [
          {
            context: 'watch/_t3/directory',
            from: '**/*.txt',
            to: '_t3/dest1',
          },
        ],
      })
        .then(done)
        .catch(done);
    });

    it('should include all files when multiple patterns used', (done) => {
      runChange({
        expectedAssetKeys: [
          '_t2/dest1/tempfile1.txt',
          '_t2/dest1/tempfile2.txt',
          '_t2/dest2/tempfile1.txt',
          '_t2/dest2/tempfile2.txt',
        ],
        newFileLoc1: path.join(
          FIXTURES_DIR,
          'watch',
          '_t2',
          'directory',
          'tempfile1.txt'
        ),
        newFileLoc2: path.join(
          FIXTURES_DIR,
          'watch',
          '_t2',
          'directory',
          'tempfile2.txt'
        ),
        patterns: [
          {
            context: 'watch/_t2/directory',
            from: '**/*.txt',
            to: '_t2/dest1',
          },
          {
            context: 'watch/_t2/directory',
            from: '**/*.txt',
            to: '_t2/dest2',
          },
        ],
      })
        .then(done)
        .catch(done);
    });

    it('should include all files when multiple patterns with difference contexts', (done) => {
      runChange({
        expectedAssetKeys: [
          '_t1/dest1/tempfile1.txt',
          '_t1/dest2/directory/tempfile1.txt',
          '_t1/dest2/tempfile2.txt',
        ],
        newFileLoc1: path.join(
          FIXTURES_DIR,
          'watch',
          '_t1',
          'directory',
          'tempfile1.txt'
        ),
        newFileLoc2: path.join(FIXTURES_DIR, 'watch', '_t1', 'tempfile2.txt'),
        patterns: [
          {
            context: 'watch/_t1/directory',
            from: '**/*.txt',
            to: '_t1/dest1',
          },
          {
            context: 'watch/_t1',
            from: '**/*.txt',
            to: '_t1/dest2',
          },
        ],
      })
        .then(done)
        .catch(done);
    });

    it('should run once on child compilation', (done) => {
      const expectedAssetKeys = ['file.txt'];
      const spy = jest.spyOn(CopyPlugin, 'apply');

      run({
        withChildCompilation: true,
        patterns: [
          {
            from: 'file.txt',
          },
        ],
      })
        .then(({ compiler, stats }) => {
          // expect(spy).toHaveBeenCalledTimes(1);
          expect(
            Array.from(Object.keys(readAssets(compiler, stats))).sort()
          ).toEqual(expectedAssetKeys);

          spy.mockRestore();
        })
        .then(done)
        .catch(done);
    });
  });

  describe('cache', () => {
    it('should work with the "memory" cache', async () => {
      const compiler = getCompiler({
        cache: {
          type: 'memory',
        },
      });

      new CopyPlugin({
        patterns: [
          {
            from: path.resolve(__dirname, './fixtures/directory'),
          },
        ],
      }).apply(compiler);

      const { stats } = await compile(compiler);

      if (webpack.version[0] === '4') {
        expect(
          Object.keys(stats.compilation.assets).filter(
            (assetName) => stats.compilation.assets[assetName].emitted
          ).length
        ).toBe(5);
      } else {
        expect(stats.compilation.emittedAssets.size).toBe(5);
      }

      expect(readAssets(compiler, stats)).toMatchSnapshot('assets');
      expect(stats.compilation.errors).toMatchSnapshot('errors');
      expect(stats.compilation.warnings).toMatchSnapshot('warnings');

      await new Promise(async (resolve) => {
        const { stats: newStats } = await compile(compiler);

        if (webpack.version[0] === '4') {
          expect(
            Object.keys(newStats.compilation.assets).filter(
              (assetName) => newStats.compilation.assets[assetName].emitted
            ).length
          ).toBe(4);
        } else {
          expect(newStats.compilation.emittedAssets.size).toBe(0);
        }

        expect(readAssets(compiler, newStats)).toMatchSnapshot('assets');
        expect(newStats.compilation.errors).toMatchSnapshot('errors');
        expect(newStats.compilation.warnings).toMatchSnapshot('warnings');

        resolve();
      });
    });

    it('should work with the "filesystem" cache', async () => {
      const cacheDirectory = path.resolve(__dirname, './outputs/.cache/simple');

      await del(cacheDirectory);

      const compiler = getCompiler({
        cache: {
          type: 'filesystem',
          cacheDirectory,
        },
      });

      new CopyPlugin({
        patterns: [
          {
            from: path.resolve(__dirname, './fixtures/directory'),
          },
        ],
      }).apply(compiler);

      const { stats } = await compile(compiler);

      if (webpack.version[0] === '4') {
        expect(
          Object.keys(stats.compilation.assets).filter(
            (assetName) => stats.compilation.assets[assetName].emitted
          ).length
        ).toBe(5);
      } else {
        expect(stats.compilation.emittedAssets.size).toBe(5);
      }

      expect(readAssets(compiler, stats)).toMatchSnapshot('assets');
      expect(stats.compilation.errors).toMatchSnapshot('errors');
      expect(stats.compilation.warnings).toMatchSnapshot('warnings');

      await new Promise(async (resolve) => {
        const { stats: newStats } = await compile(compiler);

        if (webpack.version[0] === '4') {
          expect(
            Object.keys(newStats.compilation.assets).filter(
              (assetName) => newStats.compilation.assets[assetName].emitted
            ).length
          ).toBe(4);
        } else {
          expect(newStats.compilation.emittedAssets.size).toBe(0);
        }

        expect(readAssets(compiler, newStats)).toMatchSnapshot('assets');
        expect(newStats.compilation.errors).toMatchSnapshot('errors');
        expect(newStats.compilation.warnings).toMatchSnapshot('warnings');

        resolve();
      });
    });

    it('should work with the "filesystem" cache and multi compiler mode', async () => {
      const cacheDirectoryA = path.resolve(
        __dirname,
        './outputs/.cache/multi-compiler/a'
      );
      const cacheDirectoryB = path.resolve(
        __dirname,
        './outputs/.cache/multi-compiler/b'
      );

      await del([cacheDirectoryA, cacheDirectoryB]);

      const compiler = webpack([
        {
          mode: 'development',
          context: path.resolve(__dirname, './fixtures'),
          entry: path.resolve(__dirname, './helpers/enter.js'),
          output: {
            path: path.resolve(__dirname, './outputs/multi-compiler/dist/a'),
          },
          stats: {
            source: true,
          },
          cache: {
            type: 'filesystem',
            cacheDirectory: cacheDirectoryA,
          },
          plugins: [
            new CopyPlugin({
              patterns: [
                {
                  from: path.resolve(__dirname, './fixtures/directory'),
                },
              ],
            }),
          ],
        },
        {
          mode: 'development',
          entry: path.resolve(__dirname, './helpers/enter.js'),
          output: {
            path: path.resolve(__dirname, './outputs/multi-compiler/dist/b'),
          },
          stats: {
            source: true,
          },
          cache: {
            type: 'filesystem',
            cacheDirectory: cacheDirectoryB,
          },
          plugins: [
            new CopyPlugin({
              patterns: [
                {
                  context: path.resolve(__dirname, './fixtures'),
                  from: path.resolve(__dirname, './fixtures/directory'),
                },
              ],
            }),
          ],
        },
      ]);

      compiler.compilers.forEach((item) => {
        const outputFileSystem = createFsFromVolume(new Volume());
        // Todo remove when we drop webpack@4 support
        outputFileSystem.join = path.join.bind(path);

        // eslint-disable-next-line no-param-reassign
        item.outputFileSystem = outputFileSystem;
      });

      const { stats } = await compile(compiler);

      stats.stats.forEach((item, index) => {
        if (webpack.version[0] === '4') {
          expect(
            Object.keys(item.compilation.assets).filter(
              (assetName) => item.compilation.assets[assetName].emitted
            ).length
          ).toBe(5);
        } else {
          expect(item.compilation.emittedAssets.size).toBe(5);
        }

        expect(item.compilation.errors).toMatchSnapshot('errors');
        expect(item.compilation.warnings).toMatchSnapshot('warnings');
        expect(readAssets(compiler.compilers[index], item)).toMatchSnapshot(
          'assets'
        );
      });

      await new Promise(async (resolve) => {
        const { stats: newStats } = await compile(compiler);

        newStats.stats.forEach((item, index) => {
          if (webpack.version[0] === '4') {
            expect(
              Object.keys(item.compilation.assets).filter(
                (assetName) => item.compilation.assets[assetName].emitted
              ).length
            ).toBe(4);
          } else {
            expect(item.compilation.emittedAssets.size).toBe(0);
          }

          expect(item.compilation.errors).toMatchSnapshot('errors');
          expect(item.compilation.warnings).toMatchSnapshot('warnings');
          expect(readAssets(compiler.compilers[index], item)).toMatchSnapshot(
            'assets'
          );
        });

        resolve();
      });
    });
  });

  describe('stats', () => {
    it('should work have assets info', async () => {
      const compiler = getCompiler({
        entry: path.resolve(__dirname, './helpers/enter-with-asset-modules.js'),
      });

      new CopyPlugin({
        patterns: [
          {
            from: path.resolve(__dirname, './fixtures/directory'),
          },
        ],
      }).apply(compiler);

      const { stats } = await compile(compiler);

      expect(stats.compilation.warnings).toMatchSnapshot('warnings');
      expect(stats.compilation.errors).toMatchSnapshot('errors');
      expect(readAssets(compiler, stats)).toMatchSnapshot('assets');

      const assetsInfo = [];

      for (const [name, info] of stats.compilation.assetsInfo.entries()) {
        assetsInfo.push({
          name,
          info: {
            // TODO Workaround for `file-loader`, remove after update
            // eslint-disable-next-line no-undefined
            immutable: info.immutable === false ? undefined : info.immutable,
            copied: info.copied,
            // TODO Workaround for `file-loader`, remove after update
            // sourceFilename: info.sourceFilename,
          },
        });
      }

      expect(
        assetsInfo.sort((a, b) => {
          if (a.name < b.name) {
            return -1;
          }

          if (a.name > b.name) {
            return 1;
          }

          return 0;
        })
      ).toMatchSnapshot('assets info');
    });
  });

  describe('logging', () => {
    it('should logging when "from" is a file', (done) => {
      const expectedAssetKeys = ['file.txt'];

      run({
        patterns: [
          {
            from: 'file.txt',
          },
        ],
      })
        .then(({ compiler, stats }) => {
          const root = path.resolve(__dirname).replace(/\\/g, '/');
          const logs = stats.compilation.logging
            .get('copy-webpack-plugin')
            .map((entry) =>
              entry.args[0].replace(/\\/g, '/').split(root).join('.')
            )
            // TODO remove after drop webpack@4
            .filter(
              (item) =>
                !item.startsWith('created snapshot') &&
                !item.startsWith('creating snapshot') &&
                !item.startsWith('getting cache') &&
                !item.startsWith('missed cache') &&
                !item.startsWith('stored cache') &&
                !item.startsWith('storing cache')
            )
            .sort();

          expect(
            Array.from(Object.keys(readAssets(compiler, stats))).sort()
          ).toEqual(expectedAssetKeys);
          expect({ logs }).toMatchSnapshot('logs');
        })
        .then(done)
        .catch(done);
    });

    it('should logging when "from" is a directory', (done) => {
      const expectedAssetKeys = [
        '.dottedfile',
        'directoryfile.txt',
        'nested/deep-nested/deepnested.txt',
        'nested/nestedfile.txt',
      ];

      run({
        patterns: [
          {
            from: 'directory',
          },
        ],
      })
        .then(({ compiler, stats }) => {
          const root = path.resolve(__dirname).replace(/\\/g, '/');
          const logs = stats.compilation.logging
            .get('copy-webpack-plugin')
            .map((entry) =>
              entry.args[0].replace(/\\/g, '/').split(root).join('.')
            )
            // TODO remove after drop webpack@4
            .filter(
              (item) =>
                !item.startsWith('created snapshot') &&
                !item.startsWith('creating snapshot') &&
                !item.startsWith('getting cache') &&
                !item.startsWith('missed cache') &&
                !item.startsWith('stored cache') &&
                !item.startsWith('storing cache')
            )
            .sort();

          expect(
            Array.from(Object.keys(readAssets(compiler, stats))).sort()
          ).toEqual(expectedAssetKeys);
          expect({ logs }).toMatchSnapshot('logs');
        })
        .then(done)
        .catch(done);
    });

    it('should logging when "from" is a glob', (done) => {
      const expectedAssetKeys = [
        'directory/directoryfile.txt',
        'directory/nested/deep-nested/deepnested.txt',
        'directory/nested/nestedfile.txt',
      ];

      run({
        patterns: [
          {
            from: 'directory/**',
            globOptions: {
              onlyFiles: false,
            },
          },
        ],
      })
        .then(({ compiler, stats }) => {
          const root = path.resolve(__dirname).replace(/\\/g, '/');
          const logs = stats.compilation.logging
            .get('copy-webpack-plugin')
            .map((entry) =>
              entry.args[0].replace(/\\/g, '/').split(root).join('.')
            )
            // TODO remove after drop webpack@4
            .filter(
              (item) =>
                !item.startsWith('created snapshot') &&
                !item.startsWith('creating snapshot') &&
                !item.startsWith('getting cache') &&
                !item.startsWith('missed cache') &&
                !item.startsWith('stored cache') &&
                !item.startsWith('storing cache')
            )
            .sort();

          expect(
            Array.from(Object.keys(readAssets(compiler, stats))).sort()
          ).toEqual(expectedAssetKeys);
          expect({ logs }).toMatchSnapshot('logs');
        })
        .then(done)
        .catch(done);
    });
  });
});
