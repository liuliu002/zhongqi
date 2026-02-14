document.addEventListener("DOMContentLoaded", () => {
  const imageBase = "https://www.ifjournals.com/file";
  const pageSizes = { SCI: 20, EI: 10, AHCI: 10 };
  const dataFiles = {
    SCI: "assets/data/sci.json",
    EI: "assets/data/ei.json",
    AHCI: "assets/data/ahci.json",
  };
  const dataCache = {
    SCI: null,
    EI: null,
    AHCI: null,
  };
  const metaCache = {
    SCI: "",
    EI: "",
    AHCI: "",
  };

  const dbSelect = document.getElementById("dbSelect");
  const searchInput = document.getElementById("searchInput");
  const searchButton = document.getElementById("searchButton");
  const resetButton = document.getElementById("resetButton");
  const subjectSelect = document.getElementById("subjectSelect");
  const ahciSubjectSelect = document.getElementById("ahciSubjectSelect");
  const results = document.getElementById("results");
  const resultCount = document.getElementById("resultCount");
  const resultStatus = document.getElementById("resultStatus");
  const pagination = document.getElementById("pagination");
  const filterScopes = Array.from(document.querySelectorAll(".search-filters"));
  const sortButtons = Array.from(document.querySelectorAll(".sort-chip"));
  const detailModal = document.getElementById("detailModal");
  const detailCover = document.getElementById("detailCover");
  const detailTitle = document.getElementById("detailTitle");
  const detailSubtitle = document.getElementById("detailSubtitle");
  const detailTags = document.getElementById("detailTags");
  const detailBody = document.getElementById("detailBody");

  let pageItemsCache = [];

  const state = {
    db: "SCI",
    query: "",
    category: "全部",
    impact: "全部",
    selfCitation: "全部",
    partition: "全部",
    top: "全部",
    subject: "全部",
    order: "",
    eiType: "全部",
    ahciSubject: "全部",
    page: 1,
  };

  const escapeHtml = (value) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const normalizeText = (value) => String(value ?? "").toLowerCase();

  const parseNumber = (value) => {
    const text = String(value ?? "").replace(/,/g, "").trim();
    const number = Number.parseFloat(text);
    return Number.isFinite(number) ? number : Number.NaN;
  };

  const parsePercent = (value) => {
    const text = String(value ?? "").replace("%", "");
    return parseNumber(text);
  };

  const setActiveChip = (group, value) => {
    if (!group) {
      return;
    }
    group.querySelectorAll(".filter-chip").forEach((chip) => {
      chip.classList.toggle("is-active", chip.dataset.value === value);
    });
  };

  const resetFilters = (preserveQuery) => {
    state.category = "全部";
    state.impact = "全部";
    state.selfCitation = "全部";
    state.partition = "全部";
    state.top = "全部";
    state.subject = "全部";
    state.order = "";
    state.eiType = "全部";
    state.ahciSubject = "全部";
    state.page = 1;
    if (!preserveQuery) {
      state.query = "";
      searchInput.value = "";
    }

    setActiveChip(document.querySelector('[data-filter="category"]'), state.category);
    setActiveChip(document.querySelector('[data-filter="impact"]'), state.impact);
    setActiveChip(document.querySelector('[data-filter="selfCitation"]'), state.selfCitation);
    setActiveChip(document.querySelector('[data-filter="partition"]'), state.partition);
    setActiveChip(document.querySelector('[data-filter="top"]'), state.top);
    setActiveChip(document.querySelector('[data-filter="eiType"]'), state.eiType);

    if (subjectSelect) {
      subjectSelect.value = state.subject;
    }
    if (ahciSubjectSelect) {
      ahciSubjectSelect.value = state.ahciSubject;
    }

    updateSortUI();
  };

  const updateSortUI = () => {
    sortButtons.forEach((button) => {
      button.classList.remove("is-active");
      button.removeAttribute("data-dir");
      button.removeAttribute("data-dir-symbol");
    });

    if (!state.order) {
      return;
    }
    const [field, direction] = state.order.split("|");
    const activeButton = sortButtons.find((button) => button.dataset.sort === field);
    if (!activeButton) {
      return;
    }
    const dir = direction === "down" ? "down" : "up";
    activeButton.classList.add("is-active");
    activeButton.dataset.dir = dir;
    activeButton.dataset.dirSymbol = dir === "up" ? "^" : "v";
  };

  const showScope = (scope) => {
    filterScopes.forEach((panel) => {
      const isMatch = panel.dataset.scope === scope;
      panel.classList.toggle("is-hidden", !isMatch);
    });
    const sortSection = document.querySelector(".search-sort");
    if (sortSection) {
      sortSection.style.display = scope === "SCI" ? "flex" : "none";
    }
  };

  const buildCover = (title, imageName) => {
    if (!imageName) {
      return '<div class="result-cover is-empty">暂无封面</div>';
    }
    const safeTitle = escapeHtml(title);
    return `<div class="result-cover"><img src="${imageBase}/${imageName}" alt="${safeTitle}" loading="lazy"></div>`;
  };

  const buildTag = (label, isAlert) => {
    if (!label) {
      return "";
    }
    return `<span class="result-tag${isAlert ? " is-alert" : ""}">${escapeHtml(label)}</span>`;
  };

  const isEmptyValue = (value) =>
    value === null || value === undefined || value === "" || value === "-";

  const buildDetailRow = (label, value, options = {}) => {
    if (isEmptyValue(value)) {
      return "";
    }
    const classes = options.wide ? "detail-row is-wide" : "detail-row";
    let content = escapeHtml(value);
    if (options.link) {
      const safeUrl = escapeHtml(value);
      content = `<a href="${safeUrl}" target="_blank" rel="noopener">${safeUrl}</a>`;
    }
    return `<div class="${classes}"><strong>${escapeHtml(label)}</strong><span>${content}</span></div>`;
  };

  const setDetailCover = (title, imageName) => {
    if (!detailCover) {
      return;
    }
    if (!imageName) {
      detailCover.classList.add("is-empty");
      detailCover.textContent = "暂无封面";
      return;
    }
    detailCover.classList.remove("is-empty");
    detailCover.innerHTML = `<img src="${imageBase}/${imageName}" alt="${escapeHtml(title)}" loading="lazy">`;
  };

  const openDetail = (item) => {
    if (!detailModal || !detailTitle || !detailBody || !detailTags || !detailSubtitle) {
      return;
    }
    const isSci = state.db === "SCI";
    const isEi = state.db === "EI";
    const title = isSci ? item.periodicalsName : isEi ? item.sourceTitle : item.journalTitle;
    const subtitle = item.chineseTitle || (isSci ? item.esiSubject : isEi ? item.subjectOne : item.webOfScience) || "";
    detailTitle.textContent = title || "-";
    detailSubtitle.textContent = subtitle;
    detailSubtitle.style.display = subtitle ? "block" : "none";

    if (isSci) {
      const tags = Array.isArray(item.sciList) && item.sciList.length ? item.sciList : [item.searchDatabase].filter(Boolean);
      const topTag = item.topA === "是" || item.topB === "是" ? "TOP" : "";
      const removed = item.includeI && item.includeI !== "是" && item.includeI !== "-" ? "已被踢库" : "";
      detailTags.innerHTML = [
        ...tags.map((tag) => buildTag(tag, false)),
        buildTag(topTag, false),
        buildTag(removed, true),
      ].join("");
      const impact = item.impactA && item.impactB ? `${item.impactA}-${item.impactB}` : item.impactFactorsE || item.impactFactorsA || item.impactFactorsB;
      detailBody.innerHTML = [
        buildDetailRow("中文刊名", item.chineseTitle),
        buildDetailRow("期刊缩写", item.abbreviation),
        buildDetailRow("ISSN", item.issn),
        buildDetailRow("e-ISSN", item.eIssn),
        buildDetailRow("收录库", item.searchDatabase),
        buildDetailRow("影响指数", impact),
        buildDetailRow("自引率", item.selfCitationRate),
        buildDetailRow("国内分区", item.bigPartitionB),
        buildDetailRow("JCR分区", item.jcrPartition, { wide: true }),
        buildDetailRow("ESI学科", item.esiSubject),
        buildDetailRow("年发文量", item.yearNum),
        buildDetailRow("国人占比", item.chinaProportion),
        buildDetailRow("H指数", item.hindex),
        buildDetailRow("出版社", item.publisher),
        buildDetailRow("国家地区", item.differentCountries),
        buildDetailRow("OA", item.isOa),
        buildDetailRow("收录状态", item.includeI),
        buildDetailRow("风险提示", item.warningW),
        buildDetailRow("投稿官网", item.contributionConnect, { wide: true, link: true }),
      ].filter(Boolean).join("");
      setDetailCover(title, item.picture);
    } else if (isEi) {
      const removed = item.isDatabase && item.isDatabase !== "是" && item.isDatabase !== "-" ? "已被踢库" : "";
      detailTags.innerHTML = [
        buildTag(item.sourceType || "EI", false),
        buildTag(removed, true),
      ].join("");
      detailBody.innerHTML = [
        buildDetailRow("中文刊名", item.chineseTitle),
        buildDetailRow("类型", item.sourceType),
        buildDetailRow("ISSN", item.eiIssn),
        buildDetailRow("e-ISSN", item.eiEissn),
        buildDetailRow("学科一", item.subjectOne),
        buildDetailRow("学科二", item.subjectTwo),
        buildDetailRow("学科三", item.subjectThree),
        buildDetailRow("出版社", item.publisher),
        buildDetailRow("国家地区", item.countryRegion),
        buildDetailRow("收录状态", item.isDatabase),
        buildDetailRow("期刊官网", item.eiWeb, { wide: true, link: true }),
      ].filter(Boolean).join("");
      setDetailCover(title, item.fieleA);
    } else {
      const topTag = item.top === "是" ? "TOP" : "";
      const removed = item.isDatabase && item.isDatabase !== "是" && item.isDatabase !== "-" ? "已被踢库" : "";
      detailTags.innerHTML = [
        buildTag("A&HCI", false),
        buildTag(topTag, false),
        buildTag(removed, true),
      ].join("");
      detailBody.innerHTML = [
        buildDetailRow("中文刊名", item.chineseTitle),
        buildDetailRow("ISSN", item.ahciIssn),
        buildDetailRow("e-ISSN", item.ahciEissn),
        buildDetailRow("学科", item.webOfScience),
        buildDetailRow("国内分区", item.fenqu),
        buildDetailRow("语言", item.ahciLanguages),
        buildDetailRow("年发文量", item.yearNum),
        buildDetailRow("影响指数", item.impactIndex),
        buildDetailRow("JCI", item.ahciJci),
        buildDetailRow("出版社", item.publisher),
        buildDetailRow("收录状态", item.isDatabase),
        buildDetailRow("期刊官网", item.eiWeb, { wide: true, link: true }),
      ].filter(Boolean).join("");
      setDetailCover(title, item.fieleA);
    }

    detailModal.classList.add("is-open");
    detailModal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  };

  const closeDetail = () => {
    if (!detailModal) {
      return;
    }
    detailModal.classList.remove("is-open");
    detailModal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  };

  const buildSciCard = (item, index) => {
    const title = item.periodicalsName || "-";
    const impact = item.impactA && item.impactB ? `${item.impactA}-${item.impactB}` : item.impactFactorsE || "-";
    const tags = Array.isArray(item.sciList) && item.sciList.length ? item.sciList : [item.searchDatabase].filter(Boolean);
    const topTag = item.topA === "是" || item.topB === "是" ? "TOP" : "";
    const removed = item.includeI && item.includeI !== "是" && item.includeI !== "-" ? "已被踢库" : "";

    return `
      <article class="card result-card">
        ${buildCover(title, item.picture)}
        <div>
          <div class="result-tags">
            ${tags.map((tag) => buildTag(tag, false)).join("")}
            ${buildTag(topTag, false)}
            ${buildTag(removed, true)}
          </div>
          <div class="result-title">${escapeHtml(title)}</div>
          <div class="result-meta">
            <span>ISSN：${escapeHtml(item.issn || "-")}</span>
            <span>e-ISSN：${escapeHtml(item.eIssn || "-")}</span>
            <span>影响指数：${escapeHtml(impact)}</span>
            <span>学科：${escapeHtml(item.esiSubject || "-")}</span>
          </div>
          <div class="result-actions">
            <button class="result-link result-detail" type="button" data-index="${index}">查看详情</button>
          </div>
        </div>
      </article>
    `;
  };

  const buildEiCard = (item, index) => {
    const title = item.sourceTitle || "-";
    const removed = item.isDatabase && item.isDatabase !== "是" && item.isDatabase !== "-" ? "已被踢库" : "";
    return `
      <article class="card result-card">
        ${buildCover(title, item.fieleA)}
        <div>
          <div class="result-tags">
            ${buildTag(item.sourceType || "EI", false)}
            ${buildTag(removed, true)}
          </div>
          <div class="result-title">${escapeHtml(title)}</div>
          <div class="result-meta">
            <span>ISSN：${escapeHtml(item.eiIssn || "-")}</span>
            <span>e-ISSN：${escapeHtml(item.eiEissn || "-")}</span>
            <span>学科：${escapeHtml(item.subjectOne || "-")}</span>
          </div>
          <div class="result-actions">
            <button class="result-link result-detail" type="button" data-index="${index}">查看详情</button>
          </div>
        </div>
      </article>
    `;
  };

  const buildAhciCard = (item, index) => {
    const title = item.journalTitle || "-";
    const topTag = item.top === "是" ? "TOP" : "";
    const removed = item.isDatabase && item.isDatabase !== "是" && item.isDatabase !== "-" ? "已被踢库" : "";
    return `
      <article class="card result-card">
        ${buildCover(title, item.fieleA)}
        <div>
          <div class="result-tags">
            ${buildTag("A&HCI", false)}
            ${buildTag(topTag, false)}
            ${buildTag(removed, true)}
          </div>
          <div class="result-title">${escapeHtml(title)}</div>
          <div class="result-meta">
            <span>ISSN：${escapeHtml(item.ahciIssn || "-")}</span>
            <span>e-ISSN：${escapeHtml(item.ahciEissn || "-")}</span>
            <span>学科：${escapeHtml(item.webOfScience || "-")}</span>
          </div>
          <div class="result-actions">
            <button class="result-link result-detail" type="button" data-index="${index}">查看详情</button>
          </div>
        </div>
      </article>
    `;
  };

  const renderResults = (items) => {
    pageItemsCache = items || [];
    if (!items || !items.length) {
      results.innerHTML = '<div class="card">暂无匹配结果，请调整筛选条件。</div>';
      return;
    }

    const cards = items.map((item, index) => {
      if (state.db === "EI") {
        return buildEiCard(item, index);
      }
      if (state.db === "AHCI") {
        return buildAhciCard(item, index);
      }
      return buildSciCard(item, index);
    });
    results.innerHTML = cards.join("");
  };

  const renderPagination = (count, page) => {
    const pageSize = pageSizes[state.db] || 20;
    const totalPages = Math.max(1, Math.ceil((count || 0) / pageSize));
    pagination.innerHTML = "";

    if (totalPages <= 1) {
      return;
    }

    const prevButton = document.createElement("button");
    prevButton.type = "button";
    prevButton.textContent = "上一页";
    prevButton.disabled = page <= 1;
    prevButton.addEventListener("click", () => fetchData(page - 1));

    const nextButton = document.createElement("button");
    nextButton.type = "button";
    nextButton.textContent = "下一页";
    nextButton.disabled = page >= totalPages;
    nextButton.addEventListener("click", () => fetchData(page + 1));

    const indicator = document.createElement("span");
    indicator.textContent = `第 ${page} / ${totalPages} 页`;

    pagination.appendChild(prevButton);
    pagination.appendChild(indicator);
    pagination.appendChild(nextButton);
  };

  const setStatus = (text) => {
    resultStatus.textContent = text;
  };

  if (detailModal) {
    detailModal.querySelectorAll("[data-detail-close]").forEach((button) => {
      button.addEventListener("click", closeDetail);
    });
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && detailModal && detailModal.classList.contains("is-open")) {
      closeDetail();
    }
  });

  results.addEventListener("click", (event) => {
    const button = event.target.closest(".result-detail");
    if (!button) {
      return;
    }
    const index = Number(button.dataset.index);
    const item = Number.isFinite(index) ? pageItemsCache[index] : null;
    if (!item) {
      return;
    }
    openDetail(item);
  });

  const matchQuery = (item, fields) => {
    if (!state.query) {
      return true;
    }
    const query = normalizeText(state.query);
    return fields.some((field) => normalizeText(field).includes(query));
  };

  const getSciImpact = (item) => {
    let value = parseNumber(item.impactFactorsE);
    if (Number.isNaN(value)) {
      value = parseNumber(item.impactA);
    }
    if (Number.isNaN(value)) {
      value = parseNumber(item.impactB);
    }
    return value;
  };

  const getSciPartition = (item) => {
    const text = [item.bigPartitionB, item.bigPartitionA, item.fenqu]
      .map((value) => String(value ?? "").trim())
      .find((value) => value && value !== "-");
    if (!text) {
      return Number.NaN;
    }
    const match = text.match(/([1-4])区/);
    return match ? Number(match[1]) : Number.NaN;
  };

  const isSciTop = (item) => {
    const topA = item.topA === "是";
    const topB = item.topB === "是";
    if (state.category === "SCIE") {
      return topA;
    }
    if (state.category === "SSCI") {
      return topB;
    }
    return topA || topB;
  };

  const matchSciFilters = (item) => {
    if (!matchQuery(item, [item.periodicalsName, item.issn, item.eIssn, item.abbreviation, item.chineseTitle])) {
      return false;
    }
    if (state.category !== "全部") {
      const matchCategory = item.searchDatabase === state.category ||
        (Array.isArray(item.sciList) && item.sciList.includes(state.category));
      if (!matchCategory) {
        return false;
      }
    }

    const impactValue = getSciImpact(item);
    if (state.impact !== "全部") {
      if (!Number.isFinite(impactValue)) {
        return false;
      }
      if (state.impact === "<1" && !(impactValue < 1)) {
        return false;
      }
      if (state.impact === "1-3" && !(impactValue >= 1 && impactValue < 3)) {
        return false;
      }
      if (state.impact === "3-5" && !(impactValue >= 3 && impactValue < 5)) {
        return false;
      }
      if (state.impact === "5-10" && !(impactValue >= 5 && impactValue < 10)) {
        return false;
      }
      if (state.impact === ">10" && !(impactValue >= 10)) {
        return false;
      }
    }

    const selfCitationValue = parsePercent(item.selfCitationRate);
    if (state.selfCitation !== "全部") {
      if (!Number.isFinite(selfCitationValue)) {
        return false;
      }
      if (state.selfCitation === "0-5%" && !(selfCitationValue >= 0 && selfCitationValue < 5)) {
        return false;
      }
      if (state.selfCitation === "5-10%" && !(selfCitationValue >= 5 && selfCitationValue < 10)) {
        return false;
      }
      if (state.selfCitation === "10-20%" && !(selfCitationValue >= 10 && selfCitationValue < 20)) {
        return false;
      }
      if (state.selfCitation === "20-30%" && !(selfCitationValue >= 20 && selfCitationValue < 30)) {
        return false;
      }
      if (state.selfCitation === "30-50%" && !(selfCitationValue >= 30 && selfCitationValue < 50)) {
        return false;
      }
      if (state.selfCitation === "50%以上" && !(selfCitationValue >= 50)) {
        return false;
      }
    }

    if (state.partition !== "全部") {
      const partitionValue = getSciPartition(item);
      const targetPartition = Number.parseInt(state.partition, 10);
      if (!Number.isFinite(partitionValue) || !Number.isFinite(targetPartition)) {
        return false;
      }
      if (partitionValue !== targetPartition) {
        return false;
      }
    }

    if (state.top !== "全部") {
      const topFlag = isSciTop(item);
      if (state.top === "是" && !topFlag) {
        return false;
      }
      if (state.top === "否" && topFlag) {
        return false;
      }
    }

    if (state.subject !== "全部" && item.esiSubject !== state.subject) {
      return false;
    }

    return true;
  };

  const matchEiFilters = (item) => {
    if (!matchQuery(item, [item.sourceTitle, item.eiIssn, item.eiEissn, item.subjectOne, item.chineseTitle])) {
      return false;
    }
    if (state.eiType !== "全部" && item.sourceType !== state.eiType) {
      return false;
    }
    return true;
  };

  const matchAhciFilters = (item) => {
    if (!matchQuery(item, [item.journalTitle, item.ahciIssn, item.ahciEissn, item.webOfScience, item.chineseTitle])) {
      return false;
    }
    if (state.ahciSubject !== "全部" && item.webOfScience !== state.ahciSubject) {
      return false;
    }
    return true;
  };

  const sortSciItems = (items) => {
    if (!state.order) {
      return items;
    }
    const [field, direction] = state.order.split("|");
    const sorters = {
      影响指数: (item) => getSciImpact(item),
      H指数: (item) => parseNumber(item.hindex),
      排名: (item) => parseNumber(String(item.ranking ?? "").split("/")[0]),
      年发文量: (item) => parseNumber(item.yearNum),
      自引率: (item) => parsePercent(item.selfCitationRate),
      国人占比: (item) => parsePercent(item.chinaProportion),
    };
    const getter = sorters[field];
    if (!getter) {
      return items;
    }
    const multiplier = direction === "down" ? -1 : 1;
    return [...items].sort((a, b) => {
      const aValue = getter(a);
      const bValue = getter(b);
      const aValid = Number.isFinite(aValue);
      const bValid = Number.isFinite(bValue);
      if (!aValid && !bValid) {
        return 0;
      }
      if (!aValid) {
        return 1;
      }
      if (!bValid) {
        return -1;
      }
      if (aValue === bValue) {
        return 0;
      }
      return (aValue - bValue) * multiplier;
    });
  };

  const filterItems = (items) => {
    if (state.db === "EI") {
      return items.filter(matchEiFilters);
    }
    if (state.db === "AHCI") {
      return items.filter(matchAhciFilters);
    }
    const filtered = items.filter(matchSciFilters);
    return sortSciItems(filtered);
  };

  const loadData = async (db) => {
    if (dataCache[db]) {
      return;
    }
    const response = await fetch(dataFiles[db]);
    if (!response.ok) {
      throw new Error(`Data file not found: ${dataFiles[db]}`);
    }
    const data = await response.json();
    dataCache[db] = Array.isArray(data.items) ? data.items : [];
    metaCache[db] = data.generatedAt || "";
  };

  const fetchData = async (page) => {
    state.page = page;
    state.query = searchInput.value.trim();

    setStatus("加载中...");
    resultCount.textContent = "共 0 条";
    results.innerHTML = "";
    pagination.innerHTML = "";
    pageItemsCache = [];
    closeDetail();

    try {
      await loadData(state.db);
      const items = dataCache[state.db] || [];
      const filtered = filterItems(items);
      const total = filtered.length;
      const pageSize = pageSizes[state.db] || 20;
      const totalPages = Math.max(1, Math.ceil(total / pageSize));
      const safePage = Math.min(Math.max(1, page), totalPages);

      state.page = safePage;
      const start = (safePage - 1) * pageSize;
      const pageItems = filtered.slice(start, start + pageSize);

      resultCount.textContent = `共 ${total} 条`;
      if (metaCache[state.db]) {
        setStatus(`数据快照：${metaCache[state.db]}`);
      } else {
        setStatus("");
      }
      renderResults(pageItems);
      renderPagination(total, safePage);
    } catch (err) {
      setStatus("数据加载失败，请确认已生成本地数据文件。");
      resultCount.textContent = "共 0 条";
      results.innerHTML = '<div class="card">数据快照不存在或无法读取，请先生成 assets/data 目录下的数据文件。</div>';
    }
  };

  const onChipClick = (event) => {
    const chip = event.target.closest(".filter-chip");
    if (!chip) {
      return;
    }
    const group = chip.closest(".filter-chips");
    if (!group) {
      return;
    }
    const filterKey = group.dataset.filter;
    const value = chip.dataset.value;
    if (!filterKey) {
      return;
    }
    state.page = 1;
    if (filterKey === "category") {
      state.category = value;
    } else if (filterKey === "impact") {
      state.impact = value;
    } else if (filterKey === "selfCitation") {
      state.selfCitation = value;
    } else if (filterKey === "partition") {
      state.partition = value;
    } else if (filterKey === "top") {
      state.top = value;
    } else if (filterKey === "eiType") {
      state.eiType = value;
    }
    setActiveChip(group, value);
    fetchData(1);
  };

  document.querySelectorAll(".filter-chips").forEach((group) => {
    group.addEventListener("click", onChipClick);
  });

  if (subjectSelect) {
    subjectSelect.addEventListener("change", () => {
      state.subject = subjectSelect.value;
      fetchData(1);
    });
  }

  if (ahciSubjectSelect) {
    ahciSubjectSelect.addEventListener("change", () => {
      state.ahciSubject = ahciSubjectSelect.value;
      fetchData(1);
    });
  }

  sortButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const field = button.dataset.sort;
      if (!field) {
        return;
      }
      let direction = "down";
      if (state.order && state.order.startsWith(`${field}|`)) {
        direction = state.order.endsWith("|down") ? "up" : "down";
      }
      state.order = `${field}|${direction}`;
      updateSortUI();
      fetchData(1);
    });
  });

  dbSelect.addEventListener("change", () => {
    state.db = dbSelect.value;
    resetFilters(true);
    showScope(state.db);
    fetchData(1);
  });

  searchButton.addEventListener("click", () => fetchData(1));
  resetButton.addEventListener("click", () => {
    resetFilters(false);
    fetchData(1);
  });

  searchInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      fetchData(1);
    }
  });

  const applyInitialParams = () => {
    const params = new URLSearchParams(window.location.search);
    const dbParam = params.get("db");
    const queryParam = params.get("q");
    const allowedDbs = ["SCI", "EI", "AHCI"];

    if (dbParam && allowedDbs.includes(dbParam)) {
      state.db = dbParam;
      dbSelect.value = dbParam;
    }

    if (queryParam) {
      searchInput.value = queryParam.trim();
    }
  };

  applyInitialParams();
  showScope(state.db);
  updateSortUI();
  fetchData(1);
});

