/*!
 * cxfigure-to-vega-lite — export a CanvasXpress figure { data, config } to a Vega-Lite v5 spec,
 * with an explicit lossy-conversion report.
 *
 * Part of cxspec (https://github.com/neuhausi/cxspec), CC BY 4.0.
 *
 * Scope (mirrors vega-lite-to-cxfigure): the single-view core — Scatter2D, Bar, Line, Area,
 * Dotplot, Boxplot, Heatmap, Pie — with the data in either the canonical matrix form
 * ({ y:{vars,smps,data}, x, z }) or the tabular data-frame form ([[header…],[row…]]).
 * Everything the exporter cannot express is ENUMERATED in `report.dropped` (JSON pointer +
 * reason); nothing is dropped silently. `report.lossless` is true only when nothing was dropped.
 *
 * Usage (Node):    const { cxfigureToVegaLite } = require('./cxfigure-to-vega-lite');
 *                  const { spec, report } = cxfigureToVegaLite(figure);
 * Usage (browser): window.cxfigureToVegaLite(figure)
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) { module.exports = factory(); }
  else { root.cxfigureToVegaLite = factory().cxfigureToVegaLite; }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var VL_SCHEMA = 'https://vega.github.io/schema/vega-lite/v5.json';

  // CanvasXpress graphType -> Vega-Lite mark (the inverse of the inbound MARK_TO_GRAPHTYPE).
  var GRAPHTYPE_TO_MARK = {
    Scatter2D: 'point', Bar: 'bar', Line: 'line', Area: 'area', Dotplot: 'tick',
    Heatmap: 'rect', Boxplot: 'boxplot', Pie: 'arc'
  };
  var ONE_D = { Bar: 1, Line: 1, Area: 1, Dotplot: 1, Boxplot: 1 };

  // Config keys the exporter consumes for a given graph family (everything else is reported).
  var CONSUMED = {
    common: ['graphType', 'title', 'subtitle', 'showLegend', 'colors', 'width', 'height', 'schemaVersion'],
    Scatter2D: ['xAxis', 'yAxis', 'colorBy', 'sizeBy', 'shapeBy', 'xAxisTitle', 'yAxisTitle', 'xAxisTransform', 'yAxisTransform'],
    oneD: ['xAxis', 'graphOrientation', 'smpTitle', 'xAxisTitle', 'colorBy', 'groupingFactors', 'xAxisTransform'],
    Heatmap: ['xAxis', 'smpTitle', 'varTitle', 'colorSpectrum'],
    Pie: ['xAxis']
  };

  function isNumericArray(values) {
    var seen = false;
    for (var i = 0; i < values.length; i++) {
      var v = values[i];
      if (v === null || v === undefined || v === '') { continue; }
      if (typeof v === 'number') { seen = true; continue; }
      if (typeof v === 'string' && v.trim() !== '' && isFinite(Number(v))) { seen = true; continue; }
      return false;
    }
    return seen;
  }

  function fieldType(values) { return isNumericArray(values) ? 'quantitative' : 'nominal'; }

  function copy(obj) { return JSON.parse(JSON.stringify(obj)); }

  /** Normalise the two accepted data forms into { form, vars, smps, matrix, x, z, records? }. */
  function readData(data, report) {
    if (Array.isArray(data)) {
      // Data-frame form: header row + rows -> records.
      var header = data[0] || [];
      var records = [];
      for (var r = 1; r < data.length; r++) {
        var rec = {};
        for (var c = 0; c < header.length; c++) { rec[header[c]] = data[r][c] === undefined ? null : data[r][c]; }
        records.push(rec);
      }
      return { form: 'frame', header: header, records: records };
    }
    data = data || {};
    var y = data.y || {};
    var out = { form: 'matrix', vars: y.vars || [], smps: y.smps || [], matrix: y.data || [], x: data.x || {}, z: data.z || {} };
    for (var k in y) {
      if (y.hasOwnProperty(k) && k !== 'vars' && k !== 'smps' && k !== 'data') {
        report.dropped.push({ path: '/data/y/' + k, reason: 'extra y layer (' + k + ') has no Vega-Lite counterpart' });
      }
    }
    for (var d in data) {
      if (data.hasOwnProperty(d) && d !== 'y' && d !== 'x' && d !== 'z') {
        report.dropped.push({ path: '/data/' + d, reason: 'data component "' + d + '" is not part of the y/x/z matrix model' });
      }
    }
    return out;
  }

  /** Scatter: one record per variable (row): the sample columns + the z annotations + name. */
  function scatterRecords(d) {
    var records = [];
    for (var i = 0; i < d.vars.length; i++) {
      var rec = { name: d.vars[i] };
      for (var j = 0; j < d.smps.length; j++) { rec[d.smps[j]] = d.matrix[i] ? d.matrix[i][j] : null; }
      for (var z in d.z) { if (d.z.hasOwnProperty(z)) { rec[z] = d.z[z][i]; } }
      records.push(rec);
    }
    return records;
  }

  /** 1-D / heatmap / pie: long form, one record per (variable, sample) cell. */
  function longRecords(d, varFilter) {
    var records = [];
    for (var i = 0; i < d.vars.length; i++) {
      if (varFilter && varFilter.indexOf(d.vars[i]) < 0) { continue; }
      for (var j = 0; j < d.smps.length; j++) {
        var rec = { sample: d.smps[j], variable: d.vars[i], value: d.matrix[i] ? d.matrix[i][j] : null };
        for (var x in d.x) { if (d.x.hasOwnProperty(x)) { rec[x] = d.x[x][j]; } }
        for (var z in d.z) { if (d.z.hasOwnProperty(z)) { rec[z] = d.z[z][i]; } }
        records.push(rec);
      }
    }
    return records;
  }

  function column(records, field) { return records.map(function (r) { return r[field]; }); }

  function axisDef(field, type, title, transform) {
    var def = { field: field, type: type };
    if (title) { def.title = title; }
    if (transform === 'log10' || transform === 'log2') { def.scale = { type: 'log' }; }
    if (type === 'nominal') { def.sort = null; }   // keep CanvasXpress's data order
    return def;
  }

  /**
   * Export a CanvasXpress figure to Vega-Lite.
   * @param {Object} figure  { data, config, [events], [afterRender], [info], [schemaVersion] }
   * @returns {{ spec: Object, report: { graphType, mark, mapped: string[], dropped: {path, reason}[], lossless: boolean } }}
   */
  function cxfigureToVegaLite(figure) {
    figure = figure || {};
    var config = figure.config || {};
    var report = { graphType: config.graphType || null, mark: null, mapped: [], dropped: [], lossless: false };
    var spec = { $schema: VL_SCHEMA };

    ['events', 'afterRender', 'info'].forEach(function (k) {
      if (figure[k]) { report.dropped.push({ path: '/' + k, reason: 'CanvasXpress ' + k + ' have no Vega-Lite counterpart' }); }
    });

    var graphType = config.graphType;
    var mark = GRAPHTYPE_TO_MARK[graphType];
    if (!mark) {
      report.dropped.push({ path: '/config/graphType', reason: 'graphType "' + graphType + '" has no Vega-Lite mark; exported as point' });
      mark = 'point';
    }
    report.mark = mark;
    spec.mark = mark === 'point' ? { type: 'point', filled: true } : mark;

    var d = readData(figure.data, report);
    var enc = {};
    var consumed = CONSUMED.common.slice();
    var records, xf, yf;

    if (graphType === 'Scatter2D' || !GRAPHTYPE_TO_MARK[graphType]) {
      consumed = consumed.concat(CONSUMED.Scatter2D);
      records = d.form === 'frame' ? d.records : scatterRecords(d);
      xf = (config.xAxis || [])[0]; yf = (config.yAxis || [])[0];
      if (d.form === 'matrix') { xf = xf || d.smps[0]; yf = yf || d.smps[1]; }
      if (xf) { enc.x = axisDef(xf, fieldType(column(records, xf)), config.xAxisTitle, config.xAxisTransform); report.mapped.push('xAxis'); }
      if (yf) { enc.y = axisDef(yf, fieldType(column(records, yf)), config.yAxisTitle, config.yAxisTransform); report.mapped.push('yAxis'); }
      var chan = { colorBy: 'color', sizeBy: 'size', shapeBy: 'shape' };
      for (var by in chan) {
        if (config[by] && typeof config[by] === 'string') {
          enc[chan[by]] = { field: config[by], type: fieldType(column(records, config[by])) };
          report.mapped.push(by);
        } else if (config[by] && typeof config[by] !== 'string') {
          report.dropped.push({ path: '/config/' + by, reason: 'non-string ' + by + ' (array/object form) not exported' });
        }
      }
      if (config.xAxis && config.xAxis.length > 1) { report.dropped.push({ path: '/config/xAxis', reason: 'only the first xAxis variable is exported' }); }
      if (config.yAxis && config.yAxis.length > 1) { report.dropped.push({ path: '/config/yAxis', reason: 'only the first yAxis variable is exported' }); }
    } else if (ONE_D[graphType]) {
      consumed = consumed.concat(CONSUMED.oneD);
      var varFilter = d.form === 'matrix' && Array.isArray(config.xAxis) && config.xAxis.length ? config.xAxis : null;
      records = d.form === 'frame' ? d.records : longRecords(d, varFilter);
      // Matrix form: CanvasXpress 1-D charts are horizontal unless graphOrientation says
      // otherwise. Data-frame form (e.g. a figure that came in from Vega-Lite): the axes
      // are named by config.xAxis / config.yAxis and x is the horizontal axis.
      var vertical = d.form === 'frame' ? true : config.graphOrientation === 'vertical';
      var catField = 'sample', valField = 'value';
      if (d.form === 'frame') {
        catField = (config.xAxis || [])[0] || d.header[0];
        valField = (config.yAxis || [])[0] || d.header[1];
        consumed.push('yAxis');
      }
      if (graphType === 'Boxplot' && config.groupingFactors && config.groupingFactors.length) {
        catField = config.groupingFactors[0];
        if (config.groupingFactors.length > 1) { report.dropped.push({ path: '/config/groupingFactors', reason: 'only the first grouping factor is exported' }); }
        report.mapped.push('groupingFactors');
      }
      var cat = axisDef(catField, 'nominal', config.smpTitle);
      var val = axisDef(valField, 'quantitative', config.xAxisTitle, config.xAxisTransform);
      if (vertical) { enc.x = cat; enc.y = val; } else { enc.y = cat; enc.x = val; }
      report.mapped.push('xAxis', 'graphOrientation');
      var nVars = d.form === 'matrix' ? (varFilter ? varFilter.length : d.vars.length) : 0;
      if (config.colorBy && typeof config.colorBy === 'string') {
        enc.color = { field: config.colorBy, type: fieldType(column(records, config.colorBy)) };
        report.mapped.push('colorBy');
      } else if (nVars > 1 && graphType !== 'Boxplot') {
        enc.color = { field: 'variable', type: 'nominal', sort: null };
        if (graphType === 'Bar') { enc.xOffset = { field: 'variable', sort: null }; }
      }
    } else if (graphType === 'Heatmap') {
      consumed = consumed.concat(CONSUMED.Heatmap);
      records = d.form === 'frame' ? d.records : longRecords(d, null);
      var hx = 'sample', hy = 'variable', hv = 'value';
      if (d.form === 'frame') {
        hx = (config.xAxis || [])[0] || d.header[0];
        hy = (config.yAxis || [])[0] || d.header[1];
        hv = (typeof config.colorBy === 'string' && config.colorBy) || d.header[2];
        consumed.push('yAxis', 'colorBy');
      }
      enc.x = axisDef(hx, 'nominal', config.smpTitle);
      enc.y = axisDef(hy, 'nominal', config.varTitle);
      enc.color = { field: hv, type: 'quantitative' };
      if (Array.isArray(config.colorSpectrum) && config.colorSpectrum.length) { enc.color.scale = { range: config.colorSpectrum.slice() }; report.mapped.push('colorSpectrum'); }
      report.mapped.push('xAxis');
    } else if (graphType === 'Pie') {
      consumed = consumed.concat(CONSUMED.Pie);
      var pieVar = d.form === 'matrix' ? (d.vars[0]) : null;
      records = d.form === 'frame' ? d.records : longRecords(d, pieVar ? [pieVar] : null);
      if (d.form === 'matrix' && d.vars.length > 1) { report.dropped.push({ path: '/data/y/vars', reason: 'a Vega-Lite arc chart shows one series; only the first variable is exported' }); }
      var pv = 'value', pc = 'sample';
      if (d.form === 'frame') {
        pv = (config.yAxis || [])[0] || d.header[1];
        pc = (typeof config.colorBy === 'string' && config.colorBy) || d.header[0];
        consumed.push('yAxis', 'colorBy');
      }
      enc.theta = { field: pv, type: 'quantitative' };
      enc.color = { field: pc, type: 'nominal', sort: null };
      report.mapped.push('xAxis');
    }

    // ---- common config -------------------------------------------------
    if (config.title) { spec.title = typeof config.title === 'string' ? config.title.replace(/\\n/g, ' ') : String(config.title); report.mapped.push('title'); }
    if (config.subtitle && typeof config.subtitle === 'string') { spec.title = { text: spec.title || '', subtitle: config.subtitle }; report.mapped.push('subtitle'); }
    if (config.showLegend === false && enc.color) { enc.color.legend = null; report.mapped.push('showLegend'); }
    if (Array.isArray(config.colors) && config.colors.length && enc.color && enc.color.type === 'nominal') {
      enc.color.scale = { range: config.colors.slice() }; report.mapped.push('colors');
    }
    if (config.width) { spec.width = config.width; }
    if (config.height) { spec.height = config.height; }

    spec.data = { values: records || [] };
    spec.encoding = enc;

    // ---- the lossy report: every config key not consumed ----------------
    for (var key in config) {
      if (config.hasOwnProperty(key) && consumed.indexOf(key) < 0) {
        report.dropped.push({ path: '/config/' + key, reason: 'no Vega-Lite counterpart for ' + key + ' on a ' + (graphType || 'Scatter2D') });
      }
    }
    report.mapped = report.mapped.filter(function (k, i, a) { return a.indexOf(k) === i; });
    report.lossless = report.dropped.length === 0;
    return { spec: spec, report: report };
  }

  return { cxfigureToVegaLite: cxfigureToVegaLite };
}));
