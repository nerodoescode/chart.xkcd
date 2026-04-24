import { axisBottom, axisLeft } from 'd3-axis/src/axis';

const yAxis = (parent, {
  yScale, tickCount, fontFamily, unxkcdify, stroke, fontSize, showLine,
}) => {
  const g = parent
    .append('g')
    .call(
      axisLeft(yScale)
        .tickSize(showLine === false ? 0 : 1)
        .tickPadding(10)
        .ticks(tickCount, 's'),
    );

  g.select('.domain')
    .attr('filter', !unxkcdify ? 'url(#xkcdify)' : null)
    .style('stroke', showLine === false ? 'none' : stroke);

  g.selectAll('.tick > text')
    .style('font-family', fontFamily)
    .style('font-size', fontSize != null ? String(fontSize) : '16')
    .style('fill', stroke);
};

const xAxis = (parent, {
  xScale, tickCount, moveDown, fontFamily, unxkcdify, stroke, fontSize,
}) => {
  // For band/point scales, use tickValues to show only every Nth label
  // while keeping the full domain so line positions are correct.
  const domain = xScale.domain ? xScale.domain() : null;
  const axis = axisBottom(xScale).tickSize(0).tickPadding(6);

  if (domain && domain.length > 0) {
    const step = Math.max(1, Math.ceil(domain.length / Math.max(1, tickCount)));
    axis.tickValues(domain.filter((d, i) => i % step === 0));
  } else {
    axis.ticks(tickCount);
  }

  const g = parent
    .append('g')
    .attr('transform', `translate(0,${moveDown})`)
    .call(axis);

  g.select('.domain')
    .attr('filter', !unxkcdify ? 'url(#xkcdify)' : null)
    .style('stroke', stroke);

  g.selectAll('.tick > text')
    .style('font-family', fontFamily)
    .style('font-size', fontSize != null ? String(fontSize) : '16')
    .style('fill', stroke);
};

export default {
  xAxis, yAxis,
};
