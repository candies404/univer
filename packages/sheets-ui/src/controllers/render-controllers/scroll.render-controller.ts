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

import type { IFreeze, IRange, IWorksheetData, Nullable, Workbook } from '@univerjs/core';
import {
    Direction,
    Disposable,
    ICommandService,
    Inject,
    Injector,
    RANGE_TYPE, toDisposable } from '@univerjs/core';
import type { IRenderContext, IRenderModule, IScrollObserverParam } from '@univerjs/engine-render';
import { IRenderManagerService, SHEET_VIEWPORT_KEY } from '@univerjs/engine-render';
import type { SheetsSelectionsService } from '@univerjs/sheets';
import { getSelectionsService, ScrollToCellOperation } from '@univerjs/sheets';

import { ScrollCommand } from '../../commands/commands/set-scroll.command';
import type { IExpandSelectionCommandParams } from '../../commands/commands/set-selection.command';
import { ExpandSelectionCommand, MoveSelectionCommand, MoveSelectionEnterAndTabCommand } from '../../commands/commands/set-selection.command';
import type { IScrollState, IScrollStateSearchParam, IViewportScrollState } from '../../services/scroll-manager.service';
import { SheetScrollManagerService } from '../../services/scroll-manager.service';
import type { ISheetSkeletonManagerParam } from '../../services/sheet-skeleton-manager.service';
import { SheetSkeletonManagerService } from '../../services/sheet-skeleton-manager.service';
import { getSheetObject } from '../utils/component-tools';

const SHEET_NAVIGATION_COMMANDS = [MoveSelectionCommand.id, MoveSelectionEnterAndTabCommand.id];

/**
 * This controller handles scroll logic in sheet interaction.
 */
export class SheetsScrollRenderController extends Disposable implements IRenderModule {
    constructor(
        private readonly _context: IRenderContext<Workbook>,
        @Inject(Injector) private readonly _injector: Injector,
        @Inject(SheetSkeletonManagerService) private readonly _sheetSkeletonManagerService: SheetSkeletonManagerService,
        @ICommandService private readonly _commandService: ICommandService,
        @IRenderManagerService private readonly _renderManagerService: IRenderManagerService,
        @Inject(SheetScrollManagerService) private readonly _scrollManagerService: SheetScrollManagerService
    ) {
        super();

        this._init();
    }

    scrollToRange(range: IRange): boolean {
        let { endRow, endColumn, startColumn, startRow } = range;
        const bounding = this._getViewportBounding();
        if (range.rangeType === RANGE_TYPE.ROW) {
            startColumn = 0;
            endColumn = 0;
        } else if (range.rangeType === RANGE_TYPE.COLUMN) {
            startRow = 0;
            endRow = 0;
        }

        if (bounding) {
            const row = bounding.startRow > endRow ? startRow : endRow;
            const col = bounding.startColumn > endColumn ? startColumn : endColumn;
            return this._scrollToCell(row, col);
        } else {
            return this._scrollToCell(startRow, startColumn);
        }
    }

    private _init() {
        this._initCommandListener();
        this._initScrollEventListener();
        this._initSkeletonListener();
    }

    private _initCommandListener(): void {
        this.disposeWithMe(
            this._commandService.onCommandExecuted((command) => {
                if (SHEET_NAVIGATION_COMMANDS.includes(command.id)) {
                    this._scrollToSelection();
                } else if (command.id === ScrollToCellOperation.id) {
                    const param = command.params as IRange;
                    this.scrollToRange(param);
                } else if (command.id === ExpandSelectionCommand.id) {
                    const param = command.params as IExpandSelectionCommandParams;
                    this._scrollToSelectionForExpand(param);
                }
            })
        );
    }

