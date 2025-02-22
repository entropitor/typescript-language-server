/*
 * Copyright (C) 2017, 2018 TypeFox and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import * as chai from 'chai';
import * as path from 'path';
import { TspClient } from './tsp-client';
import { ConsoleLogger } from './logger';
import { filePath, readContents } from './test-utils';
import { CommandTypes } from './tsp-command-types';
import { findPathToModule } from './modules-resolver';
import { getTsserverExecutable } from './utils';

const assert = chai.assert;

const executableServer = new TspClient({
    logger: new ConsoleLogger(),
    tsserverPath: getTsserverExecutable()
});

const tsserverModuleRelativePath = path.join('typescript', 'lib', 'tsserver.js');
const bundled = findPathToModule(__dirname, tsserverModuleRelativePath) as string;
const moduleServer = new TspClient({
    logger: new ConsoleLogger(),
    tsserverPath: bundled
});

for (const [serverName, server] of Object.entries({ executableServer, moduleServer })) {
    describe('ts server client using ' + serverName, () => {
        before(() => {
            server.start();
        });

        it('completion', async () => {
            const f = filePath('module2.ts');
            server.notify(CommandTypes.Open, {
                file: f,
                fileContent: readContents(f)
            });
            const completions = await server.request(CommandTypes.CompletionInfo, {
                file: f,
                line: 1,
                offset: 0,
                prefix: 'im'
            });
            assert.isDefined(completions.body);
            assert.equal(completions.body!.entries[1].name, 'ImageBitmap');
        }).timeout(10000);

        it('references', async () => {
            const f = filePath('module2.ts');
            server.notify(CommandTypes.Open, {
                file: f,
                fileContent: readContents(f)
            });
            const references = await server.request(CommandTypes.References, {
                file: f,
                line: 8,
                offset: 16
            });
            assert.isDefined(references.body);
            assert.equal(references.body!.symbolName, 'doStuff');
        }).timeout(10000);

        it('documentHighlight', async () => {
            const f = filePath('module2.ts');
            server.notify(CommandTypes.Open, {
                file: f,
                fileContent: readContents(f)
            });
            const response = await server.request(CommandTypes.DocumentHighlights, {
                file: f,
                line: 8,
                offset: 16,
                filesToSearch: [f]
            });
            assert.isDefined(response.body);
            assert.isTrue(response.body!.some(({ file }) => file.endsWith('module2.ts')), JSON.stringify(response.body, undefined, 2));
            assert.isFalse(response.body!.some(({ file: file_1 }) => file_1.endsWith('module1.ts')), JSON.stringify(response.body, undefined, 2));
        }).timeout(10000);
    });
}
