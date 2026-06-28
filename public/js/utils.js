// Error code to Chinese message mapping
const ERROR_MAP = {
  INVALID_REQUEST: '请填写正确的身份证号码',
  INVALID_LENGTH: '身份证号码必须是18位',
  INVALID_FORMAT: '身份证号码格式不正确，请输入数字和末位X',
  INVALID_BIRTHDATE: '身份证出生日期不合法',
  INVALID_CHECKSUM: '身份证号码校验失败，请检查',
  UNDER_AGE: '出生日期不能在未来',
};

export function getErrorMessage(code) {
  return ERROR_MAP[code] || '查询失败，请稍后重试';
}

// Format date from YYYY-MM-DD to YYYY年M月D日
export function formatDate(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  const y = parseInt(parts[0]);
  const m = parseInt(parts[1]);
  const d = parseInt(parts[2]);
  return `${y}年${m}月${d}日`;
}

// Format age from { years, months }
export function formatAge(age) {
  if (!age) return '';
  const parts = [];
  if (age.years > 0) parts.push(`${age.years}岁`);
  if (age.months > 0) parts.push(`${age.months}个月`);
  return parts.join('') || '0岁';
}

// Client-side ID card pre-validation
export function validateIdCard(id) {
  if (!id || id.length !== 18) {
    return { valid: false, message: '身份证号码必须是18位' };
  }
  if (!/^\d{17}[\dX]$/i.test(id)) {
    return { valid: false, message: '身份证号码格式不正确' };
  }
  return { valid: true };
}

// Detect gender from 17th digit: odd = male, even = female
export function detectGender(id) {
  if (!id || id.length < 17) return null;
  const digit = parseInt(id[16]);
  if (isNaN(digit)) return null;
  return digit % 2 === 1 ? 'male' : 'female';
}