    private _scrollToSelectionForExpand(param: IExpandSelectionCommandParams) {
        setTimeout(() => {
            const selection = this._getSelectionsService().getCurrentLastSelection();
            if (selection == null) {
                return;
            }

            const { startRow, startColumn, endRow, endColumn } = selection.range;

            const bounds = this._getViewportBounding();
            if (bounds == null) {
                return;
            }

            const { startRow: viewportStartRow, startColumn: viewportStartColumn, endRow: viewportEndRow, endColumn: viewportEndColumn } = bounds;

            let row = 0;
            let column = 0;

            if (startRow > viewportStartRow) {
                row = endRow;
            } else if (endRow < viewportEndRow) {
                row = startRow;
            } else {
                row = viewportStartRow;
            }

            if (startColumn > viewportStartColumn) {
                column = endColumn;
            } else if (endColumn < viewportEndColumn) {
                column = startColumn;
            } else {
                column = viewportStartColumn;
            }

            if (param.direction === Direction.DOWN) {
                row = endRow;
            } else if (param.direction === Direction.UP) {
                row = startRow;
            } else if (param.direction === Direction.RIGHT) {
                column = endColumn;
            } else if (param.direction === Direction.LEFT) {
                column = startColumn;
            }

            this._scrollToCell(row, column);
        }, 0);
    }

    private _getFreeze(): Nullable<IFreeze> {
        const snapshot: IWorksheetData | undefined = this._sheetSkeletonManagerService.getCurrent()?.skeleton.getWorksheetConfig();
        if (snapshot == null) {
            return;
        }

        return snapshot.freeze;
    }

    // eslint-disable-next-line max-lines-per-function
    private _initScrollEventListener() {
        const { scene } = this._context;
        if (scene == null) return;

        const viewportMain = scene.getViewport(SHEET_VIEWPORT_KEY.VIEW_MAIN);
        if (!viewportMain) return;

        //#region scrollInfo$ subscriber ---> viewport.scrollTo
        this.disposeWithMe(
            toDisposable(
                // wheel event --> set-scroll.command('sheet.operation.set-scroll') --> scroll.operation.ts -->
                // scrollManagerService.setScrollInfoAndEmitEvent --->  scrollManagerService.setScrollInfo(raw value, may be negative) &&
                // _notifyCurrentScrollInfo
                this._scrollManagerService.rawScrollInfo$.subscribe((rawScrollInfo: Nullable<IScrollState>) => {
                    const skeleton = this._sheetSkeletonManagerService.getCurrent()?.skeleton;
                    if (!skeleton) return;

                    if (rawScrollInfo == null) {
                        viewportMain.scrollToViewportPos({
                            viewportScrollX: 0,
                            viewportScrollY: 0,
                        });
                        return;
                    }

                    // prev scrolling state from rawScrollInfo$
                    const { sheetViewStartRow, sheetViewStartColumn, offsetX, offsetY } = rawScrollInfo;

                    const { startX, startY } = skeleton.getCellByIndexWithNoHeader(
                        sheetViewStartRow,
                        sheetViewStartColumn
                    );

                    const viewportScrollX = startX + offsetX;
                    const viewportScrollY = startY + offsetY;

                    viewportMain.scrollToViewportPos({ viewportScrollX, viewportScrollY });
                })
            )
        );
        //#endregion

        //#region viewport.onScrollAfter$ --> setScrollInfoToCurrSheet & validViewportScrollInfo$
        this.disposeWithMe(
            // set scrollInfo, the event is triggered in viewport@_scrollToScrollbarPos
            viewportMain.onScrollAfter$.subscribeEvent((scrollAfterParam: IScrollObserverParam) => {
                const skeleton = this._sheetSkeletonManagerService.getCurrent()?.skeleton;
                if (skeleton == null || scrollAfterParam.isTrigger === false) {
                    return;
                }

                const sheetObject = this._getSheetObject();
                if (skeleton == null || sheetObject == null) {
                    return;
                }

                //#region set scrollInfo with validScrollValue
                const { viewportScrollX, viewportScrollY, scrollX, scrollY } = scrollAfterParam;

                // according to the actual scroll position, the most suitable row, column and offset combination is recalculated.
                const { row, column, rowOffset, columnOffset } = skeleton.getDecomposedOffset(
                    viewportScrollX,
                    viewportScrollY
                );

                const scrollInfo = {
                    sheetViewStartRow: row,
                    sheetViewStartColumn: column,
                    offsetX: columnOffset,
                    offsetY: rowOffset,
                };
                this._scrollManagerService.setScrollStateToCurrSheet(scrollInfo);
                //#endregion

                this._scrollManagerService.validViewportScrollInfo$.next({
                    ...scrollInfo,
                    viewportScrollX,
                    viewportScrollY,
                    scrollX,
                    scrollY,
                });
                // snapshot is diff by diff people!
                // this._scrollManagerService.setScrollInfoToSnapshot({ ...lastestScrollInfo, viewportScrollX, viewportScrollY });
            })
        );
        //#endregion

        //#region scroll by bar
        this.disposeWithMe(
            viewportMain.onScrollByBar$.subscribeEvent((param) => {
                const skeleton = this._sheetSkeletonManagerService.getCurrent()?.skeleton;
                if (skeleton == null || param.isTrigger === false) {
                    return;
                }

                const sheetObject = this._getSheetObject();
                if (skeleton == null || sheetObject == null) {
                    return;
                }
                const { viewportScrollX = 0, viewportScrollY = 0 } = param;

                const freeze = this._getFreeze();

                const { row, column, rowOffset, columnOffset } = skeleton.getDecomposedOffset(
                    viewportScrollX,
                    viewportScrollY
                );

                this._commandService.executeCommand(ScrollCommand.id, {
                    sheetViewStartRow: row + (freeze?.ySplit || 0),
                    sheetViewStartColumn: column + (freeze?.xSplit || 0),
                    offsetX: columnOffset,
                    offsetY: rowOffset,
                });
            })
        );
        //#endregion
    }

