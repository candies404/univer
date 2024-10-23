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

import type { BooleanNumber, IMutation } from '@univerjs/core';
import { CommandType, IUniverInstanceService } from '@univerjs/core';
import { getSheetCommandTarget } from '../commands/utils/target-util';

export interface IToggleGridlinesMutationParams {
    showGridlines: BooleanNumber;
    unitId: string;
    subUnitId: string;
}

export const ToggleGridlinesMutation: IMutation<IToggleGridlinesMutationParams> = {
    id: 'sheet.mutation.set-hide-gridlines',
    type: CommandType.MUTATION,
    handler: (accessor, params) => {
        const target = getSheetCommandTarget(accessor.get(IUniverInstanceService), params);
        if (!target) return false;

        const { worksheet } = target;
        const config = worksheet.getConfig();
        config.showGridlines = params.showGridlines;
        return true;
    },
};
