const CONFIG = {
  dataUrl: "./data/atlas-data.json",
  topoUrl: "./data/countries-110m.json",
  width: 920,
  height: 500
};

const dom = {
  diseaseSelect: document.getElementById("disease-select"),
  yearSelect: document.getElementById("year-select"),
  toggles: Array.from(document.querySelectorAll(".toggle")),
  heroDisease: document.getElementById("hero-disease"),
  heroBlindSpots: document.getElementById("hero-blind-spots"),
  heroUncovered: document.getElementById("hero-uncovered"),
  heroHotspot: document.getElementById("hero-hotspot"),
  mapTitle: document.getElementById("map-title"),
  legendRamp: document.getElementById("legend-ramp"),
  legendMin: document.getElementById("legend-min"),
  legendMax: document.getElementById("legend-max"),
  mapSvg: d3.select("#world-map"),
  mapWrap: document.getElementById("map-wrap"),
  tooltip: document.getElementById("map-tooltip"),
  spotlightTitle: document.getElementById("spotlight-title"),
  spotlightSummary: document.getElementById("spotlight-summary"),
  spotlightBurden: document.getElementById("spotlight-burden"),
  spotlightCoverage: document.getElementById("spotlight-coverage"),
  spotlightGap: document.getElementById("spotlight-gap"),
  spotlightYear: document.getElementById("spotlight-year"),
  spotlightStory: document.getElementById("spotlight-story"),
  meterProgress: document.getElementById("meter-progress"),
  meterScore: document.getElementById("meter-score"),
  trendTitle: document.getElementById("trend-title"),
  sourceGrid: document.getElementById("source-grid"),
  scatterSvg: d3.select("#scatterplot"),
  rankingSvg: d3.select("#ranking-chart"),
  trendSvg: d3.select("#trend-chart")
};

const state = {
  atlas: null,
  world: null,
  selectedDisease: "mesothelioma",
  selectedYear: 2021,
  mode: "burden",
  selectedCountryIso3: "IND"
};

const mapNameAliases = {
  "United States of America": "United States"
};

const modeMeta = {
  burden: {
    label: "Burden intensity",
    palette: ["#163a5f", "#2ec4b6", "#ffd166", "#ff7f50"],
    className: "burden-ramp"
  },
  coverage: {
    label: "Evidence coverage",
    palette: ["#ff6268", "#ffb356", "#e4f27d", "#5fe1cf"],
    className: "coverage-ramp"
  },
  blind_spots: {
    label: "Blind-spot score",
    palette: ["#1c2d48", "#7241ff", "#d150ff", "#ff5661"],
    className: "blind_spots-ramp"
  }
};

function formatMillions(value) {
  return Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 }) + "M";
}

function formatValue(value) {
  return Number(value || 0).toFixed(0);
}

function percentile(values, input) {
  const sorted = values.slice().sort((a, b) => a - b);
  const index = sorted.findIndex((value) => value >= input);
  if (index < 0) return 100;
  return (index / Math.max(sorted.length - 1, 1)) * 100;
}

function computeDerived(country) {
  const burdenSeries = country.burden[state.selectedDisease];
  const burdenNow = burdenSeries[String(state.selectedYear)];
  const values = state.atlas.countries.map((entry) => entry.burden[state.selectedDisease][String(state.selectedYear)]);
  const burdenPct = percentile(values, burdenNow);
  const uncoveredShare = (country.uncovered_population_millions / country.population_millions) * 100;
  const sourceStaleness = Math.max(0, (2021 - country.last_input_year) * 12.5);
  const sourceSparsity = Math.max(0, 100 - Math.min(country.source_count * 2.5, 100));
  const blindSpotScore = Math.round(
    burdenPct * 0.35 +
    uncoveredShare * 0.25 +
    country.uncertainty_index * 0.20 +
    sourceStaleness * 0.10 +
    sourceSparsity * 0.10
  );

  return {
    burdenNow,
    burdenPct,
    uncoveredShare,
    sourceStaleness,
    sourceSparsity,
    blindSpotScore,
    coverageScore: Math.max(0, Math.round(country.coverage_pct - country.uncertainty_index * 0.15 + country.source_count * 0.4))
  };
}

