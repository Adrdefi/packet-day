// Words a word search's random filler letters must never spell, in any of
// the 8 directions: profanity, slurs, and crude words, 3+ letters.
//
// Stored ROT13 so this public repo doesn't carry the list in plain text.
// To read or edit it, ROT13 each entry (A<->N, B<->O, ...). Keep entries
// uppercase A-Z only.

const ENCODED = `
NANY NAHF NEFR NFF ONFGNEQ OVGPU OBBO OBBOF OHGGUBYR PUVAX PBPX PBX PENC PHZ
PHAG QNZA QVPX QVX QVYQB QLXR SNT SNTTBG SPX SHP SHPX SHX TBBX URYY UBZB WVMM
XVXR XXX ANMV AVT AVTTN AVTTRE CRAVF CVFF CBEA CEVPX CHFFL ENCR ENCRQ ERGNEQ
FPEBGHZ FRK FRKL FUNG FUVG FUG FYHG FCVP GVG GVGF GVGGL GENAAL GHEQ GJNG
INTVAN JNAX JUBER JBC
`;

function rot13(s: string): string {
  return s.replace(/[A-Z]/g, (c) => String.fromCharCode(((c.charCodeAt(0) - 65 + 13) % 26) + 65));
}

export const FILLER_BLOCKLIST: readonly string[] = ENCODED.trim().split(/\s+/).map(rot13);
