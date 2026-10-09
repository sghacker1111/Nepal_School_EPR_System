/** Assign unique questions to slots without starving more specific allocations.
 * Locked questions are matched first and retained during augmenting paths.
 */
export function allocateQuestions(
  slots: readonly (readonly string[])[],
  locked: readonly string[] = [],
) {
  const selected = new Map<number, string>();
  const owner = new Map<string, number>();
  function placeLocked(question: string, visited: Set<number>): boolean {
    for (let slot = 0; slot < slots.length; slot++) {
      if (visited.has(slot) || !slots[slot].includes(question)) continue;
      visited.add(slot);
      const occupied = selected.get(slot);
      if (!occupied || placeLocked(occupied, visited)) {
        selected.set(slot, question);
        owner.set(question, slot);
        return true;
      }
    }
    return false;
  }
  for (const question of new Set(locked)) {
    if (!placeLocked(question, new Set()))
      throw new Error(
        "A locked question cannot fit this grid. Unlock it before regenerating.",
      );
  }
  function fill(slot: number, visited: Set<string>): boolean {
    for (const question of slots[slot]) {
      if (visited.has(question)) continue;
      visited.add(question);
      const previous = owner.get(question);
      if (previous === undefined || fill(previous, visited)) {
        selected.set(slot, question);
        owner.set(question, slot);
        return true;
      }
    }
    return false;
  }
  for (let slot = 0; slot < slots.length; slot++) {
    if (!selected.has(slot) && !fill(slot, new Set()))
      throw new Error(
        "Not enough unique approved questions satisfy every grid allocation.",
      );
  }
  return slots.map((_, index) => selected.get(index)!);
}
