import type { Gender, IdCardInfo } from './types.js';

/**
 * 身份证(GB 11643-1999 18位)严格校验与解析
 */

/** 身份证错误类型,带细分错误码,便于上层返回精确的 API 错误 */
export class IdCardError extends Error {
  constructor(
    public readonly code: IdCardErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'IdCardError';
  }
}

export type IdCardErrorCode =
  | 'INVALID_LENGTH'
  | 'INVALID_FORMAT'
  | 'INVALID_BIRTHDATE'
  | 'INVALID_CHECKSUM'
  | 'UNDER_AGE';

/** 校验位权重(GB 11643-1999) */
const WEIGHTS = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];

/** sum mod 11 → 校验码查表 */
const CHECK_MAP = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2'];

/**
 * 解析并严格校验18位身份证号。
 * 任一环节不合法都抛出 IdCardError,带细分错误码。
 */
export function parseIdCard(raw: string): IdCardInfo {
  const id = (raw ?? '').trim().toUpperCase();

  // 1. 长度
  if (id.length !== 18) {
    throw new IdCardError('INVALID_LENGTH', '身份证号长度必须为18位');
  }

  // 2. 格式:前17位数字,末位数字或X
  if (!/^\d{17}[\dX]$/.test(id)) {
    throw new IdCardError('INVALID_FORMAT', '身份证号格式不正确(前17位须为数字,末位为数字或X)');
  }

  // 3. 出生日期合法性(第7-14位)
  const y = Number(id.slice(6, 10));
  const m = Number(id.slice(10, 12));
  const d = Number(id.slice(12, 14));
  if (!isValidDate(y, m, d)) {
    throw new IdCardError('INVALID_BIRTHDATE', '身份证出生日期不合法');
  }

  // 4. 出生日期不得在未来(避免明显伪造)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const birth = new Date(y, m - 1, d);
  if (birth > today) {
    throw new IdCardError('UNDER_AGE', '出生日期不能在未来');
  }

  // 5. 校验位
  const sum = id
    .slice(0, 17)
    .split('')
    .reduce((acc, ch, i) => acc + Number(ch) * WEIGHTS[i], 0);
  const expected = CHECK_MAP[sum % 11];
  if (id[17] !== expected) {
    throw new IdCardError('INVALID_CHECKSUM', '身份证校验位错误');
  }

  // 6. 性别(第17位奇数=男,偶数=女)
  const gender: Gender = Number(id[16]) % 2 === 1 ? 'male' : 'female';

  return {
    raw: id,
    birthDate: `${y}-${pad(m)}-${pad(d)}`,
    gender,
  };
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

/** 校验 y-m-d 是不是一个真实存在的公历日期(含闰年) */
function isValidDate(y: number, m: number, d: number): boolean {
  if (m < 1 || m > 12) return false;
  if (d < 1) return false;
  const daysInMonth = [31, isLeap(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return d <= daysInMonth[m - 1];
}

function isLeap(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}
