import path from "node:path";
import { mkdir } from "node:fs/promises";
import sharp from "sharp";

const root = process.cwd();
const source = path.join(root, "运营/素材/产品截图/landing-desktop.png");
const outputDir = path.join(root, "运营/素材/小红书/01-看房记录");

const width = 1242;
const height = 1656;
const colors = {
  paper: "#fffaf9",
  white: "#ffffff",
  ink: "#241f20",
  muted: "#71696b",
  coral: "#f14564",
  coralSoft: "#ffe8ed",
  mint: "#dff4ec",
  mintInk: "#17654f",
  line: "#eadfe1",
};

const escapeXml = (value) =>
  value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

const text = ({ x, y, size, value, color = colors.ink, weight = 600, anchor = "start" }) =>
  `<text x="${x}" y="${y}" fill="${color}" font-family="PingFang SC, Hiragino Sans GB, Microsoft YaHei, sans-serif" font-size="${size}" font-weight="${weight}" text-anchor="${anchor}" letter-spacing="0">${escapeXml(value)}</text>`;

const multiline = ({ x, y, size, lines, color = colors.ink, weight = 600, gap = 1.28, anchor = "start" }) =>
  lines
    .map((line, index) =>
      text({ x, y: y + index * size * gap, size, value: line, color, weight, anchor }),
    )
    .join("");

const svg = (body, background = colors.paper) =>
  Buffer.from(
    `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg"><rect width="${width}" height="${height}" fill="${background}"/>${body}</svg>`,
  );

const screenshotCrop = async ({ top, height: cropHeight, targetWidth = 1082 }) => {
  const buffer = await sharp(source)
    .extract({ left: 96, top, width: 1242, height: cropHeight })
    .resize({ width: targetWidth })
    .png()
    .toBuffer();

  return buffer;
};

const writeSlide = async (name, layers) => {
  await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: colors.paper,
    },
  })
    .composite(layers)
    .png({ compressionLevel: 9 })
    .toFile(path.join(outputDir, name));
};

await mkdir(outputDir, { recursive: true });

const demoCrop = await screenshotCrop({ top: 1260, height: 780 });
const painCrop = await screenshotCrop({ top: 690, height: 540 });
const featureCrop = await screenshotCrop({ top: 1970, height: 600 });

await writeSlide("01-cover.png", [
  {
    input: svg(
      `<rect x="80" y="80" width="276" height="58" rx="8" fill="${colors.coralSoft}"/>` +
        text({ x: 218, y: 120, size: 28, value: "真实找房记录", color: colors.coral, weight: 700, anchor: "middle" }) +
        multiline({ x: 80, y: 280, size: 82, lines: ["看了 30 套房后，", "我终于不用", "靠脑子记了"], weight: 800, gap: 1.22 }) +
        text({ x: 82, y: 640, size: 34, value: "价格、面积、通勤、现场感受，放进同一张表", color: colors.muted, weight: 500 }) +
        `<rect x="80" y="730" width="1082" height="800" rx="8" fill="${colors.white}" stroke="${colors.line}" stroke-width="2"/>` +
        `<rect x="80" y="1470" width="1082" height="60" fill="${colors.coral}"/>` +
        text({ x: 621, y: 1511, size: 27, value: "寻家 Find Home · 真实产品截图", color: colors.white, weight: 700, anchor: "middle" }),
    ),
  },
  { input: demoCrop, left: 80, top: 730 },
]);

await writeSlide("02-why.png", [
  {
    input: svg(
      text({ x: 80, y: 126, size: 30, value: "01 / 为什么做这个工具", color: colors.coral, weight: 700 }) +
        multiline({ x: 80, y: 260, size: 68, lines: ["真正折磨人的，", "不是看房本身"], weight: 800 }) +
        text({ x: 80, y: 465, size: 38, value: "而是看完之后，所有信息都混在一起", color: colors.muted, weight: 500 }) +
        `<rect x="80" y="560" width="1082" height="520" rx="8" fill="${colors.white}" stroke="${colors.line}" stroke-width="2"/>` +
        `<rect x="80" y="1140" width="1082" height="330" rx="8" fill="${colors.mint}"/>` +
        multiline({ x: 130, y: 1235, size: 42, lines: ["上周那套朝南还是朝西？", "中介说的缺点记在哪里？", "5 套候选到底差多少钱？"], color: colors.mintInk, weight: 650, gap: 1.55 }) +
        text({ x: 80, y: 1560, size: 31, value: "所以我把找房过程做成了一份可以持续更新的档案。", color: colors.ink, weight: 600 }),
    ),
  },
  { input: painCrop, left: 80, top: 560 },
]);