function getCountryByIso3(iso3) {
  return state.atlas.countries.find((country) => country.iso3 === iso3) || null;
}

function getSelectedCountry() {
  return getCountryByIso3(state.selectedCountryIso3) || state.atlas.countries[0];
}

function mapValue(country) {
  const derived = computeDerived(country);
  if (state.mode === "coverage") return derived.coverageScore;
  if (state.mode === "blind_spots") return derived.blindSpotScore;
  return derived.burdenNow;
}

function fillSelect(selectEl, options, selectedValue) {
  selectEl.innerHTML = "";
  options.forEach((option) => {
    const element = document.createElement("option");
    element.value = option.value;
    element.textContent = option.label;
    if (String(option.value) === String(selectedValue)) {
      element.selected = true;
    }
    selectEl.appendChild(element);
  });
}

function buildHero() {
  const selectedDisease = state.atlas.diseases.find((item) => item.key === state.selectedDisease);
  const blindSpots = state.atlas.countries
    .map((country) => ({ country, score: computeDerived(country).blindSpotScore }))
    .filter((item) => item.score >= 60);
  const uncoveredTotal = state.atlas.countries.reduce((sum, country) => sum + country.uncovered_population_millions, 0);
  const hotspot = state.atlas.countries
    .map((country) => ({ country, score: computeDerived(country).blindSpotScore + computeDerived(country).burdenNow * 0.3 }))
    .sort((a, b) => b.score - a.score)[0];

  dom.heroDisease.textContent = selectedDisease.label;
  dom.heroBlindSpots.textContent = String(blindSpots.length);
  dom.heroUncovered.textContent = formatMillions(uncoveredTotal);
  dom.heroHotspot.textContent = hotspot ? hotspot.country.name : "-";
}

function buildSources() {
  dom.sourceGrid.innerHTML = "";
  state.atlas.sources.forEach((source) => {
    const card = document.createElement("article");
    card.className = "source-card";
    card.innerHTML = `
      <p class="signal-title">${source.name}</p>
      <p>${source.role}</p>
      <p><a href="${source.url}" target="_blank" rel="noreferrer">Open IHME surface</a></p>
    `;
    dom.sourceGrid.appendChild(card);
  });
}

function updateLegend() {
  const meta = modeMeta[state.mode];
  dom.legendRamp.className = "legend-ramp " + meta.className;
  dom.legendMin.textContent = state.mode === "coverage" ? "Lower confidence" : "Lower";
  dom.legendMax.textContent = state.mode === "coverage" ? "Stronger confidence" : "Higher";
  const diseaseLabel = state.atlas.diseases.find((item) => item.key === state.selectedDisease).label;
  const titleMap = {
    burden: `${diseaseLabel} burden intensity`,
    coverage: `${diseaseLabel} evidence coverage`,
    blind_spots: `${diseaseLabel} blind-spot score`
  };
  dom.mapTitle.textContent = titleMap[state.mode];
}

