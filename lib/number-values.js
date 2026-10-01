export function normalizeFps(value){const number=Number(value);return Number.isSafeInteger(number)&&number>0?number:30}
export function normalizeDuration(value){const number=Number(value);return Number.isFinite(number)&&number>0?number:1}

// Keep editing text separate from committed numbers, including empty and
// unfinished decimal entries. External renders must not replace active edits.
export class NumberDraft{
 constructor(value){this.value=value;this.text=String(value);this.focused=false;this.dirty=false}
 sync(value){this.value=value;if(!this.focused&&!this.dirty)this.text=String(value)}
 edit(text){this.text=text;this.dirty=true}
 commit(parse){const value=this.dirty?parse(this.text):this.value,changed=value!==this.value;this.value=value;this.text=String(value);this.dirty=false;return{value,changed}}
 cancel(){this.text=String(this.value);this.dirty=false}
}
