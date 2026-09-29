function bidUnit(step: number) {
  const unit = Math.trunc(step)
  return unit > 0 ? unit : 1
}

function lowestBid(minimum: number, unit: number) {
  const floor = Math.max(0, Math.trunc(Number.isFinite(minimum) ? minimum : 0))
  return Math.ceil(floor / unit) * unit
}

/** 把手动输入收成最小单位的整数倍，并且不低于最低出价。75、步长 50 会收到 100。 */
export function alignBidAmount(value: number, minimum: number, step: number) {
  const unit = bidUnit(step)
  const lowest = lowestBid(minimum, unit)
  if (!Number.isFinite(value)) return lowest
  const snapped = Math.round(Math.trunc(value) / unit) * unit
  return Math.max(lowest, snapped)
}

export function isAlignedBid(value: number, minimum: number, step: number) {
  const unit = bidUnit(step)
  const lowest = lowestBid(minimum, unit)
  return Number.isInteger(value) && value >= lowest && value % unit === 0
}

/** 从当前值走到下一个或上一个合法出价。非法值先落到相邻档，而不是在 75 上再加 50。 */
export function stepBidAmount(value: number, minimum: number, step: number, direction: 1 | -1) {
  const unit = bidUnit(step)
  const lowest = lowestBid(minimum, unit)
  const base = Number.isFinite(value) ? Math.trunc(value) : lowest
  const moved = direction > 0
    ? Math.floor(base / unit) * unit + unit
    : Math.ceil(base / unit) * unit - unit
  return Math.max(lowest, moved)
}
