'use strict';
import { RequestLines } from "./models/requestLines"

import { CodeLensProvider, TextDocument, CancellationToken, CodeLens, Command, Range } from 'vscode';
import { Selector } from './selector';

export class HttpCodeLensProvider implements CodeLensProvider {
    public provideCodeLenses(document: TextDocument, token: CancellationToken): Promise<CodeLens[]> {
        let blocks: CodeLens[] = [];
        let lines: string[] = document.getText().split(/\r?\n/g);
        let delimitedLines: number[] = Selector.getDelimiterRows(lines);
        delimitedLines.push(lines.length);

        let requestRange: [number, number][] = [];
        let start: number = 0;
        for (let index = 0; index < delimitedLines.length; index++) {
            let end = delimitedLines[index] - 1;
            if (start <= end) {
                requestRange.push([start, end]);
                start = delimitedLines[index] + 1;
            }
        }

        for (let index = 0; index < requestRange.length; index++) {
            let [blockStart, blockEnd] = requestRange[index];

            // get real start for current requestRange
            while (blockStart <= blockEnd) {
                if (Selector.isEmptyLine(lines[blockStart]) ||
                    Selector.isCommentLine(lines[blockStart]) ||
                    Selector.isVariableDefinitionLine(lines[blockStart])) {
                    blockStart++;
                } else {
                    break;
                }
            }

            if (Selector.isResponseStatusLine(lines[blockStart])) {
                continue;
            }

            if (blockStart <= blockEnd) {
                let requestVariable = null;
                if (blockStart > 0) {
                    requestVariable = Selector.getRequestVariableDefinitionName(lines[blockStart-1]);
                }
                const range = new Range(blockStart, 0, blockEnd, 0);
                const requestLines = new RequestLines(range, document.uri.toString(), requestVariable);
                const cmd: Command = {
                    arguments: [document, requestLines],
                    title: 'Send Request',
                    command: 'rest-client.request'
                };
                blocks.push(new CodeLens(range, cmd));
            }
        }

        return Promise.resolve(blocks);
    }
}