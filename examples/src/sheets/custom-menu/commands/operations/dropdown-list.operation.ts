/**
 * Copyright 2023-present DreamNum Co., Ltd.
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

import type { IAccessor, ICommand } from '@univerjs/core';
import { CommandType } from '@univerjs/core';

export const DropdownListFirstItemOperation: ICommand = {
    id: 'custom-menu.operation.dropdown-list-first-item',
    type: CommandType.OPERATION,
    handler: async (_accessor: IAccessor) => {
        // alert('Dropdown list first item operation')
        return true;
    },
};

export const DropdownListSecondItemOperation: ICommand = {
    id: 'custom-menu.operation.dropdown-list-second-item',
    type: CommandType.OPERATION,
    handler: async (_accessor: IAccessor) => {
        // alert('Dropdown list second item operation')
        return true;
    },
};
