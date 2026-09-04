/*!
 * vega-lite-to-cxfigure — convert a (subset of) Vega-Lite spec to a CanvasXpress figure.
 *
 * Part of cxspec (https://github.com/neuhausi/cxspec), CC BY 4.0.
 *
 * Scope: single-view specs with an inline `data.values` array and a flat `encoding` object.
 * Layered/faceted/concat specs, transforms, selections, and expression fields are not converted
 * (they are reported in `_unsupported` rather than silently dropped). This is an interchange
 * starting point, not a complete Vega-Lite implementation.
 *
 * Usage (Node):   const { vegaLiteToCxfigure } = require('./vega-lite-to-cxfigure');
 * Usage (browser): window.vegaLiteToCxfigure(spec)
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) { module.exports = factory(); }
  else { root.vegaLiteToCxfigure = factory().vegaLiteToCxfigure; }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Vega-Lite mark -> CanvasXpress graphType.
  var MARK_TO_GRAPHTYPE = {
    point: 'Scatter2D', circle: 'Scatter2D', square: 'Scatter2D',
    bar: 'Bar',
    line: 'Line',
    area: 'Area',
    tick: 'Dotplot',
    rect: 'Heatmap',
    boxplot: 'Boxplot',
    arc: 'Pie'
  };

  // Vega-Lite encoding channel -> CanvasXpress config "*By" mapping (for aesthetic channels).
  var CHANNEL_TO_BY = { color: 'colorBy', size: 'sizeBy', shape: 'shapeBy' };

  function markName(mark) {
    if (!mark) { return null; }
    return typeof mark === 'string' ? mark : mark.type;
  }

  function fieldOf(channelDef) {
    if (!channelDef || typeof channelDef !== 'object') { return null; }
    return channelDef.field || null;
  }

  /**
   * Convert a Vega-Lite spec to a CanvasXpress figure { schemaVersion, data, config }.
   * Unsupported constructs are listed in the returned figure's `_unsupported` array.
   */
  function vegaLiteToCxfigure(vl) {
    vl = vl || {};
    var unsupported = [];

    // ---- data: inline values -> CanvasXpress data-frame (array) form ----
    var values = vl.data && vl.data.values;
    if (!values && vl.data && vl.data.url) { unsupported.push('data.url (remote data not fetched)'); }
    var data;
    if (Array.isArray(values) && values.length) {
      // Column union across records, preserving first-seen order.
      var cols = [];
      var seen = {};
      for (var i = 0; i < values.length; i++) {
        for (var k in values[i]) {
          if (values[i].hasOwnProperty(k) && !seen[k]) { seen[k] = true; cols.push(k); }
        }
      }
      var rows = [cols.slice()];
      for (var r = 0; r < values.length; r++) {
        var row = [];
        for (var c = 0; c < cols.length; c++) {
          var v = values[r][cols[c]];
          row.push(v === undefined ? null : v);
        }
        rows.push(row);
      }
      data = rows; // cxfigure accepts the tabular array (data-frame) form.
    } else {
      data = { y: { vars: [], smps: [], data: [] } };
      if (!values) { unsupported.push('data (no inline data.values found)'); }
    }

    // ---- mark -> graphType ----
    var mark = markName(vl.mark);
    var graphType = MARK_TO_GRAPHTYPE[mark];
    if (!graphType) { graphType = 'Scatter2D'; unsupported.push('mark "' + mark + '" (defaulted to Scatter2D)'); }

    // ---- encoding -> config ----
    var enc = vl.encoding || {};
    var config = { graphType: graphType };

    var xf = fieldOf(enc.x), yf = fieldOf(enc.y);
    if (xf) { config.xAxis = [xf]; }
    if (yf) { config.yAxis = [yf]; }

    for (var ch in CHANNEL_TO_BY) {
      if (enc[ch] && fieldOf(enc[ch])) { config[CHANNEL_TO_BY[ch]] = fieldOf(enc[ch]); }
    }

    // Aggregates / bins / time units are grammar we don't translate here.
    ['x', 'y', 'color', 'size', 'shape'].forEach(function (ch) {
      var d = enc[ch];
      if (d && (d.aggregate || d.bin || d.timeUnit)) {
        unsupported.push('encoding.' + ch + ' ' + (d.aggregate ? 'aggregate' : d.bin ? 'bin' : 'timeUnit'));
      }
    });
    if (vl.transform) { unsupported.push('transform'); }
    if (vl.layer || vl.facet || vl.concat || vl.hconcat || vl.vconcat || vl.repeat) {
      unsupported.push('multi-view (layer/facet/concat/repeat)');
    }

    // ---- title ----
    if (vl.title) { config.title = typeof vl.title === 'string' ? vl.title : (vl.title.text || undefined); }

    var figure = { schemaVersion: '1.0', data: data, config: config };
    if (unsupported.length) { figure._unsupported = unsupported; }
    return figure;
  }

  return { vegaLiteToCxfigure: vegaLiteToCxfigure };
}));
