import type { Gender, RetirementResult, Age } from './types.js';

/**
 * 退休时间计算 —— 渐进式延迟法定退休年龄(2025-01-01 起,15年过渡期)
 *
 * 政策分三档:
 *   男职工   60 → 63,每4个月延迟1月
 *   女干部   55 → 58,每4个月延迟1月
 *   女工人   50 → 55,每2个月延迟1月
 */

/** 政策起始日 */
export const POLICY_START = '2025-01-01';

/** 职工类别参数:原退休年龄、延迟节奏(几月一档)、最终退休年龄 */
export interface CategoryParams {
  baseAge: number;
  /** 每隔多少个公历月(按原退休日计)延迟 1 个月 */
  stepMonths: number;
  finalAge: number;
  category: string;
}

export const CATEGORIES = {
  male: { baseAge: 60, stepMonths: 4, finalAge: 63, category: '男职工(原60周岁)' },
  female_cadre: { baseAge: 55, stepMonths: 4, finalAge: 58, category: '女干部(原55周岁)' },
  female_worker: { baseAge: 50, stepMonths: 2, finalAge: 55, category: '女工人(原50周岁)' },
} satisfies Record<string, CategoryParams>;

/** 政策起始的年/月(用于月差计算) */
const POLICY_YEAR = 2025;
const POLICY_MONTH = 1; // 1月

/**
 * 核心:计算某出生日期、某类别下的实际退休时间。
 *
 * 步骤:
 *  1. 原退休日 = 出生日期 + baseAge 年(整岁)
 *  2. 若原退休日早于政策起始 → 不延迟
 *  3. 否则按"原退休日相对政策起始的月差"分档,每 stepMonths 一档延迟1月
 *  4. 实际退休日 = 出生日期 + (baseAge*12 + delay) 月
 *  5. 封顶:实际退休日不得超过 出生日期 + finalAge 年(达上限)
 */
export function computeRetirement(
  birthDate: string, // YYYY-MM-DD
  params: CategoryParams,
): RetirementResult {
  const { baseAge, stepMonths, finalAge, category } = params;
  const [by, bm] = parseYearMonth(birthDate);

  // 1. 原始退休日(整岁,月份与出生月相同)
  const originalRetireDate = addYears(by, bm, baseAge);

  // 2. 政策前到龄 → 不延迟
  if (compareYM(originalRetireDate, { y: POLICY_YEAR, m: POLICY_MONTH }) < 0) {
    return {
      category,
      originalRetireAge: baseAge,
      originalRetireDate: formatDate(originalRetireDate),
      actualRetireDate: formatDate(originalRetireDate),
      actualRetireAge: { years: baseAge, months: 0 },
      delayMonths: 0,
    };
  }

  // 3. 计算档位
  const monthsAfter =
    (originalRetireDate.y - POLICY_YEAR) * 12 + (originalRetireDate.m - POLICY_MONTH);
  const tier = Math.floor(monthsAfter / stepMonths) + 1;
  let delayMonths = tier;

  // 4. 实际退休月 = 出生日期 + (baseAge*12 + delay) 月
  let actual = addMonths(by, bm, baseAge * 12 + delayMonths);

  // 5. 封顶:出生 + finalAge 年
  const cap = addYears(by, bm, finalAge);
  if (compareYM(actual, cap) > 0) {
    actual = cap;
    delayMonths = (finalAge - baseAge) * 12;
  }

  const actualAge: Age = {
    years: Math.floor((baseAge * 12 + delayMonths) / 12),
    months: (baseAge * 12 + delayMonths) % 12,
  };

  return {
    category,
    originalRetireAge: baseAge,
    originalRetireDate: formatDate(originalRetireDate),
    actualRetireDate: formatDate(actual),
    actualRetireAge: actualAge,
    delayMonths,
  };
}

/**
 * 按性别计算:男性只算男职工;女性按 cadre 决定女工人(默认)或女干部。
 *
 * @param gender 性别
 * @param birthDate 出生日期 YYYY-MM-DD
 * @param cadre 女性:true=女干部(55),false=女工人(50);对男性无影响
 */
export function computeByGender(
  gender: Gender,
  birthDate: string,
  cadre: boolean = false,
): RetirementResult[] {
  if (gender === 'male') {
    return [computeRetirement(birthDate, CATEGORIES.male)];
  }
  const params = cadre ? CATEGORIES.female_cadre : CATEGORIES.female_worker;
  return [computeRetirement(birthDate, params)];
}

// ---------- 日期工具(基于"年-月"的纯算术,无时区/天数歧义) ----------

interface YearMonth {
  y: number;
  m: number; // 1-12
}

function parseYearMonth(dateStr: string): [number, number] {
  const [y, m] = dateStr.split('-').map(Number);
  return [y, m];
}

/** 加 n 年,保持月份不变(生日同月) */
function addYears(y: number, m: number, n: number): YearMonth {
  return { y: y + n, m };
}

/** 加 n 个月,自动进位年 */
function addMonths(y: number, m: number, n: number): YearMonth {
  const total = (y * 12 + (m - 1)) + n;
  return { y: Math.floor(total / 12), m: (total % 12) + 1 };
}

/** 比较两个年月:-1 / 0 / 1 */
function compareYM(a: YearMonth, b: YearMonth): number {
  if (a.y !== b.y) return a.y < b.y ? -1 : 1;
  if (a.m !== b.m) return a.m < b.m ? -1 : 1;
  return 0;
}

/** 年月 → YYYY-MM-DD(退休日统一取该月1日,因延迟以"月"为粒度) */
function formatDate(ym: YearMonth): string {
  return `${ym.y}-${pad(ym.m)}-01`;
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}
