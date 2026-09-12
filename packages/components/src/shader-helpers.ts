export const vertexShader = `#version 300 es
precision highp float;
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

/** Fixed GLSL source for displaying the exact specimen implementation. */
export const interferenceFragment = `#version 300 es
precision highp float;
uniform vec2 u_resolution;
uniform float u_phase;
uniform float u_frequency;
uniform float u_angle;
uniform vec3 u_paper;
uniform vec3 u_inks[8];
out vec4 outColor;

void main() {
  vec2 p = (gl_FragCoord.xy - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y) * 4.0;
  float c = cos(u_angle), s = sin(u_angle);
  p = mat2(c, -s, s, c) * p;
  float r1 = length(p - vec2(-0.66, 0.0));
  float r2 = length(p - vec2( 0.66, 0.0));
  float wave = sin(u_frequency * r1 - u_phase) + sin(u_frequency * r2 - u_phase);
  float bands = (wave + 2.0) * 2.0;
  int ink = int(clamp(floor(bands), 0.0, 7.0));
  float edge = abs(fract(bands) - 0.5);
  float line = 1.0 - smoothstep(0.06, 0.06 + max(fwidth(bands), 0.005), edge);
  vec3 color = mix(u_paper, u_inks[ink], line);
  float source = 1.0 - smoothstep(0.035, 0.045, min(r1, r2));
  color = mix(color, u_inks[7], source);
  outColor = vec4(color, 1.0);
}`;
