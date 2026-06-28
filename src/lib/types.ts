/**
 * 性别(由身份证第17位解析得出)
 */
export type Gender = 'male' | 'female';

/**
 * 退休职工类别 —— 对应三档不同的原退休年龄与延迟节奏
 */
export type WorkerCategory = 'male' | 'female_worker' | 'female_cadre';

/**
 * 年龄(以"年+月"表示,避免小数岁)
 */
export interface Age {
  years: number;
  months: number;
}

/**
 * 单个职工类别的退休计算结果
 */
export interface RetirementResult {
  /** 类别名称(中文,便于直接展示) */
  category: string;
  /** 原法定退休年龄(整岁) */
  originalRetireAge: number;
  /** 原法定退休日(出生日期 + 原退休年龄) */
  originalRetireDate: string; // YYYY-MM
  /** 实际退休日(已含延迟、且已封顶) */
  actualRetireDate: string; // YYYY-MM
  /** 实际退休年龄(年+月) */
  actualRetireAge: Age;
  /** 相对原退休年龄延迟的月数 */
  delayMonths: number;
}

/**
 * 身份证解析结果
 */
export interface IdCardInfo {
  raw: string;
  birthDate: string; // YYYY-MM-DD
  gender: Gender;
}
