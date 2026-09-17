/**
 * A tip with more than one text can carry: a heading, rows of a label
 * with its value at the right, each in a tone, and a note under them. A
 * view works one out from its model without a DOM (`raidCellTip`), and
 * `wt-list-tip` draws it where `wt-tip-layer` puts it. A `wt-*` host
 * takes it as `.listTip=${…}`; any other element takes it through the
 * `listTip()` directive, which wires the same property and attribute.
 */

import { nothing } from 'lit'
import { Directive, directive, PartType, type ElementPart, type PartInfo } from 'lit/directive.js'
import type { Severity } from '../enums/severity'

export interface ListTipRow {
  label: string
  value: string
  /** The colour of the value: `Ok` for what is done, `Warn` for what is not. */
  tone: Severity
}

export interface ListTip {
  heading: string
  rows: ListTipRow[]
  /** A sentence under the rows: where the figures come from, where the threshold is set. */
  note?: string
}

/** Whether a tip that can be text or rows is the rows. */
export function isListTip(tip: string | ListTip | null | undefined): tip is ListTip {
  return typeof tip === 'object' && tip !== null
}

/** What a host carries once a list tip is bound to it; `wt-tip-layer` reads it off the `data-list-tip` attribute. */
export interface ListTipHost extends Element {
  listTip?: ListTip | null
}

class ListTipDirective extends Directive {
  constructor(partInfo: PartInfo) {
    super(partInfo)
    if (partInfo.type !== PartType.ELEMENT) throw new Error('listTip() binds on the element, not on an attribute')
  }

  override update(part: ElementPart, [tip]: [ListTip | null | undefined]): typeof nothing {
    const host = part.element as ListTipHost
    // A `WtElement` toggles the attribute in its setter; a plain element
    // needs it set here, so the layer's `closest()` finds the host.
    host.listTip = tip ?? null
    host.toggleAttribute('data-list-tip', isListTip(tip))
    return nothing
  }

  render(_tip: ListTip | null | undefined): typeof nothing {
    return nothing
  }
}

/** Binds a list tip on any element: `<span ${listTip(tip)}>`. */
export const listTip = directive(ListTipDirective)