    private _initSkeletonListener() {
        this.disposeWithMe(toDisposable(
            this._sheetSkeletonManagerService.currentSkeletonBefore$.subscribe((param) => {
                if (param == null) {
                    return;
                }
                const scrollParam = { unitId: param.unitId, sheetId: param.sheetId } as IScrollStateSearchParam;
                this._scrollManagerService.setSearchParam(scrollParam);
                const sheetObject = this._getSheetObject();
                if (!sheetObject) return;
                const scene = sheetObject.scene;
                const viewportMain = scene.getViewport(SHEET_VIEWPORT_KEY.VIEW_MAIN);
                const currScrollInfo = this._scrollManagerService.getScrollStateByParam(scrollParam);
                const { viewportScrollX, viewportScrollY } = this._scrollManagerService.calcViewportScrollFromRowColOffset(currScrollInfo as unknown as Nullable<IViewportScrollState>);
                if (viewportMain) {
                    if (currScrollInfo) {
                        viewportMain.viewportScrollX = viewportScrollX;
                        viewportMain.viewportScrollY = viewportScrollY;
                    } else {
                        viewportMain.viewportScrollX = 0;
                        viewportMain.viewportScrollY = 0;
                    }
                    this._updateSceneSize(param as unknown as ISheetSkeletonManagerParam);
                }
            })));
    }

    private _updateSceneSize(param: ISheetSkeletonManagerParam) {
        if (param == null) {
            return;
        }

        const { unitId } = this._context;
        const { skeleton } = param;
        const scene = this._renderManagerService.getRenderById(unitId)?.scene;

        if (skeleton == null || scene == null) {
            return;
        }

        const { rowTotalHeight, columnTotalWidth, rowHeaderWidthAndMarginLeft, columnHeaderHeightAndMarginTop } =
            skeleton;
        const workbook = this._context.unit;
        const worksheet = workbook.getActiveSheet();
        if (!worksheet) return;

        const zoomRatio = worksheet.getZoomRatio() || 1;
        scene?.setScaleValue(zoomRatio, zoomRatio);
        scene?.transformByState({
            width: rowHeaderWidthAndMarginLeft + columnTotalWidth,
            height: columnHeaderHeightAndMarginTop + rowTotalHeight,
        });
    }

    private _getSheetObject() {
        return getSheetObject(this._context.unit, this._context);
    }

    private _scrollToSelectionByDirection(range: IRange) {
        const bounds = this._getViewportBounding();
        if (bounds == null) {
            return false;
        }
        const {
            startRow: viewportStartRow,
            startColumn: viewportStartColumn,
            endRow: viewportEndRow,
            endColumn: viewportEndColumn,
        } = bounds;

        let row = 0;
        let column = 0;

        const { startRow, startColumn, endRow, endColumn } = range;

        if (startRow >= viewportStartRow) {
            row = endRow;
        }

        if (endRow <= viewportEndRow) {
            row = startRow;
        }

        if (startColumn >= viewportStartColumn) {
            column = endColumn;
        }

        if (endColumn <= viewportEndColumn) {
            column = startColumn;
        }

        this._scrollToCell(row, column);
    }