function renderMap() {
  const svg = dom.mapSvg;
  svg.selectAll("*").remove();

  const features = topojson.feature(state.world, state.world.objects.countries).features;
  const projection = d3.geoNaturalEarth1().fitSize([CONFIG.width, CONFIG.height], { type: "Sphere" });
  const path = d3.geoPath(projection);
  const values = state.atlas.countries.map(mapValue);
  const color = d3.scaleSequential()
    .domain(d3.extent(values))
    .interpolator(d3.interpolateRgbBasis(modeMeta[state.mode].palette));

  svg.append("path")
    .datum({ type: "Sphere" })
    .attr("fill", "rgba(20, 43, 69, 0.9)")
    .attr("d", path);

  svg.append("g")
    .selectAll("path")
    .data(features)
    .join("path")
    .attr("class", "country")
    .attr("d", path)
    .attr("fill", (feature) => {
      const country = lookupCountry(feature);
      return country ? color(mapValue(country)) : "rgba(255,255,255,0.06)";
    })
    .attr("stroke", "rgba(255,255,255,0.18)")
    .attr("stroke-width", (feature) => lookupCountry(feature)?.iso3 === state.selectedCountryIso3 ? 1.4 : 0.6)
    .on("mouseenter", function (event, feature) {
      const country = lookupCountry(feature);
      if (!country) return;
      showTooltip(event, country);
      svg.selectAll(".country").classed("dimmed", true);
      d3.select(this).classed("dimmed", false).attr("stroke-width", 1.6);
    })
    .on("mousemove", function (event, feature) {
      const country = lookupCountry(feature);
      if (!country) return;
      showTooltip(event, country);
    })
    .on("mouseleave", function () {
      hideTooltip();
      svg.selectAll(".country")
        .classed("dimmed", false)
        .attr("stroke-width", (feature) => lookupCountry(feature)?.iso3 === state.selectedCountryIso3 ? 1.4 : 0.6);
    })
    .on("click", function (_, feature) {
      const country = lookupCountry(feature);
      if (!country) return;
      state.selectedCountryIso3 = country.iso3;
      refresh();
    });
}

function lookupCountry(feature) {
  const topoId = String(feature.id).padStart(3, "0");
  const byId = state.atlas.countries.find((country) => country.topo_id === topoId);
  if (byId) return byId;
  const featureName = mapNameAliases[feature.properties.name] || feature.properties.name;
  return state.atlas.countries.find((country) => country.name === featureName) || null;
}

function showTooltip(event, country) {
  const derived = computeDerived(country);
  const rect = dom.mapWrap.getBoundingClientRect();
  dom.tooltip.hidden = false;
  dom.tooltip.style.left = event.clientX - rect.left + 18 + "px";
  dom.tooltip.style.top = event.clientY - rect.top + 18 + "px";
  dom.tooltip.innerHTML = `
    <strong>${country.name}</strong><br />
    ${state.atlas.diseases.find((item) => item.key === state.selectedDisease).label}: <strong>${formatValue(derived.burdenNow)}</strong><br />
    Coverage score: <strong>${formatValue(derived.coverageScore)}</strong><br />
    Blind-spot score: <strong>${formatValue(derived.blindSpotScore)}</strong><br />
    Uncovered population: <strong>${formatMillions(country.uncovered_population_millions)}</strong>
  `;
}

function hideTooltip() {
  dom.tooltip.hidden = true;
}

function updateSpotlight() {
  const country = getSelectedCountry();
  const derived = computeDerived(country);
  dom.spotlightTitle.textContent = country.name;
  dom.spotlightSummary.textContent = `${country.region} | ${country.source_mix}. ${state.atlas.diseases.find((item) => item.key === state.selectedDisease).label} intensity sits at ${formatValue(derived.burdenNow)} in ${state.selectedYear}.`;
  dom.spotlightBurden.textContent = formatValue(derived.burdenNow);
  dom.spotlightCoverage.textContent = derived.coverageScore + "/100";
  dom.spotlightGap.textContent = derived.blindSpotScore + "/100";
  dom.spotlightYear.textContent = String(country.last_input_year);
  dom.spotlightStory.textContent = country.story;
  dom.meterScore.textContent = String(derived.coverageScore);
  dom.meterProgress.style.strokeDashoffset = String(264 - (264 * derived.coverageScore) / 100);
  dom.trendTitle.textContent = `${country.name} trajectory`;
}

