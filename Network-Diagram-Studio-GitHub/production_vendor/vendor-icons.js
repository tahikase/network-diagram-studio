(function () {
  "use strict";
  const SVG_NS = "http://www.w3.org/2000/svg";
  let registered = false;

  function requireCondition(value, message) {
    if (!value) throw new Error("[Production vendor icons] " + message);
  }

  function symbolMarkup(entry) {
    const document = new DOMParser().parseFromString(entry.svg, "image/svg+xml");
    requireCondition(!document.querySelector("parsererror"), "Invalid SVG for " + entry.id);
    const source = document.documentElement;
    requireCondition(source.namespaceURI === SVG_NS && source.localName === "svg", "Invalid SVG root");
    requireCondition(!source.querySelector("script, foreignObject, image"), "Unsafe SVG content");
    // Editor/RDF metadata is not artwork and does not belong in the shared sprite.
    for (const element of source.querySelectorAll("*")) {
      if (element.localName === "metadata" ||
          (element.namespaceURI === "http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd" &&
           element.localName === "namedview")) element.remove();
    }
    const idMap = new Map();
    for (const element of [source, ...source.querySelectorAll("*")]) {
      if (element.id) idMap.set(element.id, "ic-" + entry.id + "--" + element.id);
    }
    for (const element of [source, ...source.querySelectorAll("*")]) {
      for (const attribute of [...element.attributes]) {
        requireCondition(!attribute.localName.toLowerCase().startsWith("on"), "Unsafe event attribute");
        let value = attribute.value;
        if (attribute.localName === "id") value = idMap.get(value);
        if (attribute.localName === "href") {
          requireCondition(value.startsWith("#") && idMap.has(value.slice(1)), "External or missing SVG reference");
          value = "#" + idMap.get(value.slice(1));
        }
        value = value.replace(/url\(\s*["']?#([^)"'\s]+)["']?\s*\)/g, function (_, id) {
          requireCondition(idMap.has(id), "Missing SVG paint reference " + id);
          return "url(#" + idMap.get(id) + ")";
        });
        requireCondition(!/url\(\s*["']?(?!#)[^)]/i.test(value), "External SVG URL");
        attribute.value = value;
      }
    }
    const symbol = document.createElementNS(SVG_NS, "symbol");
    const viewBox = source.getAttribute("viewBox");
    requireCondition(viewBox || (source.hasAttribute("width") && source.hasAttribute("height")), "SVG size missing");
    symbol.id = "ic-" + entry.id;
    symbol.setAttribute("viewBox", viewBox || "0 0 " + parseFloat(source.getAttribute("width")) + " " + parseFloat(source.getAttribute("height")));
    symbol.setAttribute("preserveAspectRatio", "xMidYMid meet");
    for (const attribute of [...source.attributes]) {
      // Let XMLSerializer declare namespaces: an inherited xmlns:svg alias can
      // otherwise serialize <svg:symbol>, which HTML parses as an unknown tag.
      if (attribute.namespaceURI !== "http://www.w3.org/2000/xmlns/" &&
          !["id", "viewBox", "width", "height"].includes(attribute.name)) {
        symbol.setAttributeNS(attribute.namespaceURI, attribute.name, attribute.value);
      }
    }
    while (source.firstChild) symbol.appendChild(source.firstChild);
    return new XMLSerializer().serializeToString(symbol);
  }

  window.ndsProductionVendors = Object.freeze({
    register: function (native) {
      requireCondition(!registered, "The catalog was already registered");
      const catalog = window.ndsProductionVendorCatalog;
      requireCondition(catalog && catalog.scope === "production" &&
        Array.isArray(catalog.entries) && catalog.entries.length > 0, "Catalog unavailable");
      for (const name of ["icons", "iconCategories", "resourceTypes", "resourceCategories"]) {
        requireCondition(Array.isArray(native[name]), "Missing native array: " + name);
      }
      for (const name of ["iconsById", "resourceTypesBySlug", "resourceTypeByIcon"]) {
        requireCondition(native[name] && typeof native[name] === "object", "Missing native lookup: " + name);
      }
      requireCondition(typeof native.sprite === "string" && native.sprite.endsWith("</svg>"), "Native sprite format changed");
      const seen = new Set();
      for (const entry of catalog.entries) {
        requireCondition(/^vendor-(aws|oci|kubernetes)--[a-z0-9-]+$/.test(entry.id), "Invalid catalog ID");
        requireCondition(!seen.has(entry.id) && !native.iconsById[entry.id] &&
          !native.resourceTypesBySlug[entry.resource.slug] && !native.resourceTypeByIcon[entry.id],
        "Duplicate vendor ID " + entry.id);
        requireCondition(entry.resource.iconId === entry.id && entry.resource.slug === entry.id, "Inconsistent resource mapping");
        seen.add(entry.id);
      }
      // Prepare every symbol before mutating the native catalog, keeping registration atomic.
      const symbols = catalog.entries.map(symbolMarkup).join("");
      for (const entry of catalog.entries) {
        const icon = { id: entry.id, label: entry.label, category: entry.category };
        const resource = entry.resource;
        native.icons.push(icon);
        native.iconsById[entry.id] = icon;
        native.resourceTypes.push(resource);
        native.resourceTypesBySlug[resource.slug] = resource;
        native.resourceTypeByIcon[entry.id] = resource;
        if (!native.iconCategories.includes(entry.category)) native.iconCategories.push(entry.category);
        if (!native.resourceCategories.includes(entry.category)) {
          const custom = native.resourceCategories.indexOf("Custom");
          native.resourceCategories.splice(custom < 0 ? native.resourceCategories.length : custom, 0, entry.category);
        }
      }
      native.iconCategories.sort();
      registered = true;
      return native.sprite.slice(0, -6) + "<defs data-nds-vendor-symbols=\"1\">" + symbols + "</defs></svg>";
    }
  });
})();
