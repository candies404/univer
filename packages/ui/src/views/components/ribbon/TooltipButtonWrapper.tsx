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

import type { ITooltipProps } from '@univerjs/design';
import type { ReactNode } from 'react';
import { Dropdown, Tooltip } from '@univerjs/design';
import { createContext, forwardRef, useContext, useImperativeHandle, useMemo, useRef, useState } from 'react';

const TooltipWrapperContext = createContext({
    dropdownVisible: false,
    setDropdownVisible: (_visible: boolean) => {},
});

export interface ITooltipWrapperRef {
    el: HTMLSpanElement | null;
}

export const TooltipWrapper = forwardRef<ITooltipWrapperRef, ITooltipProps>((props, ref) => {
    const { children, ...tooltipProps } = props;
    const spanRef = useRef<HTMLSpanElement>(null);

    const [tooltipVisible, setTooltipVisible] = useState(false);
    const [dropdownVisible, setDropdownVisible] = useState(false);

    function handleChangeTooltipVisible(visible: boolean) {
        if (dropdownVisible) {
            setTooltipVisible(false);
        } else {
            setTooltipVisible(visible);
        }
    }

    function handleChangeDropdownVisible(visible: boolean) {
        setDropdownVisible(visible);

        setTooltipVisible(false);
    }

    const contextValue = useMemo(() => ({
        dropdownVisible,
        setDropdownVisible: handleChangeDropdownVisible,
    }), [dropdownVisible]);

    useImperativeHandle(ref, () => ({
        el: spanRef.current,
    }));

    return (
        <Tooltip
            {...tooltipProps}
            visible={tooltipVisible}
            onVisibleChange={handleChangeTooltipVisible}
        >
            <span ref={spanRef}>
                <TooltipWrapperContext.Provider value={contextValue}>
                    {children}
                </TooltipWrapperContext.Provider>
            </span>
        </Tooltip>
    );
});

export function DropdownWrapper({ children, overlay, disabled }: { children: ReactNode; overlay: ReactNode; disabled?: boolean }) {
    const { setDropdownVisible } = useContext(TooltipWrapperContext);

    function handleVisibleChange(visible: boolean) {
        setDropdownVisible(visible);
    }

    return (
        <Dropdown
            align="start"
            overlay={(
                <div className="univer-grid univer-gap-2 univer-theme">
                    {overlay}
                </div>
            )}
            disabled={disabled}
            onOpenChange={handleVisibleChange}
        >
            <div className="univer-h-full" onClick={(e) => e.stopPropagation()}>
                {children}
            </div>
        </Dropdown>
    );
}
