const baseUrl = "https://myoshi-co-bayla-worker.cloudflare.zue.dev";

test("/live.svg defaults", async () => {
  const result = await fetch(`${baseUrl}/live.svg`);
  const text = await result.text();

  // 200 response
  expect(result.status).toBe(200);

  // should be svg
  expect(result.headers.get("Content-Type")).toBe("image/svg+xml");

  // should contain svg content
  expect(text).toContain("<svg");
  expect(text).toContain("</svg>");

  // should contain "not live" text
  expect(text).toContain("not live");

  // should contain default stroke attributes
  expect(text).toContain('stroke="none"');
  expect(text).toContain('stroke-width="0"');
});

test("/live.svg parameters", async () => {
  const parameters = new URLSearchParams({
    twitchUsername: "zuedev",
    // isLiveText: "LIVE",
    notLiveText: "OFFLINE",
    // isLiveColor: "#00ff00",
    notLiveColor: "#ff0000",
    fillColor: "#0000ff",
    width: "100",
    height: "50",
    strokeColor: "white",
    strokeWidth: "2",
  });

  const result = await fetch(`${baseUrl}/live.svg?${parameters.toString()}`);

  const text = await result.text();

  // 200 response
  expect(result.status).toBe(200);

  // should be svg
  expect(result.headers.get("Content-Type")).toBe("image/svg+xml");

  // should contain svg content
  expect(text).toContain("<svg");
  expect(text).toContain("</svg>");

  // should contain custom "OFFLINE" text
  expect(text).toContain("OFFLINE");

  // should contain custom colors
  expect(text).toContain("#ff0000");
  expect(text).toContain("#0000ff");

  // should contain custom width and height
  expect(text).toContain('width="100"');
  expect(text).toContain('height="50"');

  // should contain custom stroke attributes
  expect(text).toContain('stroke="white"');
  expect(text).toContain('stroke-width="2"');
});

test("/live.svg custom SVG (both svgOnline and svgOffline)", async () => {
  const customOfflineSvg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="20"><text y="15" fill="red">CUSTOM OFF</text></svg>';
  const customOnlineSvg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="20"><text y="15" fill="green">CUSTOM ON</text></svg>';

  const parameters = new URLSearchParams({
    svgOnline: customOnlineSvg,
    svgOffline: customOfflineSvg,
  });

  const result = await fetch(`${baseUrl}/live.svg?${parameters.toString()}`);
  const text = await result.text();

  // 200 response
  expect(result.status).toBe(200);

  // should be svg
  expect(result.headers.get("Content-Type")).toBe("image/svg+xml");

  // should return one of the custom SVGs (likely offline for zuedev)
  const isCustom = text.includes("CUSTOM OFF") || text.includes("CUSTOM ON");
  expect(isCustom).toBe(true);
});

test("/live.svg custom SVG ignored when only one is provided", async () => {
  const parameters = new URLSearchParams({
    svgOnline:
      '<svg xmlns="http://www.w3.org/2000/svg"><text>CUSTOM</text></svg>',
  });

  const result = await fetch(`${baseUrl}/live.svg?${parameters.toString()}`);
  const text = await result.text();

  // 200 response
  expect(result.status).toBe(200);

  // should fall back to default badge (not custom SVG)
  expect(text).not.toContain("CUSTOM");
  expect(text).toContain("not live");
});
