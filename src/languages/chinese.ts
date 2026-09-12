import type { LanguagePack } from "./types.js";
import { validateEnglish } from "./shared.js";

const digits: Record<string, number> = {
  零: 0,
  〇: 0,
  一: 1,
  二: 2,
  两: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9,
};
function number(text: string): number {
  if (
    !/^(?:\d+|[一二两三四五六七八九]?十[一二三四五六七八九]?|[零〇一二两三四五六七八九]+)$/.test(
      text,
    )
  )
    return NaN;
  if (/^\d+$/.test(text)) return Number(text);
  if (text.includes("十")) {
    const [tens, ones] = text.split("十");
    return (tens ? digits[tens] : 1) * 10 + (ones ? digits[ones] : 0);
  }
  return Number([...text].map((char) => digits[char]).join(""));
}
const n = "[0-9零〇一二两三四五六七八九十]+";
const weekdays: Record<string, string> = {
  一: "monday",
  二: "tuesday",
  三: "wednesday",
  四: "thursday",
  五: "friday",
  六: "saturday",
  日: "sunday",
  天: "sunday",
};
const months = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

export const chinese: LanguagePack = {
  id: "zh-CN",
  name: "简体中文",
  dateOrder: "MDY",
  normalize(input) {
    let text = input.normalize("NFKC").trim();
    text = text.replace(
      /每(?:个)?月(?:的)?(第[一二三四五]|最后一)个?(?:星期|周)([一二三四五六日天])/g,
      (_, ordinal: string, day: string) => {
        const ordinals: Record<string, string> = {
          第一: "first",
          第二: "second",
          第三: "third",
          第四: "fourth",
          第五: "fifth",
          最后一: "last",
        };
        return ` the ${ordinals[ordinal]} ${weekdays[day]} of each month `;
      },
    );
    text = text.replace(/每隔一(?:周|个星期)/g, " every other week ");
    text = text.replace(
      /(下|本|这|每)?(?:星期|周)([一二三四五六日天])/g,
      (_, prefix: string, day: string) =>
        ` ${prefix === "下" ? "next" : prefix === "每" ? "every" : prefix ? "this" : ""} ${weekdays[day]} `,
    );
    text = text.replace(
      new RegExp(`(${n})年(${n})月(${n})[日号]`, "g"),
      (_, y, m, d) =>
        `${number(y)}-${String(number(m)).padStart(2, "0")}-${String(number(d)).padStart(2, "0")} `,
    );
    text = text.replace(new RegExp(`(${n})月(${n})[日号]`, "g"), (_, m, d) =>
      months[number(m) - 1]
        ? ` ${months[number(m) - 1]} ${number(d)} `
        : " INVALID ",
    );
    text = text.replace(
      new RegExp(
        `(上午|早上|凌晨|下午|晚上|中午)?\\s*(${n})[点时](半|一刻|三刻|(?:${n})分?)?`,
        "g",
      ),
      (_, period, h, tail) => {
        const hour = number(h);
        const minute =
          tail === "半"
            ? 30
            : tail === "一刻"
              ? 15
              : tail === "三刻"
                ? 45
                : tail
                  ? number(tail.replace(/分$/, ""))
                  : 0;
        if (
          !Number.isFinite(hour) ||
          !Number.isFinite(minute) ||
          hour > 23 ||
          minute > 59 ||
          (period && (hour < 1 || hour > 12))
        )
          return " INVALID ";
        if (hour === 12 && ["上午", "早上", "晚上"].includes(period))
          return " INVALID ";
        if (period === "中午" && hour === 11)
          return ` 11:${String(minute).padStart(2, "0")}am `;
        return ` ${hour}:${String(minute).padStart(2, "0")}${period ? (["上午", "早上", "凌晨"].includes(period) ? "am" : "pm") : ""} `;
      },
    );
    text = text.replace(/半个?小时/g, " half an hour ");
    text = text.replace(
      new RegExp(`(${n})(分钟|小时|天|周|个月|年)(后|前)?`, "g"),
      (_, amount, unit, direction) => {
        const units: Record<string, string> = {
          分钟: "minutes",
          小时: "hours",
          天: "days",
          周: "weeks",
          个月: "months",
          年: "years",
        };
        return ` ${direction === "后" ? "in " : ""}${number(amount)} ${units[unit]}${direction === "前" ? " before" : ""} `;
      },
    );
    const words: Record<string, string> = {
      后天: "in two days",
      今天: "today",
      明天: "tomorrow",
      昨天: "yesterday",
      今晚: "tonight",
      每天: "every day",
      每周: "every week",
      每月: "every month",
      每年: "every year",
      每个工作日: "every weekday",
      每个周末: "every weekend",
      中午: "noon",
      午夜: "midnight",
      从: "from",
      直到: "until",
      至: "to",
      到: "to",
      和: "and",
      持续: "for",
      在: "at",
      的: "",
    };
    text = text.replace(
      new RegExp(
        Object.keys(words)
          .sort((a, b) => b.length - a.length)
          .join("|"),
        "g",
      ),
      (word) => ` ${words[word]} `,
    );
    return validateEnglish(text.toLowerCase());
  },
};
