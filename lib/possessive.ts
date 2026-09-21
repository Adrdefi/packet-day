// Names ending in s or S take an apostrophe only ("Anders'"); everything
// else takes 's ("Zoe's").
export function possessive(name: string): string {
  return /s$/i.test(name) ? `${name}'` : `${name}'s`;
}