function renderScatter() {
  const svg = dom.scatterSvg;
  svg.selectAll("*").remove();
  const width = 620;
  const height = 380;
  const margin = { top: 20, right: 20, bottom: 48, left: 52 };
  const chart = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const rows = state.atlas.countries.map((country) => {
    const derived = computeDerived(country);
    return {
      ...country,
      burden: derived.burdenNow,
      coverage: derived.coverageScore,
      uncovered: country.uncovered_population_millions
    };
  });

  const x = d3.scaleLinear().domain([0, d3.max(rows, (d) => d.coverage) + 5]).range([0, innerWidth]);
  const y = d3.scaleLinear().domain([0, d3.max(rows, (d) => d.burden) + 5]).range([innerHeight, 0]);
  const r = d3.scaleSqrt().domain([0, d3.max(rows, (d) => d.uncovered)]).range([5, 28]);

  chart.append("g")
    .selectAll("line")
    .data(y.ticks(5))
    .join("line")
    .attr("class", "grid-line")
    .attr("x1", 0)
    .attr("x2", innerWidth)
    .attr("y1", (d) => y(d))
    .attr("y2", (d) => y(d));

  chart.append("g")
    .selectAll("circle")
    .data(rows)
    .join("circle")
    .attr("cx", (d) => x(d.coverage))
    .attr("cy", (d) => y(d.burden))
    .attr("r", (d) => r(d.uncovered))
    .attr("fill", (d) => d.iso3 === state.selectedCountryIso3 ? "rgba(255,138,61,0.9)" : "rgba(95,225,207,0.58)")
    .attr("stroke", (d) => d.iso3 === state.selectedCountryIso3 ? "#ffd166" : "rgba(255,255,255,0.16)")
    .attr("stroke-width", 1.2)
    .on("click", (_, d) => {
      state.selectedCountryIso3 = d.iso3;
      refresh();
    });

  chart.append("g")
    .selectAll("text")
    .data(rows.filter((d) => d.iso3 === state.selectedCountryIso3 || computeDerived(d).blindSpotScore >= 65))
    .join("text")
    .attr("class", "dot-label")
    .attr("x", (d) => x(d.coverage) + 8)
    .attr("y", (d) => y(d.burden) - 8)
    .text((d) => d.iso3);

  chart.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(d3.axisBottom(x).ticks(6));

  chart.append("g")
    .attr("class", "axis")
    .call(d3.axisLeft(y).ticks(6));

  chart.append("text")
    .attr("class", "chart-label")
    .attr("x", innerWidth / 2)
    .attr("y", innerHeight + 40)
    .attr("text-anchor", "middle")
    .text("Evidence coverage score");

  chart.append("text")
    .attr("class", "chart-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -innerHeight / 2)
    .attr("y", -38)
    .attr("text-anchor", "middle")
    .text(`${state.atlas.diseases.find((item) => item.key === state.selectedDisease).label} burden intensity`);
}

function renderRanking() {
  const svg = dom.rankingSvg;
  svg.selectAll("*").remove();
  const width = 620;
  const height = 380;
  const margin = { top: 18, right: 26, bottom: 28, left: 140 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  const rows = state.atlas.countries
    .map((country) => ({ ...country, blindSpotScore: computeDerived(country).blindSpotScore }))
    .sort((a, b) => b.blindSpotScore - a.blindSpotScore)
    .slice(0, 8);
  const x = d3.scaleLinear().domain([0, d3.max(rows, (d) => d.blindSpotScore) + 5]).range([0, innerWidth]);
  const y = d3.scaleBand().domain(rows.map((d) => d.name)).range([0, innerHeight]).padding(0.2);
  const chart = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  chart.append("g")
    .selectAll("rect")
    .data(rows)
    .join("rect")
    .attr("x", 0)
    .attr("y", (d) => y(d.name))
    .attr("height", y.bandwidth())
    .attr("width", (d) => x(d.blindSpotScore))
    .attr("rx", 10)
    .attr("fill", (d) => d.iso3 === state.selectedCountryIso3 ? "#ff8a3d" : "rgba(209, 80, 255, 0.75)")
    .on("click", (_, d) => {
      state.selectedCountryIso3 = d.iso3;
      refresh();
    });

  chart.append("g")
    .attr("class", "axis")
    .call(d3.axisLeft(y).tickSize(0))
    .select(".domain")
    .remove();

  chart.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(d3.axisBottom(x).ticks(5));

  chart.append("g")
    .selectAll("text.value")
    .data(rows)
    .join("text")
    .attr("class", "value-label")
    .attr("x", (d) => x(d.blindSpotScore) + 8)
    .attr("y", (d) => y(d.name) + y.bandwidth() / 2 + 4)
    .text((d) => d.blindSpotScore);
}

function renderTrend() {
  const svg = dom.trendSvg;
  svg.selectAll("*").remove();
  const width = 620;
  const height = 340;
  const margin = { top: 16, right: 18, bottom: 36, left: 52 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  const chart = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
  const country = getSelectedCountry();
  const series = state.atlas.years.map((year) => ({
    year,
    value: country.burden[state.selectedDisease][String(year)]
  }));
  const x = d3.scalePoint().domain(series.map((d) => d.year)).range([0, innerWidth]);
  const y = d3.scaleLinear().domain([0, d3.max(series, (d) => d.value) + 10]).range([innerHeight, 0]);
  const line = d3.line().x((d) => x(d.year)).y((d) => y(d.value)).curve(d3.curveMonotoneX);

  chart.append("g")
    .selectAll("line")
    .data(y.ticks(4))
    .join("line")
    .attr("class", "grid-line")
    .attr("x1", 0)
    .attr("x2", innerWidth)
    .attr("y1", (d) => y(d))
    .attr("y2", (d) => y(d));

  chart.append("path")
    .datum(series)
    .attr("fill", "none")
    .attr("stroke", "#5fe1cf")
    .attr("stroke-width", 3)
    .attr("d", line);

  chart.append("g")
    .selectAll("circle")
    .data(series)
    .join("circle")
    .attr("cx", (d) => x(d.year))
    .attr("cy", (d) => y(d.value))
    .attr("r", 5.5)
    .attr("fill", "#ff8a3d");

  chart.append("g")
    .selectAll("text")
    .data(series)
    .join("text")
    .attr("class", "value-label")
    .attr("x", (d) => x(d.year))
    .attr("y", (d) => y(d.value) - 10)
    .attr("text-anchor", "middle")
    .text((d) => d.value);

  chart.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(d3.axisBottom(x));

  chart.append("g")
    .attr("class", "axis")
    .call(d3.axisLeft(y).ticks(5));
}

function refresh() {
  updateLegend();
  buildHero();
  renderMap();
  updateSpotlight();
  renderScatter();
  renderRanking();
  renderTrend();
  syncControls();
}

function syncControls() {
  dom.toggles.forEach((button) => {
    button.classList.toggle("active", button.dataset.mode === state.mode);
  });
}

function bindEvents() {
  dom.diseaseSelect.addEventListener("change", (event) => {
    state.selectedDisease = event.target.value;
    refresh();
  });

  dom.yearSelect.addEventListener("change", (event) => {
    state.selectedYear = Number(event.target.value);
    refresh();
  });

  dom.toggles.forEach((button) => {
    button.addEventListener("click", () => {
      state.mode = button.dataset.mode;
      refresh();
    });
  });
}

async function init() {
  const [atlas, world] = await Promise.all([
    d3.json(CONFIG.dataUrl),
    d3.json(CONFIG.topoUrl)
  ]);

  state.atlas = atlas;
  state.world = world;
  fillSelect(dom.diseaseSelect, atlas.diseases.map((item) => ({ value: item.key, label: item.label })), state.selectedDisease);
  fillSelect(dom.yearSelect, atlas.years.map((year) => ({ value: year, label: year })), state.selectedYear);
  buildSources();
  bindEvents();
  refresh();
}

init().catch((error) => {
  console.error(error);
  document.body.innerHTML = `<pre style="padding:24px;color:#fff">Failed to load atlas: ${error.message}</pre>`;
});
