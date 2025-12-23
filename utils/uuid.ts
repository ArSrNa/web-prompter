/**生成验证码 */
export function uuid() {
  const length = 6;
  return Math.random().toString(36).substring(2, 2 + length);
}
