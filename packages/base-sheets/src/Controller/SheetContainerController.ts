import { BooleanNumber, CommandManager, SheetAction, ISheetActionData } from '@univer/core';
import { SheetPlugin } from '../SheetPlugin';

export class SheetContainerController {
    private _plugin: SheetPlugin;

    constructor(plugin: SheetPlugin) {
        this._plugin = plugin;

        this._initialize();
    }

    private _initialize() {
        // Monitor all command changes and automatically trigger the refresh of the canvas
        CommandManager.getCommandObservers().add(({ actions }) => {
            const action = actions[0] as SheetAction<ISheetActionData>;
            const worksheet = action.getWorkSheet();

            // Only the currently active worksheet needs to be refreshed
            if (worksheet.getConfig().status === BooleanNumber.TRUE) {
                this._plugin.getCanvasView().updateToSheet(worksheet);
                this._plugin.getMainComponent().makeDirty(true);
            }
        });
    }
}
