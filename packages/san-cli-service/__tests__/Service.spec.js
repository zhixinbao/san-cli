/**
 * Copyright (c) Baidu Inc. All rights reserved.
 *
 * This source code is licensed under the MIT license.
 * See LICENSE file in the project root for license information.
 *
 * @file Service test
 * @author yanyiting
 */

const Service = require('../Service');

jest.unmock('fs-extra');
// jest.unmock('cosmiconfig');

describe('constructor resolvePlugins _loadPlugin', () => {
    test('plugins有值，useBuiltInPlugin为true', () => {
        const service = new Service('name', {
            cwd: __dirname + '/mock',
            plugins: [
                // string格式
                './yyt-plugin.js',
                // obj格式
                {id: 'yyt1-plugin', apply: () => {}},
                // array格式两项，参数一obj
                [{id: 'yyt3-plugin', apply: () => {}}, {}],
                // array格式两项，参数一string
                ['./yyt2-plugin.js', {a: 1}]
            ],
            useBuiltInPlugin: true,
            projectOptions: {
                outputDir: 'output'
            },
            cli: () => {}
        });
        // 检测plugins新增的插件是否已加入进去
        expect(
            service.plugins.map(item => {
                if (Array.isArray(item)) {
                    return item[0].id;
                }
                return item.id;
            })
        ).toEqual([
            'built-in:base',
            'built-in:css',
            'built-in:app',
            'built-in:optimization',
            'san-cli-plugin-babel',
            'yyt-plugin',
            'yyt1-plugin',
            'yyt3-plugin',
            'yyt2-plugin'
        ]);
        // 检测对于加options的插件是否已加入进去
        expect(service.plugins.filter(item => Array.isArray(item))[1][1]).toEqual({a: 1});
        // 检测新增的projectOptions是否已加入进去
        expect(service._initProjectOptions).toEqual({outputDir: 'output'});
    });
    test('plugins为空，useBuiltInPlugin为true', () => {
        const service = new Service('name', {
            cwd: __dirname + '/mock',
            useBuiltInPlugin: true,
            projectOptions: {
                outputDir: 'output'
            },
            cli: () => {}
        });
        // 检测plugins插件值是否正常
        expect(
            service.plugins.map(item => {
                if (Array.isArray(item)) {
                    return item[0].id;
                }
                return item.id;
            })
        ).toEqual(['built-in:base', 'built-in:css', 'built-in:app', 'built-in:optimization', 'san-cli-plugin-babel']);
    });
    test('useBuiltInPlugin为false', () => {
        const service = new Service('name', {
            cwd: __dirname + '/mock',
            useBuiltInPlugin: false,
            projectOptions: {
                outputDir: 'output'
            },
            cli: () => {}
        });
        // 检测plugins插件值是否正常
        expect(service.plugins).toEqual([]);
    });
});

describe('loadEnv', () => {
    let service = null;
    beforeEach(() => {
        service = new Service('name', {
            cwd: __dirname + '/mock'
        });
    });
    test('有mode值', () => {
        service.loadEnv('production');
        expect(process.env.TEST_ENV_PRODUCTION_PATH).toBe('/home/work/env/production');
        expect(process.env.TEST_ENV_PRODUCTION_LOACAL_PATH).toBe('/home/work/env/production/local');
    });
    test('没有mode值, 不存在某个.env文件', () => {
        service.loadEnv();
        expect(process.env.TEST_ENV_PATH).toBeUndefined();
    });
});

describe('loadProjectOptions', () => {
    let service = null;
    beforeEach(() => {
        service = new Service('name', {
            cwd: __dirname + '/mock'
        });
    });
    test('可查到的文件路径', async () => {
        const config = await service.loadProjectOptions('./mock/san.config.js');
        // 检测san.config.js中的配置项是否保留还在
        expect(config.templateDir).toBe('template');
        // 检测与./options中的默认配置项做merge的情况是否符合预期
        expect(config.devServer).toEqual({
            contentBase: 'output',
            port: 9003,
            logLevel: 'silent',
            clientLogLevel: 'silent',
            overlay: {warnings: false, errors: true},
            stats: 'errors-only',
            inline: false,
            lazy: false,
            index: 'index.html',
            watchOptions: {aggregateTimeout: 300, ignored: /node_modules/, poll: 100},
            disableHostCheck: true,
            compress: false,
            host: '0.0.0.0',
            watchContentBase: false,
            hot: true,
            hotOnly: false,
            https: false
        });
        // 检测是否加了css配置项
        expect(config.css).toBeUndefined();
    });
    test('不可查到的文件路径，但是工程中存在san.config.js', async () => {
        const config = await service.loadProjectOptions();
        // 会去自动查找项目中的san.config.js，查验一下是否找到了并返回正确的配置项
        expect(config.templateDir).toBe('template');
    });

});

describe('initPlugin', () => {
    let service = null;
    beforeEach(() => {
        service = new Service('name', {
            cwd: __dirname + '/mock'
        });
    });
    const expectfunc = api => {
        expect(typeof api.addPlugin).toBe('function');
        expect(typeof api.chainWebpack).toBe('function');
        expect(typeof api.getWebpackChainConfig).toBe('function');
        expect(typeof api.getWebpackConfig).toBe('function');
        expect(typeof api.getProjectOption).toBe('function');
        expect(typeof api.getCwd).toBe('function');
    };
    test('参数为两项数组[{id: xxx, apply: () => {}}, {}]', () => {
        service.initPlugin([
            {
                id: 'yyt-plugin',
                apply: (api, projectOptions, options) => {
                    expectfunc(api);
                    expect(options).toEqual({a: 1, b: 2});
                }
            },
            {
                a: 1,
                b: 2
            }
        ]);
    });
    test('参数为一项数组[{id: xxx, apply: () => {}}]', () => {
        service.initPlugin([
            {
                id: 'yyt-plugin',
                apply: (api, projectOptions, options) => {
                    expectfunc(api);
                }
            }
        ]);
    });
    test('参数对象{id: xxx, apply: () => {}}', () => {
        service.initPlugin([
            {
                id: 'yyt-plugin',
                apply: (api, projectOptions, options) => {
                    expectfunc(api);
                }
            }
        ]);
    });
});

// describe('registerCommand', () => {
//     let service = null;
//     beforeEach(() => {
//         service = new Service(__dirname + '/mock');
//     });
//     test('name为string，yargsModule为obj', () => {
//         service.registerCommand('yyt [component]', {
//             builder: {},
//             description: 'yyt description',
//             handler(argv) {},
//             aliases: []
//         });
//         expect(service.registeredCommands.get('yyt').describe).toBe('yyt description');
//     });
//     test('name为string，yargsModule为function', () => {
//         service.registerCommand('yyt [component]', argv => {});
//         expect(service.registeredCommands.get('yyt').describe).toBeFalsy();
//     });
//     test('只有name值（只有第一个参数）', () => {
//         service.registerCommand({
//             command: 'yyt [component]',
//             builder: {},
//             description: 'yyt only name description',
//             handler(argv) {},
//             aliases: []
//         });
//         expect(service.registeredCommands.get('yyt').describe).toBe('yyt only name description');
//     });
// });
