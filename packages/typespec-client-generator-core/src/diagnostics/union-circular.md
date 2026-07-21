This diagnostic is issued when TCGC converts a union that directly or indirectly contains itself. Recursive union shapes cannot be represented safely as generated SDK union types.

To fix this issue, break the circular union reference or model the recursive relationship through a model property instead.
