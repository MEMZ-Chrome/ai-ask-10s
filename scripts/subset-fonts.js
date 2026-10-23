// 把 public/fonts 里的微软雅黑裁剪成"只保留本项目用到的字"的小体积 woff2。
// 用法：node scripts/subset-fonts.js
// 需要先临时安装：npm i --no-save subset-font@2
const fs = require("fs");
const path = require("path");
const subsetFont = require("subset-font");

const ROOT = path.join(__dirname, "..");
const SRC = path.join(ROOT, "public", "fonts");
const OUT = path.join(ROOT, "public", "fonts", "web");

/** 收集 src 下所有 .tsx/.ts 文件里的可见字符（宁多勿少）。 */
const collectText = (dir, acc) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectText(full, acc);
    } else if (/\.(tsx?|md)$/.test(entry.name)) {
      acc.push(fs.readFileSync(full, "utf8"));
    }
  }
  return acc;
};

const sources = collectText(path.join(ROOT, "src"), []);
sources.push(fs.readFileSync(path.join(ROOT, "README.md"), "utf8"));

// 常用标点、数字、英文和符号都算进去。
const extra =
  "，。、；：？！…—·（）《》【】「」『』“”‘’—-~～·¥%＃#@&*+=<>/\\|_^`[]{}()0123456789" +
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ" +
  "αβγδεζηθικλμνξοπρστυφχψωΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ" +
  "×÷±≤≥≠≈√∞∑∫√∴∵①②③④⑤⑥⑦⑧⑨⑩←↑→↓↔↕✓✔✕✗★☆●○◆◇■□▲△▼▽※℃§¶†‡•‥";

const chars = new Set(extra.split(""));
for (const text of sources) {
  for (const ch of text) {
    const code = ch.codePointAt(0);
    // 只收 printable，去掉控制字符
    if (code >= 0x20 && code !== 0x7f) {
      chars.add(ch);
    }
  }
}
const text = Array.from(chars).sort().join("");

fs.mkdirSync(OUT, { recursive: true });

const jobs = [
  ["MicrosoftYaHei-Regular.ttf", "MicrosoftYaHei-Regular.woff2"],
  ["MicrosoftYaHei-Bold.ttf", "MicrosoftYaHei-Bold.woff2"],
];

(async () => {
  for (const [input, output] of jobs) {
    const buffer = fs.readFileSync(path.join(SRC, input));
    const woff2 = await subsetFont(buffer, text, { targetFormat: "woff2" });
    fs.writeFileSync(path.join(OUT, output), woff2);
    console.log(
      `${output}: ${(woff2.length / 1024).toFixed(0)} KB (from ${(buffer.length / 1024 / 1024).toFixed(1)} MB, ${chars.size} glyphs requested)`,
    );
  }
})();