    private _scrollToSelection(targetIsActualRowAndColumn = true) {
        const selection = this._getSelectionsService().getCurrentLastSelection();
        if (selection == null) {
            return;
        }

        const { startRow, startColumn, actualRow, actualColumn } = selection.primary;
        const selectionStartRow = targetIsActualRowAndColumn ? actualRow : startRow;
        const selectionStartColumn = targetIsActualRowAndColumn ? actualColumn : startColumn;

        this._scrollToCell(selectionStartRow, selectionStartColumn);
    }

    private _getSelectionsService(): SheetsSelectionsService {
        return getSelectionsService(this._injector);
    }

    private _getViewportBounding() {
        const scene = this._getSheetObject()?.scene;
        if (scene == null) {
            return;
        }

        const viewport = scene.getViewport(SHEET_VIEWPORT_KEY.VIEW_MAIN);
        if (viewport == null) {
            return;
        }

        const skeleton = this._sheetSkeletonManagerService.getCurrent()?.skeleton;
        if (skeleton == null) {
            return;
        }

        const bounds = viewport.getBounding();
        return skeleton.getRowColumnSegment(bounds);
    }

    // eslint-disable-next-line max-lines-per-function, complexity
    private _scrollToCell(row: number, column: number): boolean {
        const { rowHeightAccumulation, columnWidthAccumulation } = this._sheetSkeletonManagerService.getCurrent()?.skeleton ?? {};

        if (rowHeightAccumulation == null || columnWidthAccumulation == null) return false;

        const scene = this._getSheetObject()?.scene;
        if (scene == null) return false;

        const viewport = scene.getViewport(SHEET_VIEWPORT_KEY.VIEW_MAIN);
        if (viewport == null) return false;

        const skeleton = this._sheetSkeletonManagerService.getCurrent()?.skeleton;
        if (skeleton == null) return false;

        const worksheet = this._context.unit.getActiveSheet();
        if (!worksheet) return false;

        const {
            startColumn: freezeStartColumn,
            startRow: freezeStartRow,
            ySplit: freezeYSplit,
            xSplit: freezeXSplit,
        } = worksheet.getFreeze();

        const bounds = this._getViewportBounding();
        if (bounds == null) return false;

        const {
            startRow: viewportStartRow,
            startColumn: viewportStartColumn,
            endRow: viewportEndRow,
            endColumn: viewportEndColumn,
        } = bounds;

        let startSheetViewRow: number | undefined;
        let startSheetViewColumn: number | undefined;

        // vertical overflow only happens when the selection's row is in not the freeze area
        if (row >= freezeStartRow && column >= freezeStartColumn - freezeXSplit) {
            // top overflow
            if (row <= viewportStartRow) {
                startSheetViewRow = row;
            }

            // bottom overflow
            if (row >= viewportEndRow) {
                const minRowAccumulation = rowHeightAccumulation[row] - viewport.height!;
                for (let r = viewportStartRow; r <= row; r++) {
                    if (rowHeightAccumulation[r] >= minRowAccumulation) {
                        startSheetViewRow = r + 1;
                        break;
                    }
                }
            }
        }
        // horizontal overflow only happens when the selection's column is in not the freeze area
        if (column >= freezeStartColumn && row >= freezeStartRow - freezeYSplit) {
            // left overflow
            if (column <= viewportStartColumn) {
                startSheetViewColumn = column;
            }

            // right overflow
            if (column >= viewportEndColumn) {
                const minColumnAccumulation = columnWidthAccumulation[column] - viewport.width!;
                for (let c = viewportStartColumn; c <= column; c++) {
                    if (columnWidthAccumulation[c] >= minColumnAccumulation) {
                        startSheetViewColumn = c + 1;
                        break;
                    }
                }
            }
        }

        if (startSheetViewRow === undefined && startSheetViewColumn === undefined) return false;

        const { offsetX, offsetY } = this._scrollManagerService.getCurrentScrollState() || {};
        return this._commandService.syncExecuteCommand(ScrollCommand.id, {
            sheetViewStartRow: startSheetViewRow,
            sheetViewStartColumn: startSheetViewColumn,
            offsetX: startSheetViewColumn === undefined ? offsetX : 0,
            offsetY: startSheetViewRow === undefined ? offsetY : 0,
        });
    }
}
