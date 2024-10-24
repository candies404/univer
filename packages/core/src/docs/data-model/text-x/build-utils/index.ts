/**
 * Copyright 2023-present DreamNum Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { copyCustomRange, getCustomRangesInterestsWithSelection, isIntersecting, shouldDeleteCustomRange } from './custom-range';
import { changeParagraphBulletNestLevel, setParagraphBullet, switchParagraphBullet, toggleChecklistParagraph } from './paragraph';
import { fromPlainText, getPlainText, isEmptyDocument } from './parse';
import { getDeleteSelection, getInsertSelection, getRetainAndDeleteFromReplace, isSegmentIntersects, makeSelection, normalizeSelection } from './selection';
import { addCustomRangeTextX, deleteCustomRangeTextX, getRetainAndDeleteAndExcludeLineBreak, replaceSelectionTextX } from './text-x-utils';

export class BuildTextUtils {
    static customRange = {
        add: addCustomRangeTextX,
        delete: deleteCustomRangeTextX,

        copyCustomRange,
        getCustomRangesInterestsWithSelection,
        shouldDeleteCustomRange,

        isIntersecting,
    };

    static selection = {
        replace: replaceSelectionTextX,

        makeSelection,
        normalizeSelection,
        getDeleteSelection,
        getInsertSelection,

        getDeleteActions: getRetainAndDeleteFromReplace,
        getDeleteExcludeLastLineBreakActions: getRetainAndDeleteAndExcludeLineBreak,
    };

    static range = {
        isIntersects: isSegmentIntersects,
    };

    static transform = {
        getPlainText,
        fromPlainText,
        isEmptyDocument,
    };

    static paragraph = {
        bullet: {
            set: setParagraphBullet,
            switch: switchParagraphBullet,
            toggleChecklist: toggleChecklistParagraph,
            changeNestLevel: changeParagraphBulletNestLevel,
        },
    };
}

export type { IAddCustomRangeTextXParam, IDeleteCustomRangeParam, IReplaceSelectionTextXParams } from './text-x-utils';
