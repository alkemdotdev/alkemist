// Static rendering and the control share the same figure; JavaScript is optional.
export function boardSignal(alpha: number) {
  const values = Array.from({ length: 401 }, (_, i) => {
    const time = i / 40;
    return {
      x: 45 + time * 50,
      envelope: 105 * Math.exp(-alpha * time),
      phase: time * Math.PI * 1.2,
    };
  });
  const path = (value: (point: (typeof values)[number]) => number) =>
    values
      .map(
        (point, i) =>
          `${i ? 'L' : 'M'}${point.x.toFixed(2)},${value(point).toFixed(2)}`,
      )
      .join(' ');
  return {
    curve: path((p) => 179 - p.envelope * Math.cos(p.phase)),
    upper: path((p) => 179 - p.envelope),
    lower: path((p) => 179 + p.envelope),
  };
}