await writeSlide("03-workflow.png", [
  {
    input: svg(
      text({ x: 80, y: 126, size: 30, value: "02 / 我的使用方法", color: colors.coral, weight: 700 }) +
        multiline({ x: 80, y: 260, size: 68, lines: ["看完一套，", "立刻补全 5 类信息"], weight: 800 }) +
        `<line x1="135" y1="530" x2="135" y2="1260" stroke="${colors.line}" stroke-width="8"/>` +
        [
          ["1", "基本信息", "总价、面积、户型、楼层"],
          ["2", "位置成本", "地铁、通勤、周边配套"],
          ["3", "现场感受", "采光、噪音、异味、装修"],
          ["4", "谈价线索", "急售、税费、房东预期"],
          ["5", "照片和备注", "把当时的判断留下来"],
        ]
          .map(([number, title, detail], index) => {
            const cy = 570 + index * 170;
            return (
              `<circle cx="135" cy="${cy}" r="44" fill="${index === 4 ? colors.coral : colors.white}" stroke="${colors.coral}" stroke-width="4"/>` +
              text({ x: 135, y: cy + 14, size: 38, value: number, color: index === 4 ? colors.white : colors.coral, weight: 800, anchor: "middle" }) +
              text({ x: 230, y: cy - 5, size: 42, value: title, weight: 750 }) +
              text({ x: 230, y: cy + 51, size: 31, value: detail, color: colors.muted, weight: 500 })
            );
          })
          .join("") +
        `<rect x="80" y="1430" width="1082" height="120" rx="8" fill="${colors.coralSoft}"/>` +
        text({ x: 621, y: 1507, size: 35, value: "重点不是记得多，而是之后还能比较", color: colors.coral, weight: 750, anchor: "middle" }),
    ),
  },
]);

await writeSlide("04-compare.png", [
  {
    input: svg(
      text({ x: 80, y: 126, size: 30, value: "03 / 最有用的一步", color: colors.coral, weight: 700 }) +
        multiline({ x: 80, y: 260, size: 68, lines: ["候选超过 3 套，", "就不要再靠印象选"], weight: 800 }) +
        text({ x: 80, y: 465, size: 36, value: "勾选 2-3 套，预算、面积和通勤差异直接摊开", color: colors.muted, weight: 500 }) +
        `<rect x="80" y="560" width="1082" height="850" rx="8" fill="${colors.white}" stroke="${colors.line}" stroke-width="2"/>` +
        `<rect x="80" y="1470" width="1082" height="100" rx="8" fill="${colors.mint}"/>` +
        text({ x: 621, y: 1535, size: 32, value: "选择变清楚，不代表替你做决定", color: colors.mintInk, weight: 700, anchor: "middle" }),
    ),
  },
  { input: demoCrop, left: 80, top: 560 },
]);

await writeSlide("05-cta.png", [
  {
    input: svg(
      `<rect x="0" y="0" width="1242" height="300" fill="${colors.ink}"/>` +
        text({ x: 80, y: 120, size: 30, value: "寻家 Find Home", color: colors.coral, weight: 750 }) +
        multiline({ x: 80, y: 220, size: 66, lines: ["把候选房放进", "同一张表里"], color: colors.white, weight: 800 }) +
        `<rect x="80" y="390" width="1082" height="600" rx="8" fill="${colors.white}" stroke="${colors.line}" stroke-width="2"/>` +
        `<rect x="80" y="1060" width="1082" height="310" rx="8" fill="${colors.coralSoft}"/>` +
        text({ x: 130, y: 1155, size: 36, value: "适合正在：", color: colors.coral, weight: 750 }) +
        multiline({ x: 130, y: 1235, size: 35, lines: ["· 买房时集中对比候选房", "· 租房时记录通勤和现场感受", "· 和伴侣或家人统一决策依据"], weight: 600, gap: 1.5 }) +
        text({ x: 621, y: 1505, size: 44, value: "免费体验：findhome.xiaoboan.top", color: colors.ink, weight: 800, anchor: "middle" }) +
        text({ x: 621, y: 1575, size: 29, value: "先录入 3 套房，再做一次对比", color: colors.muted, weight: 500, anchor: "middle" }),
    ),
  },
  { input: featureCrop, left: 80, top: 390 },
]);

const previewFiles = ["01-cover.png", "02-why.png", "03-workflow.png", "04-compare.png", "05-cta.png"];
const previewLayers = await Promise.all(
  previewFiles.map(async (file, index) => ({
    input: await sharp(path.join(outputDir, file)).resize({ width: 248 }).png().toBuffer(),
    left: index * 258,
    top: 0,
  })),
);

await sharp({
  create: {
    width: 1280,
    height: 331,
    channels: 4,
    background: colors.white,
  },
})
  .composite(previewLayers)
  .png()
  .toFile(path.join(outputDir, "preview.png"));

console.log(`Generated 5 assets in ${outputDir}`);
