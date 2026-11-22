// Standard poker card faces drawn in code (DOM + CSS). Four-colour suits so each class reads
// at a glance: Spades black, Hearts red, Clubs green, Diamonds blue.
export const SUIT_SYMBOL = { S: '♠', H: '♥', C: '♣', D: '♦' };
export const SUIT_COLOR = { S: '#1d2433', H: '#d22f3b', C: '#1f8a4c', D: '#2f6fd6' };
export const RANK_LABEL = { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };
export const rankLabel = (r) => RANK_LABEL[r] ?? String(r);
export const cardName = (c) => `${rankLabel(c.rank)}${SUIT_SYMBOL[c.suit]}`;

// Standard pip spots (x%, y%) for 2-10.
const PIPS = {
  2: [[50, 14], [50, 86]],
  3: [[50, 14], [50, 50], [50, 86]],
  4: [[30, 14], [70, 14], [30, 86], [70, 86]],
  5: [[30, 14], [70, 14], [50, 50], [30, 86], [70, 86]],
  6: [[30, 14], [70, 14], [30, 50], [70, 50], [30, 86], [70, 86]],
  7: [[30, 14], [70, 14], [50, 32], [30, 50], [70, 50], [30, 86], [70, 86]],
  8: [[30, 14], [70, 14], [50, 32], [30, 50], [70, 50], [50, 68], [30, 86], [70, 86]],
  9: [[30, 14], [70, 14], [30, 38], [70, 38], [50, 50], [30, 62], [70, 62], [30, 86], [70, 86]],
  10: [[30, 14], [70, 14], [50, 26], [30, 38], [70, 38], [30, 62], [70, 62], [50, 74], [30, 86], [70, 86]],
};

export function cardElement(c, rarityName = null) {
  const el = document.createElement('div');
  el.className = `card suit-${c.suit}${c.rank >= 11 ? ' face' : ''}${rarityName ? ` rar-${rarityName}` : ''}`;
  el.dataset.id = c.id;
  el.style.setProperty('--suit', SUIT_COLOR[c.suit]);
  const r = rankLabel(c.rank);
  const s = SUIT_SYMBOL[c.suit];
  let middle;
  if (PIPS[c.rank]) middle = PIPS[c.rank].map(([x, y]) => `<i class="pip${y > 50 ? ' flip' : ''}" style="left:${x}%;top:${y}%">${s}</i>`).join('');
  else if (c.rank === 14) middle = `<i class="ace">${s}</i>`;
  else middle = `<b class="court"><span>${r}</span><em>${s}</em></b>`;
  el.innerHTML = `<span class="corner tl">${r}<br>${s}</span><span class="mid">${middle}</span><span class="big">${r}<small>${s}</small></span><span class="corner br">${r}<br>${s}</span>${c.bonus ? `<span class="bonus">+${c.bonus}</span>` : ''}`;
  return el;
}
