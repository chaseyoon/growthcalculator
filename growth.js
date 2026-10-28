// LMS 기반 성장 계산 (2017 소아청소년 성장도표). 브라우저와 node 양쪽에서 쓴다.
// lms: { height: { M: [[L,M,S], ...월령순], F: [...] }, weight: {...}, bmi: {...} }, 인덱스 = 월령 - start

function zScore(y, [L, M, S]) {
  return L === 0 ? Math.log(y / M) / S : (Math.pow(y / M, L) - 1) / (L * S);
}

function valueAt(z, [L, M, S]) {
  return L === 0 ? M * Math.exp(S * z) : M * Math.pow(1 + L * S * z, 1 / L);
}

// 표준정규 누적분포. Abramowitz-Stegun 7.1.26 (오차 < 1.5e-7)
function normCdf(z) {
  const t = 1 / (1 + 0.3275911 * Math.abs(z) / Math.SQRT2);
  const poly = t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
  const erf = 1 - poly * Math.exp(-(z * z) / 2);
  return z >= 0 ? (1 + erf) / 2 : (1 - erf) / 2;
}

function ageInMonths(birth, measured) {
  let months = (measured.getFullYear() - birth.getFullYear()) * 12 + (measured.getMonth() - birth.getMonth());
  if (measured.getDate() < birth.getDate()) months -= 1;
  return months;
}

function lmsRow(lms, indicator, sex, month) {
  const table = lms[indicator] && lms[indicator][sex];
  if (!table) return null;
  return table.rows[month - table.start] || null;
}

function assess(lms, indicator, sex, month, value) {
  const row = lmsRow(lms, indicator, sex, month);
  if (!row || !(value > 0)) return null;
  const z = zScore(value, row);
  return { z, percentile: normCdf(z) * 100, median: row[1] };
}

// 현재 키 백분위가 성인(마지막 월령)까지 유지된다고 가정한 예상 성인키
function projectedAdultHeight(lms, sex, month, height) {
  const table = lms.height[sex];
  const r = assess(lms, "height", sex, month, height);
  if (!r) return null;
  return valueAt(r.z, table.rows[table.rows.length - 1]);
}

// 부모 키 중간값(MPH) 공식
function midParentalHeight(sex, father, mother) {
  return (father + mother + (sex === "M" ? 13 : -13)) / 2;
}

if (typeof module !== "undefined") {
  module.exports = { zScore, valueAt, normCdf, ageInMonths, assess, projectedAdultHeight, midParentalHeight };
}
