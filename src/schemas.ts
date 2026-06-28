import { z } from 'zod';

/**
 * 查询参数 schema:
 *  - idCard:必传,18 位(末位允许 X)
 *  - cadre :可选,仅对女性生效。1=女干部,0或不传=女工人
 *
 * 详细业务校验(日期、校验位)交给 lib/idCard,这里只做基础形状校验。
 */
export const retirementCalculateSchema = z.object({
  birthDate: z
    .string()
    .trim()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, '出生年月格式不正确(应为YYYY-MM)'),
  gender: z.enum(['male', 'female'], { message: '性别必须为 male 或 female' }),
  cadre: z
    .enum(['0', '1'])
    .optional()
    .transform((v) => (v === '1' ? true : false)),
});

export const retirementQuerySchema = z.object({
  idCard: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^\d{17}[\dX]$/, '身份证号格式不正确(应为18位,末位可为X)'),
  cadre: z
    .enum(['0', '1'])
    .optional()
    // 形如 &cadre= 的空值也归为不传
    .transform((v) => (v === '1' ? true : false)),
});
