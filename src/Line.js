import line from 'd3-shape/src/line';
import { monotoneX } from 'd3-shape/src/curve/monotone';
import select from 'd3-selection/src/select';
import mouse from 'd3-selection/src/mouse';
import { point as scalePoint } from 'd3-scale/src/band';
import scaleLinear from 'd3-scale/src/linear';

import addAxis from './utils/addAxis';
import addLabels from './utils/addLabels';
import Tooltip from './components/Tooltip';
import addLegend from './utils/addLegend';
import addFont from './utils/addFont';
import addFilter from './utils/addFilter';
import colors from './utils/colors';
import config from './config';

class Line {
  constructor(svg, {
    title, xLabel, yLabel, data: { labels, datasets }, options,
  }) {
    this.options = {
      unxkcdify: false,
      yTickCount: 3,
      legendPosition: config.positionType.upLeft,
      dataColors: colors,
      fontFamily: 'xkcd',
      strokeColor: 'black',
      backgroundColor: 'white',
      showLegend: true,
      ...options,
    };

    // Per-instance margin — avoids shared mutable state across instances.
    // Defaults are tight; title/labels expand as needed.
    const m = this.options.margin || {};
    this.margin = {
      top: m.top != null ? m.top : 10,
      right: m.right != null ? m.right : 10,
      bottom: m.bottom != null ? m.bottom : 30,
      left: m.left != null ? m.left : 40,
    };

    if (title) { this.title = title; this.margin.top = Math.max(this.margin.top, 60); }
    if (xLabel) { this.xLabel = xLabel; this.margin.bottom = Math.max(this.margin.bottom, 50); }
    if (yLabel) { this.yLabel = yLabel; this.margin.left = Math.max(this.margin.left, 70); }

    this.data = { labels, datasets };
    this.filter = 'url(#xkcdify)';
    this.fontFamily = this.options.fontFamily || 'xkcd';
    if (this.options.unxkcdify) {
      this.filter = null;
      this.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
    }

    const svgWidth = svg.parentElement.clientWidth;
    const svgHeight = this.options.height
      || Math.min((svgWidth * 2) / 3, window.innerHeight);

    this.svgEl = select(svg)
      .style('stroke-width', '3')
      .style('font-family', this.fontFamily)
      .style('background', this.options.backgroundColor)
      .attr('width', svgWidth)
      .attr('height', svgHeight);
    this.svgEl.selectAll('*').remove();

    this.chart = this.svgEl.append('g')
      .attr('transform', `translate(${this.margin.left},${this.margin.top})`);
    this.width = svgWidth - this.margin.left - this.margin.right;
    this.height = svgHeight - this.margin.top - this.margin.bottom;

    addFont(this.svgEl);
    addFilter(this.svgEl);
    this.render();
  }

  render() {
    if (this.title) addLabels.title(this.svgEl, this.title, this.options.strokeColor);
    if (this.xLabel) addLabels.xLabel(this.svgEl, this.xLabel, this.options.strokeColor);
    if (this.yLabel) addLabels.yLabel(this.svgEl, this.yLabel, this.options.strokeColor);

    const tooltip = new Tooltip({
      parent: this.svgEl,
      title: '',
      items: [{ color: 'red', text: 'weweyang' }, { color: 'blue', text: 'timqian' }],
      position: { x: 60, y: 60, type: config.positionType.downRight },
      unxkcdify: this.options.unxkcdify,
      // Separate tooltip colors so the chart can be transparent while the
      // tooltip still has a readable background.
      backgroundColor: this.options.tooltipBackgroundColor != null ? this.options.tooltipBackgroundColor : this.options.backgroundColor,
      strokeColor: this.options.tooltipStrokeColor != null ? this.options.tooltipStrokeColor : this.options.strokeColor,
    });

    const xScale = scalePoint()
      .domain(this.data.labels)
      .range([0, this.width]);

    const allData = this.data.datasets.reduce((pre, cur) => pre.concat(cur.data), []);

    const yScale = scaleLinear()
      .domain([
        this.options.yMin !== undefined ? this.options.yMin : Math.min(...allData),
        this.options.yMax !== undefined ? this.options.yMax : Math.max(...allData),
      ])
      .range([this.height, 0]);

    const graphPart = this.chart.append('g').attr('pointer-events', 'all');

    addAxis.xAxis(graphPart, {
      xScale,
      tickCount: this.options.xTickCount !== undefined ? this.options.xTickCount : 3,
      moveDown: this.height,
      fontFamily: this.fontFamily,
      unxkcdify: this.options.unxkcdify,
      stroke: this.options.strokeColor,
      fontSize: this.options.axisFontSize,
    });

    addAxis.yAxis(graphPart, {
      yScale,
      tickCount: this.options.yTickCount || 3,
      fontFamily: this.fontFamily,
      unxkcdify: this.options.unxkcdify,
      stroke: this.options.strokeColor,
      fontSize: this.options.axisFontSize,
      showLine: this.options.showYAxisLine,
    });

    this.svgEl.selectAll('.domain').attr('filter', this.filter);

    // Optional dotted horizontal grid lines (e.g. [0, 25, 50, 75, 100])
    if (this.options.gridLines && this.options.gridLines.length) {
      const gc = this.options.gridLineColor || 'rgba(128,128,128,0.35)';
      const gd = this.options.gridLineDash || '4,4';
      const gw = this.options.gridLineWidth || 1;
      this.options.gridLines.forEach((val) => {
        const gy = yScale(val);
        if (gy >= 0 && gy <= this.height) {
          graphPart.append('line')
            .attr('x1', 0).attr('y1', gy)
            .attr('x2', this.width).attr('y2', gy)
            .attr('stroke', gc)
            .attr('stroke-width', gw)
            .attr('stroke-dasharray', gd)
            .attr('pointer-events', 'none');
        }
      });
    }

    const theLine = line()
      .x((d, i) => xScale(this.data.labels[i]))
      .y((d) => yScale(d))
      .curve(monotoneX);

    graphPart.selectAll('.xkcd-chart-line')
      .data(this.data.datasets)
      .enter()
      .append('path')
      .attr('class', 'xkcd-chart-line')
      .attr('d', (d) => theLine(d.data))
      .attr('fill', 'none')
      .attr('stroke', (d, i) => this.options.dataColors[i])
      .attr('filter', this.filter);

    // Hover effect
    const verticalLine = graphPart.append('line')
      .attr('x1', 30).attr('y1', 0)
      .attr('x2', 30).attr('y2', this.height)
      .attr('stroke', '#aaa')
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '7,7')
      .style('visibility', 'hidden');

