import { useEffect } from "react";
import {
  cancelRender,
  continueRender,
  delayRender,
  staticFile,
} from "remotion";

export const FONT_FAMILY =
  '"Microsoft YaHei", "微软雅黑", system-ui, sans-serif';

/** public/fonts 里的两个字重（在 @font-face 作用域里统一叫 "Microsoft YaHei"）。 */
const FONT_SOURCES: readonly {
  readonly url: string;
  readonly weight: string;
}[] = [
  // 优先用裁剪后的小体积 woff2（只含片中用到的字，见 scripts/subset-fonts.js）。
  { url: staticFile("fonts/web/MicrosoftYaHei-Regular.woff2"), weight: "400" },
  { url: staticFile("fonts/web/MicrosoftYaHei-Bold.woff2"), weight: "700" },
];


/**
 * Microsoft YaHei 在 Windows 上是一个 TTC；public/fonts 里已经抽成普通 TTF，
 * 这样 Studio 预览和无头渲染用的是同一套中文字形。
 *
 * 模块级状态保证：不管多少场景调用 useFonts()（StrictMode 也会把 effect 跑两次），
 * 字体只加载一次、delayRender 的 handle 只 continueRender 一次。
 */
let started = false;
/** 正在进行中的加载 promise；后续调用等它结束即可。 */
let loading: Promise<void> | null = null;
/** delayRender handle；-1 表示还没有申请。 */
let handle = -1;
/** 已经 continueRender 过，绝不再调用第二次。 */
let settled = false;

const settle = (): void => {
  if (settled || handle < 0) {
    return;
  }
  settled = true;
  continueRender(handle);
};

const loadFaces = async (): Promise<void> => {
  if (typeof document === "undefined" || typeof FontFace === "undefined") {
    return;
  }

  await Promise.all(
    FONT_SOURCES.map(async ({ url, weight }) => {
      // 已经注册过就跳过（HMR 重跑时不会重复注册）。
      const existing = Array.from(document.fonts).some(
        (face) =>
          face.family.replace(/["']/g, "") === "Microsoft YaHei" &&
          face.weight === weight,
      );
      if (existing) {
        return;
      }
      const face = new FontFace("Microsoft YaHei", `url(${url})`, {
        weight,
        style: "normal",
      });
      const loaded = await face.load();
      document.fonts.add(loaded);
    }),
  );

  // 等样式重算，避免第一帧用到 fallback 字形。
  await document.fonts.ready;
};

/**
 * 所有字号都用 FONT_FAMILY 的场景组件调用一次即可。第一次调用申请 delayRender
 * 并开始加载；之后的调用直接返回（在 StrictMode 的双重 effect 下也安全）。
 */
export const useFonts = (): void => {
  useEffect(() => {
    if (started || typeof document === "undefined") {
      return;
    }
    started = true;
    handle = delayRender("Loading Microsoft YaHei (微软雅黑)");
    loading = loadFaces();
    loading
      .catch((err: unknown) => {
        // 字体加载失败不应该让整个视频报错：记录一次，继续渲染（会退回到系统雅黑）。
        // 链尾已经有 catch，不会留下未处理的 rejection。
        console.warn(
          "[font] Microsoft YaHei 加载失败，使用系统字体回退。",
          err,
        );
      })
      .then(() => {
        settle();
      });
  }, []);
};

/**
 * 给需要"先等字体再量尺寸"的地方用：返回一个会在字体就绪后 resolve 的 promise。
 * 如果加载失败也会 resolve，不会产生未处理的 rejection。
 */
export const fontsReady = (): Promise<void> => {
  if (loading) {
    return loading.catch(() => undefined);
  }
  if (typeof document === "undefined") {
    return Promise.resolve();
  }
  return document.fonts.ready.then(() => undefined);
};

/** 极端情况下（比如字体文件缺失导致永远卡住）主动取消，交给上层处理。 */
export const abortFonts = (reason: string): void => {
  if (settled || handle < 0) {
    return;
  }
  settled = true;
  cancelRender(new Error(reason));
};
