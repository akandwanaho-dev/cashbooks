/**
 * Money is converted to integer minor units for all calculations. This avoids
 * floating-point drift (for example, 0.1 + 0.2) in totals and running balances.
 */
export const toCents = (value: number | string) =>
  Math.round((typeof value === 'string' ? Number.parseFloat(value) : value) * 100)

export const fromCents = (value: number) => value / 100

export const sumMoney = (values: Array<number | string>) =>
  fromCents(values.reduce<number>((total, value) => total + toCents(value), 0))