    const circles = this.data.datasets.map((dataset, i) => graphPart
      .append('circle')
      .style('stroke', this.options.dataColors[i])
      .style('fill', this.options.dataColors[i])
      .attr('r', 3.5)
      .style('visibility', 'hidden'));

    graphPart.append('rect')
      .attr('width', this.width)
      .attr('height', this.height)
      .attr('fill', 'none')
      .on('mouseover', () => {
        circles.forEach((circle) => circle.style('visibility', 'visible'));
        verticalLine.style('visibility', 'visible');
        tooltip.show();
      })
      .on('mouseout', () => {
        circles.forEach((circle) => circle.style('visibility', 'hidden'));
        verticalLine.style('visibility', 'hidden');
        tooltip.hide();
      })
      .on('mousemove', (d, i, nodes) => {
        const tipX = mouse(nodes[i])[0] + this.margin.left + 10;
        const tipY = mouse(nodes[i])[1] + this.margin.top + 10;

        const labelXs = this.data.labels.map((label) => xScale(label) + this.margin.left);
        const mouseLabelDistances = labelXs.map(
          (labelX) => Math.abs(labelX - mouse(nodes[i])[0] - this.margin.left),
        );
        const nearestIndex = mouseLabelDistances.indexOf(Math.min(...mouseLabelDistances));

        verticalLine
          .attr('x1', xScale(this.data.labels[nearestIndex]))
          .attr('x2', xScale(this.data.labels[nearestIndex]));

        this.data.datasets.forEach((dataset, j) => {
          circles[j]
            .style('visibility', 'visible')
            .attr('cx', xScale(this.data.labels[nearestIndex]))
            .attr('cy', yScale(dataset.data[nearestIndex]));
        });

        const tooltipItems = this.data.datasets.map((dataset, j) => ({
          color: this.options.dataColors[j],
          text: `${this.data.datasets[j].label || ''}: ${this.data.datasets[j].data[nearestIndex]}`,
        }));

        let tooltipPositionType = config.positionType.downRight;
        if (tipX > this.width / 2 && tipY < this.height / 2) {
          tooltipPositionType = config.positionType.downLeft;
        } else if (tipX > this.width / 2 && tipY > this.height / 2) {
          tooltipPositionType = config.positionType.upLeft;
        } else if (tipX < this.width / 2 && tipY > this.height / 2) {
          tooltipPositionType = config.positionType.upRight;
        }

        tooltip.update({
          title: this.data.labels[nearestIndex],
          items: tooltipItems,
          position: { x: tipX, y: tipY, type: tooltipPositionType },
        });
      });

    if (this.options.showLegend) {
      const legendItems = this.data.datasets.map((dataset, i) => ({
        color: this.options.dataColors[i],
        text: dataset.label,
      }));

      addLegend(graphPart, {
        items: legendItems,
        position: this.options.legendPosition,
        unxkcdify: this.options.unxkcdify,
        parentWidth: this.width,
        parentHeight: this.height,
        backgroundColor: this.options.backgroundColor,
        strokeColor: this.options.strokeColor,
      });
    }
  }

  update() {}
}

export default Line;
