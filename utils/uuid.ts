/**生成验证码 */
export function uuid() {
  return new Array(6)
    .fill(0)
    .map(() => Math.floor(Math.random() * 10))
    .join("");
}
