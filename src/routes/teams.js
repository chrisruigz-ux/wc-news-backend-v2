const express = require("express");
const router = express.Router();

const WORLD_CUP_TEAMS = [
  { group: "A", teams: ["美国", "加拿大", "墨西哥", "哥斯达黎加"] },
  { group: "B", teams: ["阿根廷", "巴西", "乌拉圭", "巴拉圭"] },
  { group: "C", teams: ["法国", "英格兰", "荷兰", "比利时"] },
  { group: "D", teams: ["德国", "西班牙", "葡萄牙", "意大利"] },
  { group: "E", teams: ["克罗地亚", "丹麦", "瑞士", "塞尔维亚"] },
  { group: "F", teams: ["日本", "韩国", "沙特", "伊朗"] },
  { group: "G", teams: ["摩洛哥", "塞内加尔", "尼日利亚", "喀麦隆"] },
  { group: "H", teams: ["澳大利亚", "新西兰", "厄瓜多尔", "哥伦比亚"] },
  { group: "I", teams: ["中国", "泰国", "越南", "印度尼西亚"] },
  { group: "J", teams: ["土耳其", "波兰", "乌克兰", "奥地利"] },
  { group: "K", teams: ["瑞典", "挪威", "苏格兰", "威尔士"] },
  { group: "L", teams: ["秘鲁", "智利", "埃及", "突尼斯"] },
];

router.get("/", (req, res) => {
  res.json({ groups: WORLD_CUP_TEAMS });
});

module.exports = router;
