/* LIFE 305 — Linear connection diagram (Section 6)
   Static, deterministic layout: five "cause" nodes in a top row, risk and
   protective factor nodes in a bottom row, connected by SVG curves computed
   from actual DOM positions. No physics simulation, no external dependency —
   predictable and non-moving by design. */

(function () {
  "use strict";

  function init() {
    var root = document.getElementById("linear-diagram");
    if (!root) return;

    var svg = document.getElementById("ld-lines");
    var causesRow = document.getElementById("ld-causes");
    var factorsRow = document.getElementById("ld-factors");
    var info = document.getElementById("ld-info");

    var causeNodes = Array.prototype.slice.call(causesRow.querySelectorAll(".ld-node"));
    var factorNodes = Array.prototype.slice.call(factorsRow.querySelectorAll(".ld-node"));
    var allNodes = causeNodes.concat(factorNodes);

    var SVG_NS = "http://www.w3.org/2000/svg";
    var pinned = null; // id of a clicked/pinned node, or null

    function causeLabel(id) {
      var node = causeNodes.filter(function (n) { return n.dataset.id === id; })[0];
      return node ? node.querySelector("span").textContent : id;
    }

    function factorLabel(id) {
      var node = factorNodes.filter(function (n) { return n.dataset.id === id; })[0];
      return node ? node.textContent : id;
    }

    function linksForFactor(factorNode) {
      return factorNode.dataset.links ? factorNode.dataset.links.split(",") : [];
    }

    function linksForCause(causeId) {
      var risk = [];
      var protective = [];
      factorNodes.forEach(function (f) {
        if (linksForFactor(f).indexOf(causeId) !== -1) {
          if (f.dataset.type === "risk") risk.push(f.dataset.id);
          else protective.push(f.dataset.id);
        }
      });
      return { risk: risk, protective: protective };
    }

    function drawLines() {
      var rootRect = root.getBoundingClientRect();
      svg.setAttribute("width", rootRect.width);
      svg.setAttribute("height", rootRect.height);
      svg.setAttribute("viewBox", "0 0 " + rootRect.width + " " + rootRect.height);
      svg.innerHTML = "";

      factorNodes.forEach(function (factorNode) {
        var fRect = factorNode.getBoundingClientRect();
        var fx = fRect.left + fRect.width / 2 - rootRect.left;
        var fy = fRect.top - rootRect.top;

        linksForFactor(factorNode).forEach(function (causeId) {
          var causeNode = causeNodes.filter(function (c) { return c.dataset.id === causeId; })[0];
          if (!causeNode) return;
          var cRect = causeNode.getBoundingClientRect();
          var cx = cRect.left + cRect.width / 2 - rootRect.left;
          var cy = cRect.bottom - rootRect.top;

          var midY = (fy + cy) / 2;
          var d = "M " + cx + " " + cy + " C " + cx + " " + midY + ", " + fx + " " + midY + ", " + fx + " " + fy;

          var path = document.createElementNS(SVG_NS, "path");
          path.setAttribute("d", d);
          path.setAttribute("stroke", factorNode.dataset.type === "risk" ? "#D13438" : "#22815F");
          path.dataset.factor = factorNode.dataset.id;
          path.dataset.cause = causeId;
          svg.appendChild(path);
        });
      });
    }

    function clearState() {
      allNodes.forEach(function (n) {
        n.classList.remove("is-active", "is-dim");
      });
      Array.prototype.forEach.call(svg.querySelectorAll("path"), function (p) {
        p.classList.remove("is-active", "is-dim");
      });
    }

    function showDefaultInfo() {
      info.innerHTML = '<p class="ld-info-default">Click or hover a node above to see how it connects.</p>';
    }

    function highlight(node) {
      if (!node) {
        clearState();
        showDefaultInfo();
        return;
      }

      var id = node.dataset.id;
      var isCause = node.classList.contains("ld-node--cause");
      var connectedCauseIds = [];
      var connectedFactorIds = [];

      if (isCause) {
        var links = linksForCause(id);
        connectedFactorIds = links.risk.concat(links.protective);
        connectedCauseIds = [id];
      } else {
        connectedFactorIds = [id];
        connectedCauseIds = linksForFactor(node);
      }

      allNodes.forEach(function (n) {
        var keep = connectedCauseIds.indexOf(n.dataset.id) !== -1 || connectedFactorIds.indexOf(n.dataset.id) !== -1;
        n.classList.toggle("is-active", keep);
        n.classList.toggle("is-dim", !keep);
      });

      Array.prototype.forEach.call(svg.querySelectorAll("path"), function (p) {
        var keep = connectedCauseIds.indexOf(p.dataset.cause) !== -1 && connectedFactorIds.indexOf(p.dataset.factor) !== -1;
        p.classList.toggle("is-active", keep);
        p.classList.toggle("is-dim", !keep);
      });

      if (isCause) {
        var l = linksForCause(id);
        var html = "<strong>" + causeLabel(id) + "</strong><br>";
        if (l.risk.length) html += "Risk: " + l.risk.map(factorLabel).join(", ") + "<br>";
        if (l.protective.length) html += "Protective: " + l.protective.map(factorLabel).join(", ");
        info.innerHTML = html;
      } else {
        var causes = linksForFactor(node).map(causeLabel).join(", ");
        var typeLabel = node.dataset.type === "risk" ? "Risk factor" : "Protective factor";
        info.innerHTML = "<strong>" + node.textContent + "</strong><br>" + typeLabel + " — links to: " + causes;
      }
    }

    allNodes.forEach(function (node) {
      node.addEventListener("mouseenter", function () {
        if (!pinned) highlight(node);
      });
      node.addEventListener("mouseleave", function () {
        if (!pinned) highlight(null);
      });
      node.addEventListener("focus", function () {
        if (!pinned) highlight(node);
      });
      node.addEventListener("click", function () {
        if (pinned === node.dataset.id) {
          pinned = null;
          highlight(null);
        } else {
          pinned = node.dataset.id;
          highlight(node);
        }
      });
    });

    drawLines();
    showDefaultInfo();

    var resizeTimer;
    window.addEventListener("resize", function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(drawLines, 100);
    });

    if (window.ResizeObserver) {
      new ResizeObserver(function () {
        drawLines();
      }).observe(root);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
