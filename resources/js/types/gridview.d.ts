// Type definitions for GridView component data structures

export interface GridViewColumn {
    'label-id': string;
    'label-name': string;
    'label-type'?: string;
    'label-width'?: string;
    'label-align'?: string;
    'label-class'?: string;
    'badge-width'?: string;
    sortable?: boolean;
    scope?: string;
    disabled?: boolean;
}

export interface GridViewDataItem {
    rowId?: string | number;
    key?: string;
    value?: any;
    [key: string]: any;
}

export interface GridViewAction {
    key?: string;
    name?: string;
    label?: string;
    text?: string;
    href?: string;
    icon?: string;
    disabled?: boolean;
    action?: (item: any) => void;
    [key: string]: any;
}

