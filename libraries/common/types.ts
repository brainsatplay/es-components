import { Editor, EditorProps } from "../escode/src";
import * as esm from "../esmpile/src";

import Monitor from "../esmonitor/src";
import { MonitorOptions } from "../esmonitor/src/types";


export type Options = {
    keySeparator: MonitorOptions['keySeparator'],
    monitor: Monitor | Partial<MonitorOptions>
    listeners?: {
        static?: boolean
    },

    listen?: boolean,
    clone?: boolean,
    synchronous?: boolean, // TODO: Test if this really works...

    nested: {
        parent: any,
        name: any,
    }, // Add ES Component types here

    utilities: {
        code?: {
            class: typeof Editor,
            options: EditorProps
        },
        bundle?: {
            function: typeof esm.bundle.get,
            options: any
        }
        compile?: {
            function: typeof esm.compile,
            options: any
        }
    }
}